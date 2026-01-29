const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  hubspotContactId: {
    type: String,
    unique: true,
    sparse: true
  },
  linkedinProfileId: {
    type: String,
    unique: true,
    sparse: true
  },
  email: {
    type: String,
    index: true
  },
  firstName: String,
  lastName: String,
  company: String,
  title: String,
  phone: String,
  lastContacted: Date,
  lastEmailDate: Date,
  lastLinkedInDate: Date,
  followUpNeeded: {
    type: Boolean,
    default: false
  },
  followUpReason: String,
  followUpDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ContactSchema.index({ followUpNeeded: 1, followUpDate: 1 });
ContactSchema.index({ lastContacted: 1 });

module.exports = mongoose.model('Contact', ContactSchema);


