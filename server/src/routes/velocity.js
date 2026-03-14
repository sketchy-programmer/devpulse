const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getVelocity } = require('../controllers/velocityController');

// GET /api/velocity — requires JWT
router.get('/', protect, getVelocity);

module.exports = router;
