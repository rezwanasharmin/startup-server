const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// @route   PUT /api/users/profile
// @desc    Update user profile (Name, Image, Skills, Bio)
// @access  Private
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, image, skills, bio } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.image = image !== undefined ? image : user.image;
    user.bio = bio !== undefined ? bio : user.bio;

    if (skills) {
      user.skills = Array.isArray(skills)
        ? skills
        : skills.split(',').map(s => s.trim()).filter(Boolean);
    }

    await user.save();

    // Do not return password
    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
