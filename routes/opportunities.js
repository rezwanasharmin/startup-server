const express = require('express');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const Startup = require('../models/Startup');
const Payment = require('../models/Payment');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/opportunities
// @desc    Add a new opportunity (Founder only, check premium limit)
// @access  Private (Founder)
router.post('/', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const { role_title, required_skills, work_type, commitment_level, deadline } = req.body;

    if (!role_title || !required_skills || !work_type || !commitment_level || !deadline) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // 1. Find the founder's startup
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup) {
      return res.status(400).json({ message: 'You must create a startup profile before adding opportunities' });
    }

    // 2. Count current opportunities for this startup
    const currentCount = await Opportunity.countDocuments({ startup_id: startup._id });

    // 3. If posting more than 3 opportunities, check premium status
    if (currentCount >= 3) {
      const payment = await Payment.findOne({
        user_email: req.user.email,
        payment_status: 'succeeded',
      });

      if (!payment) {
        return res.status(403).json({
          message: 'Upgrade to Premium required: You cannot post more than 3 opportunities on the free tier.',
          requiresUpgrade: true,
        });
      }
    }

    // Process skills into array if it comes as a comma-separated string
    let skillsArray = required_skills;
    if (typeof required_skills === 'string') {
      skillsArray = required_skills.split(',').map((skill) => skill.trim()).filter(Boolean);
    }

    const opportunity = new Opportunity({
      startup_id: startup._id,
      role_title,
      required_skills: skillsArray,
      work_type,
      commitment_level,
      deadline,
    });

    await opportunity.save();
    res.status(201).json(opportunity);
  } catch (error) {
    console.error('Add opportunity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/opportunities
// @desc    Browse opportunities (Public, paginated, searchable, filterable)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    const query = {};

    // 1. Search by Role Title or Required Skills using MongoDB $regex
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { role_title: { $regex: searchRegex } },
        { required_skills: { $regex: searchRegex } }
      ];
    }

    // 2. Filter by Work Type using MongoDB $in
    if (req.query.work_type) {
      const workTypes = Array.isArray(req.query.work_type)
        ? req.query.work_type
        : req.query.work_type.split(',').map(s => s.trim()).filter(Boolean);
      
      if (workTypes.length > 0) {
        query.work_type = { $in: workTypes };
      }
    }

    // 3. Filter by Industry using MongoDB $in (needs cross-reference with Startup collection)
    if (req.query.industry) {
      const industries = Array.isArray(req.query.industry)
        ? req.query.industry
        : req.query.industry.split(',').map(s => s.trim()).filter(Boolean);

      if (industries.length > 0) {
        // Find startups that match the selected industries
        const matchingStartups = await Startup.find({
          industry: { $in: industries },
          status: 'Approved' // only show opportunities from approved startups
        }).select('_id');

        const startupIds = matchingStartups.map(s => s._id);
        
        // If we have query.startup_id from somewhere else, intersect them
        query.startup_id = { $in: startupIds };
      }
    }

    // If no industry filter is set, make sure the startup is approved anyway
    if (!query.startup_id) {
      const approvedStartups = await Startup.find({ status: 'Approved' }).select('_id');
      const approvedIds = approvedStartups.map(s => s._id);
      query.startup_id = { $in: approvedIds };
    }

    // Execute query with pagination
    const totalItems = await Opportunity.countDocuments(query);
    const opportunities = await Opportunity.find(query)
      .populate('startup_id')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      opportunities,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit,
      }
    });
  } catch (error) {
    console.error('Browse opportunities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/opportunities/my-opportunities
// @desc    Get founder's startup opportunities
// @access  Private (Founder)
router.get('/my-opportunities', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup) {
      return res.json([]);
    }

    const opportunities = await Opportunity.find({ startup_id: startup._id }).sort({ createdAt: -1 });
    res.json(opportunities);
  } catch (error) {
    console.error('Get my-opportunities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/opportunities/:id
// @desc    Get opportunity details
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id).populate('startup_id');
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    res.json(opportunity);
  } catch (error) {
    console.error('Get opportunity details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/opportunities/:id
// @desc    Update opportunity (Founder only)
// @access  Private (Founder)
router.put('/:id', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const { role_title, required_skills, work_type, commitment_level, deadline } = req.body;

    let opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Verify it belongs to the founder's startup
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup || opportunity.startup_id.toString() !== startup._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to edit this opportunity' });
    }

    // Process skills
    let skillsArray = opportunity.required_skills;
    if (required_skills) {
      skillsArray = typeof required_skills === 'string'
        ? required_skills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : required_skills;
    }

    opportunity.role_title = role_title || opportunity.role_title;
    opportunity.required_skills = skillsArray;
    opportunity.work_type = work_type || opportunity.work_type;
    opportunity.commitment_level = commitment_level || opportunity.commitment_level;
    opportunity.deadline = deadline || opportunity.deadline;

    await opportunity.save();
    res.json(opportunity);
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/opportunities/:id
// @desc    Delete opportunity (Founder only)
// @access  Private (Founder)
router.delete('/:id', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Verify it belongs to the founder's startup
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup || opportunity.startup_id.toString() !== startup._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to delete this opportunity' });
    }

    await opportunity.deleteOne();
    res.json({ message: 'Opportunity removed successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
