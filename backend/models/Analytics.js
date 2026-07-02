const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  metrics: {
    totalPatients: {
      type: Number,
      default: 0
    },
    newPatients: {
      type: Number,
      default: 0
    },
    totalConsultations: {
      type: Number,
      default: 0
    },
    personalConsultations: {
      type: Number,
      default: 0
    },
    generalConsultations: {
      type: Number,
      default: 0
    },
    hospitalSearches: {
      type: Number,
      default: 0
    },
    averageMessageLength: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    userSatisfaction: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    }
  },
  topSymptoms: [{
    symptom: String,
    count: Number
  }],
  topConditions: [{
    condition: String,
    count: Number
  }],
  peakHours: [{
    hour: Number,
    count: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster date queries
analyticsSchema.index({ date: -1 });

// Static method to get or create today's analytics
analyticsSchema.statics.getTodayAnalytics = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let analytics = await this.findOne({ date: today });
  
  if (!analytics) {
    analytics = await this.create({ date: today });
  }
  
  return analytics;
};

// Static method to increment a metric
analyticsSchema.statics.incrementMetric = async function(metricName, value = 1) {
  const analytics = await this.getTodayAnalytics();
  analytics.metrics[metricName] = (analytics.metrics[metricName] || 0) + value;
  await analytics.save();
  return analytics;
};

module.exports = mongoose.model('Analytics', analyticsSchema);
