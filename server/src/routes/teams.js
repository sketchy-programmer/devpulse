const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');
const Team = require('../models/Team');
const crypto = require('crypto');

// GET /api/teams/:id — get team info (protected)
router.get('/:id', protect, async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).select('-agentKeyHash');
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    return res.json(team);
  } catch (err) {
    return next(err);
  }
});

// POST /api/teams — create a new team, returns a plaintext agent key (shown once)
router.post('/', validate(schemas.teamSchema), async (req, res, next) => {
  try {
    const plainKey = crypto.randomBytes(32).toString('hex');
    const team = new Team(req.body);
    await team.setAgentKey(plainKey);
    await team.save();

    return res.status(201).json({
      success: true,
      team: { id: team._id, name: team.name, slug: team.slug },
      agentKey: plainKey, // Shown ONCE — tell user to save it
      note: 'Save this agent key — it will not be shown again.',
    });
  } catch (err) {
    return next(err);
  }
});

// PATCH /api/teams/:id/thresholds — update alert thresholds (protected)
router.patch('/:id/thresholds', protect, async (req, res, next) => {
  try {
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { thresholds: req.body },
      { new: true, runValidators: true }
    ).select('-agentKeyHash');
    if (!team) return res.status(404).json({ error: 'Team not found.' });
    return res.json(team);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
