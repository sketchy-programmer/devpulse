const express = require('express');
const router = express.Router();
const { protect, agentAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { createMetric, getMetrics, getMetricsSummary } = require('../controllers/metricsController');

// Agent posts metrics — uses agent key auth, not JWT
router.post('/', agentAuth, validate(schemas.metricSchema), createMetric);

// Dashboard reads metrics — requires JWT
router.get('/:teamId', protect, getMetrics);
router.get('/:teamId/summary', protect, getMetricsSummary);

module.exports = router;
