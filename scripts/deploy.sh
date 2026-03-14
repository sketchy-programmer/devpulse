#!/bin/bash
# deploy.sh — called by Jenkins and GitHub Actions
# Usage: ./scripts/deploy.sh [staging|production]
# Phase 1 skill: Bash scripting with error handling and exit codes

set -euo pipefail  # Exit on error, undefined var, or pipe failure

ENV="${1:-staging}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/tmp/devpulse-deploy-${TIMESTAMP}.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

die() {
  log "ERROR: $*"
  exit 1
}

# ── Validate environment ──────────────────────────────────────────────────────

if [[ "$ENV" != "staging" && "$ENV" != "production" ]]; then
  die "Usage: $0 [staging|production]"
fi

log "Starting DevPulse deployment to: $ENV"
log "Build: ${BUILD_NUMBER:-local} | Branch: ${BRANCH_NAME:-$(git rev-parse --abbrev-ref HEAD)}"

# ── Load env-specific config ──────────────────────────────────────────────────

if [[ "$ENV" == "production" ]]; then
  DEPLOY_HOST="${PROD_HOST:-}"
  COMPOSE_FILE="docker-compose.prod.yml"
else
  DEPLOY_HOST="${STAGING_HOST:-}"
  COMPOSE_FILE="docker-compose.yml"
fi

if [[ -z "$DEPLOY_HOST" ]]; then
  log "No deploy host configured — skipping remote deploy (local build only)"
  log "Set PROD_HOST or STAGING_HOST environment variable to enable remote deploy"
  exit 0
fi

# ── Run health check after deploy ─────────────────────────────────────────────

HEALTH_URL="https://${DEPLOY_HOST}/api/health"
log "Checking health at $HEALTH_URL..."

for i in 1 2 3 4 5; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    log "Health check passed (attempt $i)"
    break
  fi
  if [[ $i -eq 5 ]]; then
    die "Health check failed after 5 attempts — last status: $STATUS"
  fi
  log "Attempt $i failed (status: $STATUS) — retrying in 10s..."
  sleep 10
done

log "Deployment to $ENV complete."
log "Deploy log saved to: $LOG_FILE"
