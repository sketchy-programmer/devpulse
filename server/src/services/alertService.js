const https = require('https');
const url = require('url');

/**
 * Sends a Slack alert when a metric crosses a threshold.
 * Uses Node's built-in https — no extra dependencies needed.
 */
const sendSlackAlert = async (team, metric) => {
  const webhookUrl = team.slackWebhook || process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const { host, cpu, memory, disk, alertLevel } = metric;

  const emoji = alertLevel === 'critical' ? '🔴' : '🟡';
  const color = alertLevel === 'critical' ? '#ff3b5c' : '#ffb800';

  const fields = [
    cpu?.percent >= team.thresholds?.cpuWarning && {
      title: 'CPU',
      value: `${cpu.percent.toFixed(1)}%`,
      short: true,
    },
    memory?.percentUsed >= team.thresholds?.memoryWarning && {
      title: 'Memory',
      value: `${memory.percentUsed.toFixed(1)}%`,
      short: true,
    },
    disk?.percentUsed >= team.thresholds?.diskWarning && {
      title: 'Disk',
      value: `${disk.percentUsed.toFixed(1)}%`,
      short: true,
    },
  ].filter(Boolean);

  const payload = {
    attachments: [
      {
        color,
        title: `${emoji} DevPulse Alert — ${alertLevel.toUpperCase()}`,
        text: `Server *${host}* on team *${team.name}* is reporting ${alertLevel} metrics.`,
        fields,
        footer: 'DevPulse monitoring',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  const body = JSON.stringify(payload);
  const parsed = url.parse(webhookUrl);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: parsed.hostname,
        path: parsed.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      }
    );
    req.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Slack alert failed:', err.message);
      resolve();
    });
    req.write(body);
    req.end();
  });
};

module.exports = { sendSlackAlert };
