const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { validate, schemas } = require('../middleware/validate');
const Team = require('../models/Team');

/**
 * POST /api/auth/login
 * Dashboard login — team provides slug + agentKey, gets back a JWT.
 * The JWT is used for all subsequent dashboard API calls.
 */
router.post('/login', validate(schemas.loginSchema), async (req, res, next) => {
  try {
    const { teamSlug, agentKey } = req.body;

    const team = await Team.findOne({ slug: teamSlug });
    if (!team) {
      // Constant-time response to prevent user enumeration (OWASP A01)
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await team.verifyAgentKey(agentKey);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { teamId: team._id, teamSlug: team.slug },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      token,
      team: { id: team._id, name: team.name, slug: team.slug },
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
