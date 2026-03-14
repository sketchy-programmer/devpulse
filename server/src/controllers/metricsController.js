const Metric = require('../models/Metric');

/**
 * Determine alert level from metric values and team thresholds.
 */
const computeAlertLevel = (metric, thresholds) => {
  const { cpu, memory, disk } = metric;
  const checks = [
    { value: cpu.percent, warn: thresholds.cpuWarning, crit: thresholds.cpuCritical },
    { value: memory.percentUsed, warn: thresholds.memoryWarning, crit: thresholds.memoryCritical },
    { value: disk.percentUsed, warn: thresholds.diskWarning, crit: thresholds.diskCritical },
  ];

  for (const c of checks) {
    if (c.value >= c.crit) return 'critical';
  }
  for (const c of checks) {
    if (c.value >= c.warn) return 'warning';
  }
  return 'ok';
};

/**
 * POST /api/metrics
 * Called by Python CLI agent. Authenticated via X-Agent-Key.
 */
const createMetric = async (req, res, next) => {
  try {
    const alertLevel = computeAlertLevel(req.body, req.team.thresholds);

    const metric = await Metric.create({
      teamId: req.team._id,
      alertLevel,
      ...req.body,
    });

    return res.status(201).json({ success: true, id: metric._id, alertLevel });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/metrics/:teamId
 * Returns last 24h of metrics for a team, aggregated into 5-min buckets.
 * Protected — requires JWT.
 */
const getMetrics = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const metrics = await Metric.find({
      teamId: req.params.teamId,
      collectedAt: { $gte: since },
    })
      .sort({ collectedAt: -1 })
      .limit(500)
      .select('-__v');

    // Latest snapshot for the dashboard summary card
    const latest = metrics[0] || null;

    return res.json({
      teamId: req.params.teamId,
      count: metrics.length,
      latest,
      history: metrics,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * GET /api/metrics/:teamId/summary
 * Returns avg/max for CPU, memory, disk over the last hour.
 */
const getMetricsSummary = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const [summary] = await Metric.aggregate([
      { $match: { teamId: require('mongoose').Types.ObjectId.createFromHexString(req.params.teamId), collectedAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgCpu: { $avg: '$cpu.percent' },
          maxCpu: { $max: '$cpu.percent' },
          avgMemory: { $avg: '$memory.percentUsed' },
          maxMemory: { $max: '$memory.percentUsed' },
          avgDisk: { $avg: '$disk.percentUsed' },
          maxDisk: { $max: '$disk.percentUsed' },
          sampleCount: { $sum: 1 },
        },
      },
    ]);

    return res.json(summary || { message: 'No data in the last hour.' });
  } catch (err) {
    return next(err);
  }
};

module.exports = { createMetric, getMetrics, getMetricsSummary };
