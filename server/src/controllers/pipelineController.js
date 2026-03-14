const PipelineRun = require('../models/PipelineRun');

/**
 * POST /api/pipeline
 * Jenkins/GitHub Actions webhook handler.
 * The CI system POSTs run results here at end of each pipeline.
 */
const createPipelineRun = async (req, res, next) => {
  try {
    const run = await PipelineRun.create({
      teamId: req.team._id,
      ...req.body,
    });
    return res.status(201).json({ success: true, id: run._id });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/pipeline/:teamId
 * Returns last 50 pipeline runs for a team.
 */
const getPipelineRuns = async (req, res, next) => {
  try {
    const runs = await PipelineRun.find({ teamId: req.params.teamId })
      .sort({ startedAt: -1 })
      .limit(50)
      .select('-__v');

    // Compute pass rate over last 20 runs
    const last20 = runs.slice(0, 20);
    const passRate = last20.length
      ? Math.round((last20.filter((r) => r.status === 'success').length / last20.length) * 100)
      : null;

    // Average duration of successful runs
    const successfulRuns = runs.filter((r) => r.status === 'success' && r.durationMs);
    const avgDurationMs = successfulRuns.length
      ? Math.round(successfulRuns.reduce((s, r) => s + r.durationMs, 0) / successfulRuns.length)
      : null;

    return res.json({
      teamId: req.params.teamId,
      count: runs.length,
      passRate,
      avgDurationMs,
      runs,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/pipeline/:teamId/stats
 * Daily aggregated pipeline stats for the last 30 days (for chart).
 */
const getPipelineStats = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stats = await PipelineRun.aggregate([
      {
        $match: {
          teamId: require('mongoose').Types.ObjectId.createFromHexString(req.params.teamId),
          startedAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$startedAt' },
            month: { $month: '$startedAt' },
            day: { $dayOfMonth: '$startedAt' },
          },
          total: { $sum: 1 },
          passed: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    return res.json({ teamId: req.params.teamId, stats });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createPipelineRun, getPipelineRuns, getPipelineStats };
