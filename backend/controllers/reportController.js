const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const HealthReport = require('../models/HealthReport');
const { randomUUID } = require('crypto');

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: { 'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8000', 'X-Title': 'MediScan' }
});

const LANGUAGE_INSTRUCTIONS = {
  en: '',
  hi: 'Respond entirely in Hindi (हिंदी).',
  ta: 'Respond entirely in Tamil (தமிழ்).',
  te: 'Respond entirely in Telugu (తెలుగు).'
};

const buildReportPrompt = (text, language) => {
  const langNote = LANGUAGE_INSTRUCTIONS[language] || '';
  return `You are a medical report analyzer for MediScan, serving Indian patients. Analyze the following medical report and provide a clear, patient-friendly explanation.
${langNote}

MEDICAL REPORT TEXT:
"""
${text.slice(0, 4000)}
"""

Provide your analysis in this EXACT JSON format (no markdown, just JSON):
{
  "reportType": "blood_test|urine_test|lipid_profile|thyroid|diabetes|liver|kidney|general",
  "summary": "2-3 sentence plain-language summary of what this report shows",
  "abnormalValues": [
    {
      "parameter": "Parameter name",
      "value": "Patient's value with unit",
      "normalRange": "Normal range",
      "status": "high|low|normal|critical",
      "interpretation": "What this means in simple terms"
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2"],
  "urgency": "routine|soon|urgent|emergency",
  "fullAnalysis": "Detailed 3-4 paragraph analysis explaining all findings in simple language suitable for a patient in India"
}`;
};

// @desc    Analyze uploaded health report (PDF)
// @route   POST /api/reports/analyze
// @access  Public (optional auth)
exports.analyzeReport = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
    }

    const language = req.body.language || 'en';

    // Extract text from PDF
    let extractedText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } catch (pdfError) {
      return res.status(422).json({ success: false, message: 'Could not read the PDF. Please ensure it is a valid, text-based PDF (not a scanned image).' });
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return res.status(422).json({ success: false, message: 'The PDF appears to be a scanned image. Please upload a text-based PDF report.' });
    }

    // Analyze with AI
    let analysisData;
    try {
      const completion = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: buildReportPrompt(extractedText, language) }],
        max_tokens: 2048,
        temperature: 0.3
      });

      const responseText = completion.choices[0].message.content;
      // Strip markdown code fences if present
      const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisData = JSON.parse(jsonText);
    } catch (aiError) {
      console.error('AI analysis error:', aiError.message);
      return res.status(500).json({ success: false, message: 'Failed to analyze report. Please try again.' });
    }

    // Save to database
    const report = await HealthReport.create({
      userId: req.user?._id || null,
      sessionId: randomUUID(),
      fileName: req.file.originalname,
      fileType: 'pdf',
      extractedText: extractedText.slice(0, 5000),
      reportType: analysisData.reportType || 'general',
      analysis: {
        summary: analysisData.summary,
        abnormalValues: analysisData.abnormalValues || [],
        recommendations: analysisData.recommendations || [],
        urgency: analysisData.urgency || 'routine',
        fullAnalysis: analysisData.fullAnalysis
      },
      language
    });

    res.json({
      success: true,
      data: {
        reportId: report._id,
        fileName: report.fileName,
        reportType: report.reportType,
        analysis: report.analysis,
        createdAt: report.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Analyze report IN CONTEXT of ongoing chat conversation
// @route   POST /api/reports/analyze-with-context
// @access  Public
exports.analyzeReportWithContext = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file' });
    }

    const { conversationContext = '', language = 'en' } = req.body;
    const langNote = LANGUAGE_INSTRUCTIONS[language] || '';

    // Extract text from PDF
    let reportText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      reportText = pdfData.text;
    } catch {
      return res.status(422).json({ success: false, message: 'Could not read the PDF. Please ensure it is a text-based PDF, not a scanned image.' });
    }

    if (!reportText || reportText.trim().length < 30) {
      return res.status(422).json({ success: false, message: 'The PDF appears to be a scanned image. Please upload a text-based PDF report.' });
    }

    const prompt = `You are a medical AI analyzing a patient's test report in the full context of their symptom conversation.
${langNote}

PATIENT CONVERSATION HISTORY:
"""
${conversationContext.slice(0, 3000)}
"""

UPLOADED MEDICAL REPORT (${req.file.originalname}):
"""
${reportText.slice(0, 3500)}
"""

Using BOTH the conversation history (symptoms, timeline, risk factors, history) AND the lab/test report above, provide a thorough combined clinical assessment in plain language. Structure your response exactly as:

**📊 Report Findings**
[What the report shows — each abnormal/significant value explained in simple terms]

**🔗 How It Connects to Your Symptoms**
[How the report findings relate to the symptoms discussed in the conversation]

**✅ Diagnosis Assessment**
[Do the results confirm, partially support, or rule out the suspected diagnoses? State likelihood clearly]

**⚠️ Unexpected or Notable Findings**
[Anything in the report not anticipated from the conversation, if any]

**📋 Final Recommendation**
[Specific next steps — further tests if needed, medications to discuss with doctor, lifestyle changes, urgency]

**🏥 When to Go to Hospital Immediately**
[List red-flag findings from the report that need urgent attention]

---
*This is an AI analysis combining your symptoms and report. Please share this with your doctor for a confirmed diagnosis and treatment plan. Emergency: 112*`;

    let combinedAnalysis = '';
    try {
      const completion = await openrouter.chat.completions.create({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.3
      });
      combinedAnalysis = completion.choices[0].message.content;
    } catch (aiError) {
      console.error('AI analysis error:', aiError.message);
      return res.status(500).json({ success: false, message: 'Failed to analyze report. Please try again.' });
    }

    // Save to DB
    await HealthReport.create({
      userId: req.user?._id || null,
      sessionId: randomUUID(),
      fileName: req.file.originalname,
      fileType: 'pdf',
      extractedText: reportText.slice(0, 5000),
      reportType: 'contextual',
      analysis: {
        summary: combinedAnalysis.slice(0, 500),
        abnormalValues: [],
        recommendations: [],
        urgency: 'routine',
        fullAnalysis: combinedAnalysis
      },
      language
    });

    res.json({ success: true, data: { combinedAnalysis, fileName: req.file.originalname } });
  } catch (error) {
    next(error);
  }
};

// @desc    Get report history for logged-in user
// @route   GET /api/reports/history
// @access  Private
exports.getReportHistory = async (req, res, next) => {
  try {
    const reports = await HealthReport.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-extractedText');

    res.json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report
// @route   GET /api/reports/:id
// @access  Private
exports.getReport = async (req, res, next) => {
  try {
    const report = await HealthReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    if (report.userId && report.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};
