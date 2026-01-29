const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  hubspotTaskId: {
    type: String,
    required: true,
    unique: true
  },
  hubspotContactId: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'call', 'linkedin'],
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  body: String,
  priority: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'HIGH'
  },
  status: {
    type: String,
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED'],
    default: 'NOT_STARTED'
  },
  emailDraft: {
    subject: String,
    body: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
}, {
  timestamps: true
});

taskSchema.index({ hubspotContactId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);


