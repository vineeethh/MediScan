const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'bot']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  analysis: {
    type: {
      type: String,
      enum: ['disease', 'greeting', 'hospital', 'general', 'emergency', 'medical-nlp', 'medical-nlp-personal']
    },
    confidence: Number,
    conditions: [{
      name: String,
      confidence: Number,
      severity: String
    }]
  },
  metadata: {
    responseTime: Number,
    model: String,
    tokens: Number
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous users for General AI Doctor
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  doctorType: {
    type: String,
    required: true,
    enum: ['personal', 'general', 'unified']
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'closed', 'archived'],
    default: 'active'
  },
  tags: [String],
  summary: String,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String,
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,
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

// Index for faster queries
conversationSchema.index({ userId: 1, createdAt: -1 });
// sessionId index removed - already created by unique: true
conversationSchema.index({ doctorType: 1 });

// Update lastMessageAt before saving
conversationSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
