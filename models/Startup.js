const mongoose = require('mongoose');

const startupSchema = new mongoose.Schema({
  startup_name: {
    type: String,
    required: true,
  },
  logo: {
    type: String,
    required: true,
  },
  industry: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  funding_stage: {
    type: String,
    required: true,
  },
  founder_email: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Startup', startupSchema);
