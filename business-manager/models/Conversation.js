const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true
  },
  platform: {
    type: String,
    enum: ['hubspot', 'linkedin', 'email'],
    required: true
  },
  platformMessageId: String, // HubSpot email ID or LinkedIn message ID
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  subject: String,
  body: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  read: {
    type: Boolean,
    default: false
  },
  responded: {
    type: Boolean,
    default: false
  },
  responseNeeded: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ConversationSchema.index({ contactId: 1, date: -1 });
ConversationSchema.index({ platform: 1, date: -1 });
ConversationSchema.index({ responseNeeded: 1, date: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);


