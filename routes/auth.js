const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Helper to generate token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkeyforstartupforgeproject2026', {
    expiresIn: '24h',
  });
};

// Password rules check: Min 6 characters, one uppercase, one lowercase
const validatePassword = (password) => {
  if (password.length < 6) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  return true;
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, image } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    if (!['Founder', 'Collaborator'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Founder or Collaborator' });
    }

    // Check password rules
    if (!validatePassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters long, contain at least one uppercase letter, and one lowercase letter',
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      image: image || '',
    });

    await user.save();

    // Generate JWT
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if blocked
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the admin' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT
    const token = generateToken(user._id);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   POST /api/auth/google-login
// @desc    Handle login/registration via Google (Supports real OAuth tokens and mock payloads)
// @access  Public
router.post('/google-login', async (req, res) => {
  try {
    const { name, email, image, role, token } = req.body;

    let finalEmail = email;
    let finalName = name;
    let finalImage = image;

    if (token) {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(400).json({ message: 'Invalid Google token format' });
      }
      finalEmail = decoded.email;
      finalName = decoded.name;
      finalImage = decoded.picture;
    }

    if (!finalEmail || !finalName) {
      return res.status(400).json({ message: 'Invalid Google login payload' });
    }

    let user = await User.findOne({ email: finalEmail });

    if (user) {
      // Check if blocked
      if (user.isBlocked) {
        return res.status(403).json({ message: 'Your account has been blocked by the admin' });
      }
    } else {
      // Register new user via Google
      if (!role) {
        if (token) {
          // Send request back to client to choose a role
          return res.json({
            isNewUser: true,
            tempUser: { name: finalName, email: finalEmail, image: finalImage }
          });
        }
        return res.status(400).json({ message: 'Please select a role (Founder or Collaborator) for your first login' });
      }

      // Google auth doesn't require standard password, so generate a random password hash
      const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);

      user = new User({
        name: finalName,
        email: finalEmail,
        password: hashedPassword,
        role,
        image: finalImage || '',
      });
      await user.save();
    }

    // Generate JWT
    const jwtToken = generateToken(user._id);

    // Set cookie
    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      image: user.image,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: 'Server error during Google login' });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user & clear cookie
// @access  Public
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out successfully' });
});

// @route   GET /api/auth/me
// @desc    Get current user details
// @access  Private
router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
