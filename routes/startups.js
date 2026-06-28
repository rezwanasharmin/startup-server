/**
 * Startup Profiles Routes Configuration
 * Handles startup profile creation, updates, deletes, and approval/rejection operations
 * managed by platform administrators.
 */
const express = require('express');
const router = express.Router();
const Startup = require('../models/Startup');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// @route   POST /api/startups
// @desc    Create startup profile (Founder only)
// @access  Private (Founder)
router.post('/', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const { startup_name, logo, industry, description, funding_stage } = req.body;

    if (!startup_name || !logo || !industry || !description || !funding_stage) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if founder already has a startup
    const existingStartup = await Startup.findOne({ founder_email: req.user.email });
    if (existingStartup) {
      return res.status(400).json({ message: 'You have already registered a startup. You can manage it from your dashboard.' });
    }

    const startup = new Startup({
      startup_name,
      logo,
      industry,
      description,
      funding_stage,
      founder_email: req.user.email,
      status: 'Pending', // Defaults to Pending, requires Admin approval
    });

    await startup.save();
    res.status(201).json(startup);
  } catch (error) {
    console.error('Create startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/startups/my-startup
// @desc    Get founder's startup details
// @access  Private (Founder)
router.get('/my-startup', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup) {
      return res.status(404).json({ message: 'No startup found for this user' });
    }
    res.json(startup);
  } catch (error) {
    console.error('Get my-startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/startups/my-startup
// @desc    Update startup profile (Founder only)
// @access  Private (Founder)
router.put('/my-startup', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const { startup_name, logo, industry, description, funding_stage } = req.body;

    let startup = await Startup.findOne({ founder_email: req.user.email });
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }

    startup.startup_name = startup_name || startup.startup_name;
    startup.logo = logo || startup.logo;
    startup.industry = industry || startup.industry;
    startup.description = description || startup.description;
    startup.funding_stage = funding_stage || startup.funding_stage;

    // Reset status to Pending if name, industry, or description changes (or keep approved)
    // To be safe, we will keep approved status or let it remain as is, but we could set it to Pending
    // Let's keep the existing status or make it Pending. Let's just keep it approved.

    await startup.save();
    res.json(startup);
  } catch (error) {
    console.error('Update startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/startups/my-startup
// @desc    Delete startup profile (Founder only)
// @access  Private (Founder)
router.delete('/my-startup', verifyToken, authorizeRoles('Founder'), async (req, res) => {
  try {
    const startup = await Startup.findOneAndDelete({ founder_email: req.user.email });
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }
    res.json({ message: 'Startup deleted successfully' });
  } catch (error) {
    console.error('Delete startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/startups
// @desc    Get all startups (Public: approved only, Admin: all)
// @access  Public / Private (Admin)
router.get('/', async (req, res) => {
  try {
    // If request includes auth cookie and user is Admin, show all
    const token = req.cookies.token;
    let isAdmin = false;

    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforstartupforgeproject2026');
        const User = require('../models/User');
        const user = await User.findById(decoded.id);
        if (user && user.role === 'Admin') {
          isAdmin = true;
        }
      } catch (err) {
        // Token invalid, treat as public
      }
    }

    if (isAdmin) {
      const startups = await Startup.find().sort({ createdAt: -1 });
      return res.json(startups);
    } else {
      const startups = await Startup.find({ status: 'Approved' }).sort({ createdAt: -1 });
      return res.json(startups);
    }
  } catch (error) {
    console.error('Get startups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/startups/:id
// @desc    Get startup details by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }
    res.json(startup);
  } catch (error) {
    console.error('Get startup details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/startups/:id/approve
// @desc    Approve startup (Admin only)
// @access  Private (Admin)
router.put('/:id/approve', verifyToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }

    startup.status = 'Approved';
    await startup.save();
    res.json(startup);
  } catch (error) {
    console.error('Approve startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/startups/:id/reject
// @desc    Reject startup (Admin only)
// @access  Private (Admin)
router.put('/:id/reject', verifyToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const startup = await Startup.findById(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }

    startup.status = 'Rejected';
    await startup.save();
    res.json(startup);
  } catch (error) {
    console.error('Reject startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/startups/:id
// @desc    Remove startup (Admin only)
// @access  Private (Admin)
router.delete('/:id', verifyToken, authorizeRoles('Admin'), async (req, res) => {
  try {
    const startup = await Startup.findByIdAndDelete(req.params.id);
    if (!startup) {
      return res.status(404).json({ message: 'Startup not found' });
    }
    res.json({ message: 'Startup removed successfully' });
  } catch (error) {
    console.error('Remove startup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
