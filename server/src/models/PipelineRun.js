const mongoose = require('mongoose');

const pipelineRunSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    // GitHub repo or Jenkins job name
    repoName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    branch: {
      type: String,
      default: 'main',
      trim: true,
    },
    commitSha: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    status: {
      type: String,
      enum: ['running', 'success', 'failure', 'cancelled'],
      required: true,
    },
    // Individual stage results
    stages: [
      {
        name: { type: String, required: true },
        status: { type: String, enum: ['success', 'failure', 'skipped', 'running'] },
        durationMs: { type: Number },
      },
    ],
    durationMs: { type: Number },
    triggeredBy: { type: String, default: 'push' },
    runUrl: { type: String }, // Link to Jenkins/GitHub Actions run
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
  },
  { timestamps: true }
);

pipelineRunSchema.index({ teamId: 1, startedAt: -1 });
pipelineRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // 90 day TTL

module.exports = mongoose.model('PipelineRun', pipelineRunSchema);
