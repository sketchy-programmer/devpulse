#!/usr/bin/env python3
"""
DevPulse CLI Agent
==================
Collects system metrics every 5 minutes and POSTs them to the DevPulse API.

Install:
    pip install requests psutil python-dotenv

Configure:
    Copy .env.example to .env and fill in your values.

Run once:
    python3 agent.py

Schedule with cron (every 5 minutes):
    */5 * * * * /usr/bin/python3 /opt/devpulse/agent.py >> /var/log/devpulse-agent.log 2>&1
"""

import os
import sys
import json
import socket
import logging
import datetime

import psutil
import requests
from dotenv import load_dotenv

# ── Setup ─────────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
log = logging.getLogger('devpulse-agent')

API_URL   = os.getenv('DEVPULSE_API_URL', 'http://localhost:5000/api/metrics')
AGENT_KEY = os.getenv('DEVPULSE_AGENT_KEY', '')
TEAM_SLUG = os.getenv('DEVPULSE_TEAM_SLUG', '')
TIMEOUT   = int(os.getenv('DEVPULSE_TIMEOUT', '10'))  # seconds


# ── Metric collection ─────────────────────────────────────────────────────────

def collect_cpu():
    """Collect CPU usage and load averages."""
    percent = psutil.cpu_percent(interval=1)
    load = psutil.getloadavg()  # (1min, 5min, 15min)
    return {
        'percent': round(percent, 1),
        'loadAvg1m': round(load[0], 2),
        'loadAvg5m': round(load[1], 2),
    }


def collect_memory():
    """Collect memory usage stats."""
    mem = psutil.virtual_memory()
    return {
        'totalMB': round(mem.total / 1024 / 1024, 1),
        'usedMB':  round(mem.used  / 1024 / 1024, 1),
        'percentUsed': round(mem.percent, 1),
    }


def collect_disk(path='/'):
    """Collect disk usage for the root partition."""
    disk = psutil.disk_usage(path)
    return {
        'totalGB': round(disk.total / 1024 / 1024 / 1024, 2),
        'usedGB':  round(disk.used  / 1024 / 1024 / 1024, 2),
        'percentUsed': round(disk.percent, 1),
    }


def collect_processes():
    """Count total running processes."""
    return {'total': len(psutil.pids())}


def build_payload():
    """Assemble all metrics into the API payload format."""
    return {
        'host': socket.gethostname(),
        'cpu': collect_cpu(),
        'memory': collect_memory(),
        'disk': collect_disk(),
        'processes': collect_processes(),
        'collectedAt': datetime.datetime.utcnow().isoformat() + 'Z',
    }


# ── Shipping ──────────────────────────────────────────────────────────────────

def ship_metrics(payload: dict) -> bool:
    """POST metrics to the DevPulse API. Returns True on success."""
    headers = {
        'Content-Type': 'application/json',
        'X-Agent-Key':  AGENT_KEY,
        'X-Team-Slug':  TEAM_SLUG,
    }
    try:
        response = requests.post(
            API_URL,
            data=json.dumps(payload),
            headers=headers,
            timeout=TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()
        log.info(
            'Metrics shipped — host=%s alertLevel=%s id=%s',
            payload['host'],
            result.get('alertLevel', '?'),
            result.get('id', '?'),
        )
        return True

    except requests.exceptions.ConnectionError:
        log.error('Cannot reach DevPulse API at %s — is the server running?', API_URL)
    except requests.exceptions.Timeout:
        log.error('Request timed out after %ds', TIMEOUT)
    except requests.exceptions.HTTPError as e:
        log.error('API returned error: %s — %s', e.response.status_code, e.response.text)
    except Exception as e:  # pylint: disable=broad-except
        log.error('Unexpected error: %s', e)

    return False


# ── Validation ────────────────────────────────────────────────────────────────

def validate_config():
    """Exit early if required env vars are missing."""
    missing = []
    if not AGENT_KEY:
        missing.append('DEVPULSE_AGENT_KEY')
    if not TEAM_SLUG:
        missing.append('DEVPULSE_TEAM_SLUG')
    if missing:
        log.error('Missing required environment variables: %s', ', '.join(missing))
        log.error('Copy agent/.env.example to agent/.env and fill in values.')
        sys.exit(1)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    validate_config()

    log.info('DevPulse agent starting — team=%s host=%s', TEAM_SLUG, socket.gethostname())

    payload = build_payload()

    log.info(
        'Collected: CPU=%.1f%% MEM=%.1f%% DISK=%.1f%% PROCS=%d',
        payload['cpu']['percent'],
        payload['memory']['percentUsed'],
        payload['disk']['percentUsed'],
        payload['processes']['total'],
    )

    success = ship_metrics(payload)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
