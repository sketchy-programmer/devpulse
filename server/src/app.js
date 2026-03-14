const velocityRouter = require('./routes/velocity');
const sanitize = require('./middleware/sanitize');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const metricsRouter = require('./routes/metrics');
const pipelineRouter = require('./routes/pipeline');
const teamsRouter = require('./routes/teams');
const authRouter = require('./routes/auth');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ── Security middleware (Phase 4 — OWASP hardening) ──────────────────────────

// Sets 11 HTTP security headers: X-Frame-Options, HSTS, CSP, etc.
app.use(helmet());

// CORS — only allow configured origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy: origin not allowed'));
  },
  credentials: true,
}));

// Rate limiting — OWASP A05: Security Misconfiguration
// 100 requests per 15 minutes per IP (global)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Stricter limiter for auth routes — prevent brute force (OWASP A07)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// ── General middleware ────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(sanitize);
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: require('../package.json').version,
  });
});

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/velocity', velocityRouter);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
