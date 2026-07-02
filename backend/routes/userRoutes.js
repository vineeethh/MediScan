const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SearchHistory = require('../models/SearchHistory');
const Conversation = require('../models/Conversation');

// @desc    Sync Firebase user to MongoDB
// @route   POST /api/user/sync
// @access  Public (called from frontend after Firebase auth)
router.post('/sync', async (req, res) => {
  try {
    const { firebaseUid, email, displayName, photoURL, authProvider } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({
        success: false,
        message: 'Firebase UID and email are required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ firebaseUid });

    if (user) {
      // Update existing user
      user.lastLogin = new Date();
      user.photoURL = photoURL || user.photoURL;
      user.name = displayName || user.name;
      await user.save();

      return res.json({
        success: true,
        message: 'User synced successfully',
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          photoURL: user.photoURL,
          lastLogin: user.lastLogin
        }
      });
    }

    // Create new user
    user = await User.create({
      firebaseUid,
      email,
      name: displayName || email.split('@')[0],
      photoURL,
      authProvider: authProvider || 'email',
      lastLogin: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'User created and synced successfully',
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        name: user.name,
        photoURL: user.photoURL,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('User sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing user',
      error: error.message
    });
  }
});

// @desc    Get user dashboard data
// @route   GET /api/user/dashboard/:firebaseUid
// @access  Public (should be protected in production)
router.get('/dashboard/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    // Get user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get search history (last 50)
    const searchHistory = await SearchHistory.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    // Get conversation count
    const conversationCount = await Conversation.countDocuments({ userId: user._id });

    // Get statistics
    const totalSearches = searchHistory.length;
    const uniqueSymptoms = [...new Set(searchHistory.flatMap(s => s.symptoms || []))];
    const lastSearch = searchHistory[0]?.timestamp;

    // Get doctor type usage
    const doctorTypeStats = await SearchHistory.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: '$doctorType', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          photoURL: user.photoURL,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        },
        statistics: {
          totalSearches,
          totalConversations: conversationCount,
          uniqueSymptoms: uniqueSymptoms.length,
          lastSearch,
          doctorTypeUsage: doctorTypeStats
        },
        recentSearches: searchHistory.slice(0, 10).map(search => ({
          id: search._id,
          query: search.searchQuery,
          symptoms: search.symptoms,
          doctorType: search.doctorType,
          timestamp: search.timestamp,
          diagnosis: search.diagnosis
        })),
        allSearches: searchHistory.map(search => ({
          id: search._id,
          query: search.searchQuery,
          symptoms: search.symptoms,
          doctorType: search.doctorType,
          timestamp: search.timestamp
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// @desc    Save search to history
// @route   POST /api/user/search-history
// @access  Public
router.post('/search-history', async (req, res) => {
  try {
    const {
      firebaseUid,
      searchQuery,
      symptoms,
      doctorType,
      aiResponse,
      diagnosis,
      sessionId
    } = req.body;

    console.log('=== SAVE SEARCH HISTORY REQUEST ===');
    console.log('Firebase UID:', firebaseUid);
    console.log('Search Query:', searchQuery);
    console.log('Symptoms:', symptoms);
    console.log('Doctor Type:', doctorType);

    if (!firebaseUid || !searchQuery) {
      return res.status(400).json({
        success: false,
        message: 'Firebase UID and search query are required'
      });
    }

    // Get user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      console.error('User not found for UID:', firebaseUid);
      return res.status(404).json({
        success: false,
        message: 'User not found. Please sync user first.'
      });
    }

    console.log('User found:', user._id, user.email);

    // Create search history entry
    const searchHistory = await SearchHistory.create({
      userId: user._id,
      firebaseUid,
      searchQuery,
      symptoms: symptoms || [],
      doctorType: doctorType || 'general',
      aiResponse,
      diagnosis,
      sessionId,
      timestamp: new Date()
    });

    console.log('Search history saved successfully:', searchHistory._id);

    res.status(201).json({
      success: true,
      message: 'Search saved to history',
      data: searchHistory
    });
  } catch (error) {
    console.error('Save search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving search history',
      error: error.message
    });
  }
});

// @desc    Delete search history item
// @route   DELETE /api/user/search-history/:id
// @access  Public
router.delete('/search-history/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const searchHistory = await SearchHistory.findByIdAndDelete(id);

    if (!searchHistory) {
      return res.status(404).json({
        success: false,
        message: 'Search history item not found'
      });
    }

    res.json({
      success: true,
      message: 'Search history item deleted'
    });
  } catch (error) {
    console.error('Delete search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting search history',
      error: error.message
    });
  }
});

// @desc    Clear all search history for user
// @route   DELETE /api/user/search-history/clear/:firebaseUid
// @access  Public
router.delete('/search-history/clear/:firebaseUid', async (req, res) => {
  try {
    const { firebaseUid } = req.params;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await SearchHistory.deleteMany({ userId: user._id });

    res.json({
      success: true,
      message: 'Search history cleared'
    });
  } catch (error) {
    console.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error clearing search history',
      error: error.message
    });
  }
});

module.exports = router;
