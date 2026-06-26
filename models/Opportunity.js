const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema({
  startup_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Startup',
    required: true,
  },
  role_title: {
    type: String,
    required: true,
  },
  required_skills: {
    type: [String],
    default: [],
  },
  work_type: {
    type: String,
    required: true,
  },
  commitment_level: {
    type: String,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
