const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  firebaseUid: {
    type: String,
    index: true
  },
  searchQuery: {
    type: String,
    required: true
  },
  symptoms: [String],
  doctorType: {
    type: String,
    enum: ['general', 'personal'],
    default: 'general'
  },
  aiResponse: {
    type: String
  },
  diagnosis: {
    conditions: [{
      name: String,
      confidence: Number,
      severity: String
    }],
    recommendations: [String]
  },
  sessionId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for faster queries
searchHistorySchema.index({ userId: 1, timestamp: -1 });
searchHistorySchema.index({ firebaseUid: 1, timestamp: -1 });

// Virtual for formatted date
searchHistorySchema.virtual('formattedDate').get(function() {
  return this.timestamp.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Method to get user's search history
searchHistorySchema.statics.getUserHistory = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Method to get search statistics
searchHistorySchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        uniqueSymptoms: { $addToSet: '$symptoms' },
        lastSearch: { $max: '$timestamp' }
      }
    }
  ]);

  return stats[0] || { totalSearches: 0, uniqueSymptoms: [], lastSearch: null };
};

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);

module.exports = SearchHistory;
