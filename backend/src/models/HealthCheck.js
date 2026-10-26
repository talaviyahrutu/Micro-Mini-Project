const mongoose = require('mongoose');

const healthCheckSchema = new mongoose.Schema(
  {
    api: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Api',
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['healthy', 'unhealthy', 'degraded', 'timeout'],
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseTime: {
      type: Number, // In milliseconds
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for high performance dashboard history and sparkline queries
healthCheckSchema.index({ api: 1, timestamp: -1 });

// Optional auto-cleanup TTL index (keeps health logs for 30 days)
healthCheckSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('HealthCheck', healthCheckSchema);
