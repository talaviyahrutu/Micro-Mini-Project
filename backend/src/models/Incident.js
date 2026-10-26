const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema(
  {
    api: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Api',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an incident title'],
      trim: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'major', 'minor'],
      default: 'major',
    },
    status: {
      type: String,
      enum: ['open', 'investigating', 'identified', 'monitoring', 'resolved'],
      default: 'open',
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      required: [true, 'Please provide an incident description'],
    },
    rootCause: {
      type: String,
      default: '',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    timeline: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          required: true,
        },
        note: {
          type: String,
          required: true,
        },
        updatedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({ api: 1, status: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
