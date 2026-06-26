const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  Opportunity_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opportunity',
    required: true,
  },
  Applicant_email: {
    type: String,
    required: true,
  },
  Portfolio_link: {
    type: String,
    required: true,
  },
  Motivation: {
    type: String,
    required: true,
  },
  Status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending',
  },
  applied_at: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Application', applicationSchema);
