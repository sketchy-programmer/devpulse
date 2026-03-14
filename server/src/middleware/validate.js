const Joi = require('joi');

/**
 * Generic validation middleware factory.
 * Validates req.body against a Joi schema.
 * OWASP A03: Injection — always validate and sanitise input server-side.
 *
 * Usage: router.post('/route', validate(mySchema), handler)
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,    // Return all errors, not just the first
    stripUnknown: true,   // Remove fields not in schema (prevents mass assignment)
  });

  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(422).json({ error: 'Validation failed', details: messages });
  }

  req.body = value; // Use the sanitised/coerced value
  return next();
};

// ── Schemas ───────────────────────────────────────────────────────────────────

const metricSchema = Joi.object({
  host: Joi.string().max(255).required(),
  cpu: Joi.object({
    percent: Joi.number().min(0).max(100).required(),
    loadAvg1m: Joi.number().min(0),
    loadAvg5m: Joi.number().min(0),
  }).required(),
  memory: Joi.object({
    totalMB: Joi.number().positive().required(),
    usedMB: Joi.number().min(0).required(),
    percentUsed: Joi.number().min(0).max(100).required(),
  }).required(),
  disk: Joi.object({
    totalGB: Joi.number().positive().required(),
    usedGB: Joi.number().min(0).required(),
    percentUsed: Joi.number().min(0).max(100).required(),
  }).required(),
  processes: Joi.object({
    total: Joi.number().integer().min(0),
  }),
  collectedAt: Joi.date().iso(),
});

const pipelineRunSchema = Joi.object({
  repoName: Joi.string().max(255).required(),
  branch: Joi.string().max(255).default('main'),
  commitSha: Joi.string().max(40),
  status: Joi.string().valid('running', 'success', 'failure', 'cancelled').required(),
  stages: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      status: Joi.string().valid('success', 'failure', 'skipped', 'running').required(),
      durationMs: Joi.number().min(0),
    })
  ),
  durationMs: Joi.number().min(0),
  triggeredBy: Joi.string().default('push'),
  runUrl: Joi.string().uri(),
  startedAt: Joi.date().iso(),
  finishedAt: Joi.date().iso(),
});

const teamSchema = Joi.object({
  name: Joi.string().min(2).max(80).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).max(60).required()
    .messages({ 'string.pattern.base': 'Slug must be lowercase letters, numbers, and hyphens only' }),
  slackWebhook: Joi.string().uri().allow(''),
  thresholds: Joi.object({
    cpuWarning: Joi.number().min(1).max(100),
    cpuCritical: Joi.number().min(1).max(100),
    memoryWarning: Joi.number().min(1).max(100),
    memoryCritical: Joi.number().min(1).max(100),
    diskWarning: Joi.number().min(1).max(100),
    diskCritical: Joi.number().min(1).max(100),
  }),
});

const loginSchema = Joi.object({
  teamSlug: Joi.string().required(),
  agentKey: Joi.string().required(),
});

module.exports = {
  validate,
  schemas: { metricSchema, pipelineRunSchema, teamSchema, loginSchema },
};
