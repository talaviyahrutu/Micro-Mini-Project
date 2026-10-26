const mongoose = require('mongoose');

const apiSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide an API name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Please provide a target endpoint URL'],
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/i.test(v);
        },
        message: 'Endpoint must be a valid HTTP or HTTPS URL',
      },
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'],
      default: 'GET',
      uppercase: true,
    },
    expectedStatusCode: {
      type: Number,
      default: 200,
      min: 100,
      max: 599,
    },
    interval: {
      type: Number,
      default: 30, // seconds
      min: [5, 'Interval cannot be less than 5 seconds'],
      max: [86400, 'Interval cannot exceed 24 hours'],
    },
    timeout: {
      type: Number,
      default: 5000, // milliseconds
      min: [500, 'Timeout cannot be less than 500ms'],
      max: [60000, 'Timeout cannot exceed 60000ms'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    currentStatus: {
      type: String,
      enum: ['healthy', 'unhealthy', 'pending', 'degraded'],
      default: 'pending',
    },
    lastCheckedAt: {
      type: Date,
      default: null,
    },
    lastResponseTime: {
      type: Number,
      default: null,
    },
    lastStatusCode: {
      type: Number,
      default: null,
    },
    lastErrorMessage: {
      type: String,
      default: null,
    },
    consecutiveFailures: {
      type: Number,
      default: 0,
    },
    uptimePercentage: {
      type: Number,
      default: 100.0,
      min: 0,
      max: 100,
    },
    totalChecks: {
      type: Number,
      default: 0,
    },
    successfulChecks: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

apiSchema.index({ enabled: 1, currentStatus: 1 });

module.exports = mongoose.model('Api', apiSchema);
