const jwt = require('jsonwebtoken');
const Team = require('../models/Team');

/**
 * Protect routes — requires a valid JWT in Authorization header.
 * Usage: router.get('/route', protect, handler)
 */
const protect = async (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated. Provide Bearer token.' });
  }

  const token = auth.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.teamId = decoded.teamId;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalid or expired.' });
  }
};

/**
 * Agent authentication — used by the Python CLI agent to POST metrics.
 * Reads X-Agent-Key header and validates against hashed key in DB.
 *
 * This separates agent auth from user auth — agents never get a JWT.
 * OWASP A01: Broken Access Control — principle of least privilege.
 */
const agentAuth = async (req, res, next) => {
  const agentKey = req.headers['x-agent-key'];
  const teamSlug = req.headers['x-team-slug'];

  if (!agentKey || !teamSlug) {
    return res.status(401).json({ error: 'Missing X-Agent-Key or X-Team-Slug header.' });
  }

  try {
    const team = await Team.findOne({ slug: teamSlug });
    if (!team) {
      return res.status(401).json({ error: 'Team not found.' });
    }

    const valid = await team.verifyAgentKey(agentKey);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid agent key.' });
    }

    req.team = team;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = { protect, agentAuth };
