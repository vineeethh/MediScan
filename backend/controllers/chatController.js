const Conversation = require('../models/Conversation');
const Analytics = require('../models/Analytics');
const PatientProfile = require('../models/PatientProfile');
const aiService = require('../services/aiService');
// Generate a session ID using crypto.randomUUID when available, else fallback to timestamp
const { randomUUID } = require('crypto');
const uuidv4 = typeof randomUUID === 'function' ? () => randomUUID() : () => Date.now().toString();

// @desc    Send message to AI and get response
// @route   POST /api/chat/message
// @access  Public (no auth required for unified AI Doctor)
exports.sendMessage = async (req, res, next) => {
  try {
  const { message, sessionId, doctorType } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a message'
      });
    }

    let conversation;
  const newSessionId = sessionId || uuidv4();

    // Find or create conversation
    if (sessionId) {
      conversation = await Conversation.findOne({ sessionId });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found'
        });
      }

      // Enforce ownership: authenticated users may only append to their own conversations
      if (req.user && conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this conversation'
        });
      }
    } else {
      // Create new conversation using selected doctor type (general or personal)
      conversation = new Conversation({
        userId: req.user?._id || null, // Optional user ID if logged in
        sessionId: newSessionId,
        doctorType: ['personal', 'general'].includes(doctorType) ? doctorType : 'general',
        messages: []
      });
    }

    // Add user message
    conversation.messages.push({
      text: message,
      sender: 'user',
      timestamp: new Date()
    });

    // Get AI response (uses conversational context)
    // For personal mode, fetch patient profile if user is logged in
    let patientProfile = null;
    if (conversation.doctorType === 'personal' && req.user) {
      const profile = await PatientProfile.findOne({ userId: req.user._id });
      if (profile && profile.isComplete) {
        patientProfile = {
          age: profile.age,
          gender: profile.gender,
          bmi: profile.bmi,
          bmiCategory: profile.getBMICategory(),
          chronicConditions: profile.chronicConditions.map(c => c.condition),
          smokingIntensity: profile.smokingIntensity,
          alcoholIntake: profile.alcoholIntake,
          physicalActivity: profile.physicalActivity,
          riskFactors: profile.getRiskFactors()
        };
      }
    }

    // If not authenticated or no saved profile, accept ephemeral profile from client in personal mode
    if (conversation.doctorType === 'personal' && !patientProfile && req.body && req.body.profile) {
      const p = req.body.profile;
      patientProfile = {
        age: p.age,
        gender: p.gender,
        chiefComplaint: p.chiefComplaint,
        symptomDuration: p.symptomDuration,
        symptomSeverity: p.symptomSeverity,
        additionalSymptoms: p.additionalSymptoms,
        previousTreatment: p.previousTreatment,
        chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
        allergies: Array.isArray(p.allergies) ? p.allergies : [],
        currentMedications: Array.isArray(p.currentMedications) ? p.currentMedications : [],
        bmi: p.bmi,
        bmiCategory: p.bmiCategory,
        smokingIntensity: p.smokingIntensity,
        alcoholIntake: p.alcoholIntake,
        physicalActivity: p.physicalActivity || { level: 'unknown' }
      };
    }
    
    const aiResponse = await aiService.getAIResponse(
      message,
      conversation.messages,
      conversation.doctorType || 'general',
      patientProfile
    );

    // Add bot message
    conversation.messages.push({
      text: aiResponse.text,
      sender: 'bot',
      timestamp: new Date(),
      analysis: aiResponse.analysis,
      metadata: aiResponse.metadata
    });

    // Save conversation
    await conversation.save();

    // Update analytics
    await Analytics.incrementMetric('totalConsultations');
    if (conversation.doctorType === 'personal') {
      await Analytics.incrementMetric('personalConsultations');
    }

    res.json({
      success: true,
      data: {
        sessionId: conversation.sessionId,
        response: aiResponse.text,
        analysis: aiResponse.analysis,
        timestamp: new Date()
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get conversation by session ID
// @route   GET /api/chat/conversation/:sessionId
// @access  Public (with optional auth)
exports.getConversation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify ownership for personal doctor conversations
    if (conversation.doctorType === 'personal') {
      if (!req.user || conversation.userId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized access to this conversation'
        });
      }
    }

    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's conversation history
// @route   GET /api/chat/history
// @access  Private
exports.getConversationHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, doctorType } = req.query;

    const query = { userId: req.user._id };
    if (doctorType) query.doctorType = doctorType;

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-messages') // Exclude messages for list view
      .exec();

    const count = await Conversation.countDocuments(query);

    res.json({
      success: true,
      data: conversations,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete conversation
// @route   DELETE /api/chat/conversation/:sessionId
// @access  Private
exports.deleteConversation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Verify ownership
    if (conversation.userId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to delete this conversation'
      });
    }

    await Conversation.findByIdAndDelete(conversation._id);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate conversation
// @route   POST /api/chat/conversation/:sessionId/rate
// @access  Public
exports.rateConversation = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rating between 1 and 5'
      });
    }

    const conversation = await Conversation.findOne({ sessionId });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    conversation.rating = rating;
    if (feedback) conversation.feedback = feedback;
    await conversation.save();

    res.json({
      success: true,
      message: 'Thank you for your feedback!'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream AI response via Server-Sent Events
// @route   POST /api/chat/stream
// @access  Public (with optional auth)
exports.streamMessage = async (req, res, next) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const { message, sessionId, doctorType, language = 'en' } = req.body;

    if (!message) {
      send({ error: 'Message is required' });
      return res.end();
    }

    let conversation;
    const newSessionId = sessionId || uuidv4();

    if (sessionId) {
      conversation = await Conversation.findOne({ sessionId });
      if (!conversation) {
        send({ error: 'Conversation not found' });
        return res.end();
      }
      if (req.user && conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
        send({ error: 'Unauthorized' });
        return res.end();
      }
    } else {
      conversation = new Conversation({
        userId: req.user?._id || null,
        sessionId: newSessionId,
        doctorType: ['personal', 'general'].includes(doctorType) ? doctorType : 'general',
        messages: []
      });
    }

    conversation.messages.push({ text: message, sender: 'user', timestamp: new Date() });

    // Resolve patient profile
    let patientProfile = null;
    if (conversation.doctorType === 'personal') {
      if (req.user) {
        const profile = await PatientProfile.findOne({ userId: req.user._id });
        if (profile?.isComplete) {
          patientProfile = {
            age: profile.age, gender: profile.gender, bmi: profile.bmi,
            bmiCategory: profile.getBMICategory(),
            chronicConditions: profile.chronicConditions.map(c => c.condition),
            smokingIntensity: profile.smokingIntensity, alcoholIntake: profile.alcoholIntake,
            physicalActivity: profile.physicalActivity, riskFactors: profile.getRiskFactors()
          };
        }
      }
      if (!patientProfile && req.body.profile) {
        const p = req.body.profile;
        patientProfile = {
          age: p.age, gender: p.gender, chiefComplaint: p.chiefComplaint,
          symptomDuration: p.symptomDuration, symptomSeverity: p.symptomSeverity,
          additionalSymptoms: p.additionalSymptoms, previousTreatment: p.previousTreatment,
          chronicConditions: Array.isArray(p.chronicConditions) ? p.chronicConditions : [],
          allergies: Array.isArray(p.allergies) ? p.allergies : [],
          currentMedications: Array.isArray(p.currentMedications) ? p.currentMedications : [],
          bmi: p.bmi, bmiCategory: p.bmiCategory, smokingIntensity: p.smokingIntensity,
          alcoholIntake: p.alcoholIntake, physicalActivity: p.physicalActivity || { level: 'unknown' }
        };
      }
    }

    // Stream tokens to client
    let fullText = '';
    try {
      const tokenStream = aiService.streamAIResponse(
        message, conversation.messages, conversation.doctorType, patientProfile, language
      );
      for await (const token of tokenStream) {
        fullText += token;
        send({ token });
      }
    } catch (streamError) {
      console.error('Stream error:', streamError.message);
      const fallback = await aiService.getAIResponse(message, conversation.messages, conversation.doctorType, patientProfile, language);
      fullText = fallback.text;
      send({ token: fullText });
    }

    // Persist conversation
    conversation.messages.push({ text: fullText, sender: 'bot', timestamp: new Date() });
    await conversation.save();
    await Analytics.incrementMetric('totalConsultations');

    send({ done: true, sessionId: conversation.sessionId });
    res.end();
  } catch (error) {
    console.error('Stream endpoint error:', error.message);
    send({ error: 'Internal server error' });
    res.end();
  }
};

// @desc    Analyze symptoms
// @route   POST /api/chat/analyze
// @access  Public
exports.analyzeSymptoms = async (req, res, next) => {
  try {
    const { symptoms } = req.body;

    if (!symptoms) {
      return res.status(400).json({
        success: false,
        message: 'Please provide symptoms to analyze'
      });
    }

    const analysis = aiService.analyzeSymptoms(symptoms);

    if (!analysis || analysis.length === 0) {
      return res.json({
        success: true,
        message: 'No specific conditions matched. Please provide more details or consult a healthcare professional.',
        data: []
      });
    }

    const results = analysis.slice(0, 3).map(match => ({
      condition: match.disease.name,
      description: match.disease.description,
      severity: match.disease.severity,
      confidence: Math.round(match.confidence),
      matchedSymptoms: match.matchedKeywords,
      remedies: match.disease.remedies
    }));

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
