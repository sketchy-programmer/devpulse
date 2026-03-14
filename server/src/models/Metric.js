const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    // Which server/host this metric came from
    host: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    // System metrics collected by the Python agent
    cpu: {
      percent: { type: Number, min: 0, max: 100 },
      loadAvg1m: { type: Number },
      loadAvg5m: { type: Number },
    },
    memory: {
      totalMB: { type: Number },
      usedMB: { type: Number },
      percentUsed: { type: Number, min: 0, max: 100 },
    },
    disk: {
      totalGB: { type: Number },
      usedGB: { type: Number },
      percentUsed: { type: Number, min: 0, max: 100 },
    },
    processes: {
      total: { type: Number },
    },
    // Derived alert level — computed on write
    alertLevel: {
      type: String,
      enum: ['ok', 'warning', 'critical'],
      default: 'ok',
    },
    // When the agent collected this (may differ slightly from createdAt)
    collectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// TTL index — automatically delete metrics older than 30 days
metricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

// Compound index for efficient dashboard queries
metricSchema.index({ teamId: 1, collectedAt: -1 });

module.exports = mongoose.model('Metric', metricSchema);
