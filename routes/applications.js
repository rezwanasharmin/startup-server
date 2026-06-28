/**
 * Collaborator Application Routes Configuration
 * Handles candidate applications submissions, retrieval of application lists (both personal
 * and incoming founder lists), and application status updates (acceptance/rejection).
 */
const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Opportunity = require('../models/Opportunity');
const Startup = require('../models/Startup');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/applications
// @desc    Apply to an opportunity (Collaborator only)
// @access  Private (Collaborator)
router.post('/', verifyToken, authorizeRoles('Collaborator'), async (req, res) => {
  try {
    const { Opportunity_id, Portfolio_link, Motivation } = req.body;

    if (!Opportunity_id || !Portfolio_link || !Motivation) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Verify opportunity exists
    const opportunity = await Opportunity.findById(Opportunity_id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check if collaborator already applied
    const alreadyApplied = await Application.findOne({
      Opportunity_id,
      Applicant_email: req.user.email,
    });

    if (alreadyApplied) {
      return res.status(400).json({ message: 'You have already applied for this opportunity' });
    }

    const application = new Application({
      Opportunity_id,
      Applicant_email: req.user.email,
      Portfolio_link,
      Motivation,
      Status: 'Pending',
    });

    await application.save();
    res.status(201).json(application);
  } catch (error) {
    console.error('Apply opportunity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/applications/my-applications
// @desc    Get current collaborator's applications
// @access  Private (Collaborator)
router.get('/my-applications', verifyToken, authorizeRoles('Collaborator'), async (req, res) => {
  try {
    const applications = await Application.find({ Applicant_email: req.user.email })
      .populate({
        path: 'Opportunity_id',
        populate: {
          path: 'startup_id',
          model: 'Startup',
        },
      })
      .sort({ applied_at: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Get my-applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/applications/incoming
// @desc    Get incoming applications for founder's opportunities
// @access  Private (Founder)
router.get('/incoming', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    // 1. Get founder's startup
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup) {
      return res.json([]);
    }

    // 2. Get all opportunities for this startup
    const opportunities = await Opportunity.find({ startup_id: startup._id });
    const opportunityIds = opportunities.map((opp) => opp._id);

    // 3. Find applications for these opportunities
    const applications = await Application.find({ Opportunity_id: { $in: opportunityIds } })
      .populate('Opportunity_id')
      .sort({ applied_at: -1 });

    // Fetch user details manually for applicants to display profile photos/details
    const applicationsWithProfiles = await Promise.all(
      applications.map(async (app) => {
        const applicantUser = await User.findOne({ email: app.Applicant_email }).select('-password');
        return {
          ...app.toObject(),
          applicantProfile: applicantUser,
        };
      })
    );

    res.json(applicationsWithProfiles);
  } catch (error) {
    console.error('Get incoming applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/applications/:id/status
// @desc    Accept or reject application (Founder only)
// @access  Private (Founder)
router.put('/:id/status', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['Accepted', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status update. Must be Accepted or Rejected' });
    }

    const application = await Application.findById(req.params.id).populate('Opportunity_id');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify opportunity belongs to founder's startup
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup || application.Opportunity_id.startup_id.toString() !== startup._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to moderate this application' });
    }

    application.Status = status;
    await application.save();

    res.json(application);
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
