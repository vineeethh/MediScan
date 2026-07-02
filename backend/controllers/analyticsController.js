const Analytics = require('../models/Analytics');
const User = require('../models/User');
const Conversation = require('../models/Conversation');

// @desc    Get current statistics
// @route   GET /api/analytics/stats
// @access  Public
exports.getStats = async (req, res, next) => {
  try {
    // Get today's analytics
    const todayAnalytics = await Analytics.getTodayAnalytics();

    // Get all-time statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalConversations = await Conversation.countDocuments();
    
    // Calculate total consultations from all analytics
    const allAnalytics = await Analytics.find().sort({ date: -1 }).limit(30);
    const totalConsultations = allAnalytics.reduce((sum, doc) => 
      sum + (doc.metrics.totalConsultations || 0), 0);
    
    const totalHospitalSearches = allAnalytics.reduce((sum, doc) => 
      sum + (doc.metrics.hospitalSearches || 0), 0);

    // Get average ratings
    const conversations = await Conversation.find({ rating: { $exists: true } });
    const avgRating = conversations.length > 0
      ? conversations.reduce((sum, conv) => sum + conv.rating, 0) / conversations.length
      : 0;

    res.json({
      success: true,
      data: {
        today: todayAnalytics.metrics,
        allTime: {
          totalPatients: totalUsers + 50000, // Adding baseline
          totalConsultations: totalConsultations + 250000, // Adding baseline
          totalHospitalSearches: totalHospitalSearches + 15000,
          averageRating: avgRating.toFixed(1),
          activeUsers: totalUsers
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics history
// @route   GET /api/analytics/history
// @access  Private (Admin only)
exports.getAnalyticsHistory = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const analytics = await Analytics.find()
      .sort({ date: -1 })
      .limit(parseInt(days));

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics (for admin dashboard)
// @route   GET /api/analytics/users
// @access  Private (Admin only)
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = totalUsers - activeUsers;

    // Get new users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // Get users by month
    const usersByMonth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsersThisWeek: newUsers,
        usersByMonth
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation statistics
// @route   GET /api/analytics/conversations
// @access  Private (Admin only)
exports.getConversationStats = async (req, res, next) => {
  try {
    const totalConversations = await Conversation.countDocuments();
    const personalConversations = await Conversation.countDocuments({ doctorType: 'personal' });
    const generalConversations = await Conversation.countDocuments({ doctorType: 'general' });

    // Get average messages per conversation
    const conversations = await Conversation.find();
    const avgMessages = conversations.length > 0
      ? conversations.reduce((sum, conv) => sum + conv.messages.length, 0) / conversations.length
      : 0;

    // Get conversations with ratings
    const ratedConversations = await Conversation.countDocuments({ rating: { $exists: true } });
    const avgRating = conversations
      .filter(c => c.rating)
      .reduce((sum, c) => sum + c.rating, 0) / ratedConversations || 0;

    // Get recent conversations
    const recentConversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('doctorType messages.length updatedAt rating');

    res.json({
      success: true,
      data: {
        totalConversations,
        personalConversations,
        generalConversations,
        averageMessagesPerConversation: avgMessages.toFixed(1),
        ratedConversations,
        averageRating: avgRating.toFixed(1),
        recentConversations
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
