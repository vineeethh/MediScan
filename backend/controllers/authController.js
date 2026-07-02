const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Analytics = require('../models/Analytics');
const { verifyFirebaseToken } = require('../config/firebase');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Update analytics
    await Analytics.incrementMetric('totalPatients');
    await Analytics.incrementMetric('newPatients');

    // Send response with token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Send response with token
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, preferences, healthProfile } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (preferences) fieldsToUpdate.preferences = { ...req.user.preferences, ...preferences };
    if (healthProfile) fieldsToUpdate.healthProfile = { ...req.user.healthProfile, ...healthProfile };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      fieldsToUpdate,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/auth/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login or register via Firebase token (Google Sign-in / Email link)
// @route   POST /api/auth/firebase
// @access  Public
exports.firebaseAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Firebase ID token is required' });
    }

    // Verify the token with Firebase Admin SDK
    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
    }

    const { uid, email, name, picture } = decoded;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not found in Firebase token' });
    }

    // Find existing user or create a new one
    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        firebaseUid: uid,
        authProvider: 'google',
        photoURL: picture || null,
        isActive: true
      });
      await Analytics.incrementMetric('totalPatients');
      await Analytics.incrementMetric('newPatients');
    } else {
      // Sync Firebase UID if user registered via email/password before using Google
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.authProvider = 'google';
      }
      if (picture && !user.photoURL) user.photoURL = picture;
      user.lastLogin = new Date();
      await user.save();
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        photoURL: user.photoURL
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    next(error);
  }
};
