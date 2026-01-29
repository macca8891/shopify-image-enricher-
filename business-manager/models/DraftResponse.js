const mongoose = require('mongoose');

const DraftResponseSchema = new mongoose.Schema({
  contactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contact',
    required: true,
    index: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  platform: {
    type: String,
    enum: ['hubspot', 'linkedin', 'email'],
    required: true
  },
  draftText: {
    type: String,
    required: true
  },
  context: {
    previousMessages: [String], // Array of previous message excerpts
    conversationSummary: String,
    suggestedTone: String,
    keyPoints: [String]
  },
  status: {
    type: String,
    enum: ['draft', 'reviewed', 'sent', 'rejected'],
    default: 'draft'
  },
  userFeedback: String, // User can provide feedback to improve AI
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

DraftResponseSchema.index({ contactId: 1, status: 1 });
DraftResponseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DraftResponse', DraftResponseSchema);


