const express = require('express');
const router = express.Router();
const { protect, agentAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const { createPipelineRun, getPipelineRuns, getPipelineStats } = require('../controllers/pipelineController');

// CI/CD system posts run results — uses agent key auth
router.post('/', agentAuth, validate(schemas.pipelineRunSchema), createPipelineRun);

// Dashboard reads pipeline data — requires JWT
router.get('/:teamId', protect, getPipelineRuns);
router.get('/:teamId/stats', protect, getPipelineStats);

module.exports = router;
