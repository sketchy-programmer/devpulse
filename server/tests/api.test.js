const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Team = require('../src/models/Team');
const Metric = require('../src/models/Metric');

// Use a separate test DB
const TEST_DB = 'mongodb://localhost:27017/devpulse_test';

let team;
let agentKey;
let authToken;

beforeAll(async () => {
  await mongoose.connect(TEST_DB);

  // Create a test team
  agentKey = 'test-agent-key-sprint1';
  team = new Team({ name: 'Test Team', slug: 'test-team' });
  await team.setAgentKey(agentKey);
  await team.save();

  // Get a JWT
  const res = await request(app)
    .post('/api/auth/login')
    .send({ teamSlug: 'test-team', agentKey });
  authToken = res.body.token;
});

afterAll(async () => {
  await Team.deleteMany({});
  await Metric.deleteMany({});
  await mongoose.disconnect();
});

// ── Health endpoint ───────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.uptime).toBeGreaterThan(0);
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  it('returns JWT with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ teamSlug: 'test-team', agentKey });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.team.slug).toBe('test-team');
  });

  it('rejects wrong agent key', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ teamSlug: 'test-team', agentKey: 'wrong-key' });
    expect(res.status).toBe(401);
  });

  it('rejects unknown team', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ teamSlug: 'nobody', agentKey });
    expect(res.status).toBe(401);
  });
});

// ── Metrics ───────────────────────────────────────────────────────────────────
describe('POST /api/metrics', () => {
  const validPayload = {
    host: 'web-server-01',
    cpu: { percent: 45.2, loadAvg1m: 1.2, loadAvg5m: 0.9 },
    memory: { totalMB: 8192, usedMB: 4096, percentUsed: 50 },
    disk: { totalGB: 100, usedGB: 40, percentUsed: 40 },
    processes: { total: 120 },
  };

  it('accepts valid metric payload with correct agent key', async () => {
    const res = await request(app)
      .post('/api/metrics')
      .set('X-Agent-Key', agentKey)
      .set('X-Team-Slug', 'test-team')
      .send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.alertLevel).toBe('ok');
  });

  it('rejects request with no agent key', async () => {
    const res = await request(app).post('/api/metrics').send(validPayload);
    expect(res.status).toBe(401);
  });

  it('rejects invalid metric payload — missing cpu', async () => {
    const res = await request(app)
      .post('/api/metrics')
      .set('X-Agent-Key', agentKey)
      .set('X-Team-Slug', 'test-team')
      .send({ host: 'server-01', memory: validPayload.memory, disk: validPayload.disk });
    expect(res.status).toBe(422);
  });

  it('computes critical alert level when cpu > threshold', async () => {
    const res = await request(app)
      .post('/api/metrics')
      .set('X-Agent-Key', agentKey)
      .set('X-Team-Slug', 'test-team')
      .send({ ...validPayload, cpu: { percent: 98, loadAvg1m: 8 } });
    expect(res.status).toBe(201);
    expect(res.body.alertLevel).toBe('critical');
  });
});

describe('GET /api/metrics/:teamId', () => {
  it('returns metrics with valid JWT', async () => {
    const res = await request(app)
      .get(`/api/metrics/${team._id}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
  });

  it('rejects request without JWT', async () => {
    const res = await request(app).get(`/api/metrics/${team._id}`);
    expect(res.status).toBe(401);
  });
});

// ── Rate limiting (basic check) ───────────────────────────────────────────────
describe('Rate limiting on auth route', () => {
  it('blocks after 10 failed attempts', async () => {
    const requests = Array.from({ length: 11 }, () =>
      request(app)
        .post('/api/auth/login')
        .send({ teamSlug: 'test-team', agentKey: 'wrong' })
    );
    const results = await Promise.all(requests);
    const blocked = results.some((r) => r.status === 429);
    expect(blocked).toBe(true);
  });
});
