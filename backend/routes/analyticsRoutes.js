const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/stats', analyticsController.getStats);

// Admin only routes
router.get('/history', protect, restrictTo('admin'), analyticsController.getAnalyticsHistory);
router.get('/users', protect, restrictTo('admin'), analyticsController.getUserStats);
router.get('/conversations', protect, restrictTo('admin'), analyticsController.getConversationStats);

module.exports = router;
