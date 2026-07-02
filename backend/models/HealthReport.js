const mongoose = require('mongoose');

const HealthReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  sessionId: { type: String, required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['pdf', 'image'], default: 'pdf' },
  extractedText: { type: String },
  reportType: {
    type: String,
    enum: ['blood_test', 'urine_test', 'lipid_profile', 'thyroid', 'diabetes', 'liver', 'kidney', 'general'],
    default: 'general'
  },
  analysis: {
    summary: String,
    abnormalValues: [{
      parameter: String,
      value: String,
      normalRange: String,
      status: { type: String, enum: ['high', 'low', 'normal', 'critical'] },
      interpretation: String
    }],
    recommendations: [String],
    urgency: { type: String, enum: ['routine', 'soon', 'urgent', 'emergency'], default: 'routine' },
    fullAnalysis: String
  },
  language: { type: String, default: 'en' }
}, { timestamps: true });

module.exports = mongoose.model('HealthReport', HealthReportSchema);
