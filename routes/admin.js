const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Startup = require('../models/Startup');
const Opportunity = require('../models/Opportunity');
const Payment = require('../models/Payment');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

// Apply admin protection to all routes in this file
router.use(verifyToken, authorizeRoles('Admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics (Overview)
// @access  Private (Admin)
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: 'Admin' } });
    const totalStartups = await Startup.countDocuments();
    const totalOpportunities = await Opportunity.countDocuments();
    
    // Sum revenue from payments
    const payments = await Payment.find({ payment_status: 'succeeded' });
    const totalRevenue = payments.reduce((acc, cur) => acc + cur.amount, 0);

    res.json({
      totalUsers,
      totalStartups,
      totalOpportunities,
      totalRevenue,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users list
// @access  Private (Admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'Admin' } }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/block
// @desc    Block a user
// @access  Private (Admin)
router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = true;
    await user.save();
    res.json({ message: 'User blocked successfully', user });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/admin/users/:id/unblock
// @desc    Unblock a user
// @access  Private (Admin)
router.put('/users/:id/unblock', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isBlocked = false;
    await user.save();
    res.json({ message: 'User unblocked successfully', user });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/admin/transactions
// @desc    Get all completed transactions
// @access  Private (Admin)
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Payment.find().sort({ paid_at: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
