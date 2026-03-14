const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    // API key for agent authentication (hashed)
    agentKeyHash: {
      type: String,
    },
    // Slack webhook for this team's alerts
    slackWebhook: {
      type: String,
      default: '',
    },
    // Alert thresholds
    thresholds: {
      cpuWarning: { type: Number, default: 80 },    // %
      cpuCritical: { type: Number, default: 95 },
      memoryWarning: { type: Number, default: 80 },
      memoryCritical: { type: Number, default: 95 },
      diskWarning: { type: Number, default: 75 },
      diskCritical: { type: Number, default: 90 },
    },
  },
  { timestamps: true }
);

// Hash the agent key before saving
teamSchema.methods.setAgentKey = async function (plainKey) {
  this.agentKeyHash = await bcrypt.hash(plainKey, 12);
};

teamSchema.methods.verifyAgentKey = async function (plainKey) {
  return bcrypt.compare(plainKey, this.agentKeyHash);
};

module.exports = mongoose.model('Team', teamSchema);
