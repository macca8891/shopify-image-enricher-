const mongoose = require('mongoose');

const salesProcessSchema = new mongoose.Schema({
  emailTemplates: {
    type: Map,
    of: String,
    default: {}
  },
  bestPractices: {
    type: String,
    default: ''
  },
  commonQuestions: {
    type: Map,
    of: String,
    default: {}
  },
  followUpGuidelines: {
    type: String,
    default: ''
  },
  valueProps: {
    type: [String],
    default: []
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one document exists
salesProcessSchema.statics.getOrCreate = async function() {
  let process = await this.findOne();
  if (!process) {
    process = await this.create({
      bestPractices: 'Be consultative, listen first, provide value before asking for anything.',
      followUpGuidelines: 'Follow up within 7 days of last contact. Personalize each message.',
      valueProps: [
        'Focus on solving customer problems',
        'Build long-term relationships',
        'Provide expert guidance'
      ]
    });
  }
  return process;
};

module.exports = mongoose.model('SalesProcess', salesProcessSchema);


