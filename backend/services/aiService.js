const OpenAI = require('openai');
const axios = require('axios');

// Initialize OpenRouter client (OpenAI-compatible)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8000',
    'X-Title': 'MediScan'
  }
});

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

// NLP Service configuration
const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:5001';

// Supported languages
const LANGUAGE_INSTRUCTIONS = {
  en: '',
  hi: '🌐 LANGUAGE RULE — HIGHEST PRIORITY: You MUST respond ONLY in Hindi (हिंदी) for EVERY message. Do NOT use English words except for medical terms that have no Hindi equivalent. Write in simple, conversational Hindi.',
  ta: '🌐 LANGUAGE RULE — HIGHEST PRIORITY: You MUST respond ONLY in Tamil (தமிழ்) for EVERY message. Do NOT use English words except for medical terms that have no Tamil equivalent. Write in simple, conversational Tamil.',
  te: '🌐 LANGUAGE RULE — HIGHEST PRIORITY: You MUST respond ONLY in Telugu (తెలుగు) for EVERY message. Do NOT use English words except for medical terms that have no Telugu equivalent. Write in simple, conversational Telugu.'
};

// Disease database for symptom matching (fallback only)
const diseaseDatabase = [
  {
    name: "Common Cold",
    keywords: ["cold", "runny nose", "sneezing", "cough", "sore throat", "congestion", "stuffy nose"],
    description: "A viral infection of your nose and throat.",
    severity: "mild",
    remedies: [
      "Get plenty of rest",
      "Stay hydrated - drink lots of water and warm fluids",
      "Use a humidifier to ease congestion",
      "Gargle with warm salt water for sore throat",
      "Use over-the-counter decongestants if needed"
    ]
  },
  {
    name: "Influenza (Flu)",
    keywords: ["flu", "fever", "body aches", "fatigue", "chills", "headache", "high temperature"],
    description: "A contagious respiratory illness caused by influenza viruses.",
    severity: "moderate",
    remedies: [
      "Rest and stay home to avoid spreading",
      "Drink plenty of fluids",
      "Consider antiviral medications (consult doctor)",
      "Take fever reducers like paracetamol",
      "Monitor symptoms closely"
    ]
  },
  {
    name: "Migraine",
    keywords: ["severe headache", "migraine", "nausea", "light sensitivity", "photophobia", "throbbing pain"],
    description: "Intense, debilitating headaches often with nausea and light sensitivity.",
    severity: "moderate",
    remedies: [
      "Rest in a quiet, dark room",
      "Apply cold compress to forehead",
      "Stay hydrated",
      "Avoid triggers (bright lights, loud sounds)",
      "Consult a doctor for prescription medications"
    ]
  },
  {
    name: "Gastroenteritis (Stomach Flu)",
    keywords: ["stomach flu", "diarrhea", "vomiting", "nausea", "stomach pain", "cramps", "upset stomach"],
    description: "Inflammation of the stomach and intestines, usually caused by a viral infection.",
    severity: "moderate",
    remedies: [
      "Stay hydrated with water and ORS (oral rehydration salts)",
      "Rest your stomach - eat bland foods (khichdi, curd rice)",
      "Avoid dairy, caffeine, and fatty foods",
      "Rest as much as possible",
      "Seek medical attention if symptoms persist beyond 48 hours"
    ]
  },
  {
    name: "Allergies",
    keywords: ["allergies", "sneezing", "itchy eyes", "watery eyes", "runny nose", "congestion", "allergic"],
    description: "Immune system reaction to substances that are usually harmless.",
    severity: "mild",
    remedies: [
      "Avoid known allergens",
      "Use antihistamines for symptom relief",
      "Keep windows closed during high pollen seasons",
      "Use air purifiers indoors",
      "Consult an allergist for long-term relief"
    ]
  },
  {
    name: "Anxiety",
    keywords: ["anxiety", "panic", "worry", "nervous", "stress", "heart racing", "anxious", "restless"],
    description: "Feelings of worry, nervousness, or fear that affect daily activities.",
    severity: "moderate",
    remedies: [
      "Practice deep breathing exercises (pranayama)",
      "Try meditation or mindfulness",
      "Regular physical exercise",
      "Maintain a healthy sleep schedule",
      "Talk to a mental health professional"
    ]
  },
  {
    name: "Asthma",
    keywords: ["asthma", "wheezing", "shortness of breath", "difficulty breathing", "chest tightness"],
    description: "A condition affecting airways, causing breathing difficulties.",
    severity: "moderate",
    remedies: [
      "Use prescribed inhalers as directed",
      "Avoid asthma triggers",
      "Monitor peak flow regularly",
      "Keep emergency inhaler accessible",
      "Seek immediate help if symptoms worsen"
    ]
  }
];

const buildSystemPrompt = (exchangeCount) => {
  const canConclude = exchangeCount >= 9;

  return `You are MediScan's AI Doctor — a clinical history-taking AI for Indian patients.

━━━ NON-NEGOTIABLE SAFETY RULES ━━━
• ONLY respond to health/medical topics. For anything else say: "I'm a medical AI. Please describe your symptoms."
• NEVER give a definitive diagnosis. Use: "most likely", "could suggest", "consistent with"
• NEVER prescribe specific prescription drugs or dosages
• EMERGENCY (chest pain + sweating, stroke symptoms, can't breathe, severe bleeding, unconscious): respond ONLY with "🚨 Call 112 NOW and go to the nearest emergency hospital." — nothing else
• Mental health crisis / suicidal thoughts: "Please call iCall: 9152987821 (free, confidential)"
• Always end your final assessment by recommending an MBBS/MD doctor

━━━ THE SINGLE MOST IMPORTANT RULE ━━━
Ask EXACTLY ONE question per response — NEVER two questions in the same message.
WRONG ✗: "How old are you and what is your sex?"
WRONG ✗: "Where is the pain and how severe is it?"
RIGHT ✓: "How old are you?"  (then wait for answer, then ask one more)
RIGHT ✓: "On a scale of 1 to 10, how severe is the headache?"

After the patient answers, briefly acknowledge ("Got it.", "I see.", "Thank you.") then ask exactly one next question.

━━━ STEP-BY-STEP INTERVIEW ORDER ━━━

STEP 1 — Ask age:
"How old are you?"
(Wait for answer. Do not ask sex yet.)

STEP 2 — Ask biological sex:
"What is your biological sex — male or female?"
(Wait for answer. Do not ask anything else yet.)

STEP 3 — Patient has already stated their main complaint OR ask:
"What is the main symptom or health concern that brought you here today?"

STEP 4 — Ask symptom-specific follow-up questions ONE AT A TIME based on their complaint:

★ If complaint is HEADACHE → ask these questions, ONE per turn, in this order:
  Q-A: "Which part of your head is hurting — one side, both sides, forehead, back of head, or around your eyes?"
  Q-B: "How would you describe the pain — throbbing/pulsating, tight pressure/band, stabbing, or a constant dull ache?"
  Q-C: "On a scale of 1 to 10, how severe is the headache right now?"
  Q-D: "Do you have any nausea or vomiting along with the headache?"
  Q-E: "Does bright light or loud sounds make it worse?"
  Q-F: "Do you have any fever, or is your neck feeling stiff?"
  Q-G: "Have you noticed any changes in your vision — blurring, double vision, or flashes of light?"
  Q-H: "Do you have a past history of migraines, high blood pressure, or any other medical condition?"
  Q-I: "Are you currently taking any medications or painkillers for this?"

★ If complaint is FEVER → ask these ONE per turn:
  Q-A: "Have you measured your temperature? If yes, what was the reading?"
  Q-B: "When did the fever start, and is it constant or does it come and go?"
  Q-C: "Do you have any chills, shivering, or body aches?"
  Q-D: "Do you have any cough, cold, runny nose, or sore throat?"
  Q-E: "Do you have any rash anywhere on your body?"
  Q-F: "Any burning or pain when you urinate?"
  Q-G: "Have you travelled recently or been in contact with someone who was unwell?"
  Q-H: "Do you have any known medical conditions like diabetes or a weakened immune system?"
  Q-I: "Are you taking any medications currently?"

★ If complaint is STOMACH PAIN / ABDOMINAL PAIN → ask these ONE per turn:
  Q-A: "Where exactly is the pain — upper abdomen, lower abdomen, left side, right side, or all over?"
  Q-B: "How would you describe the pain — sharp, crampy, burning, or a dull constant ache?"
  Q-C: "Did the pain start suddenly or gradually over hours/days?"
  Q-D: "Do you have any nausea or vomiting?"
  Q-E: "Any changes in your bowel habits — loose stools, constipation, or diarrhoea?"
  Q-F: "Does the pain get better or worse after eating?"
  Q-G: "Any fever or chills?"
  Q-H: "Have you noticed any blood in your stool, or black/tarry stools?"
  Q-I: "Any history of acidity, ulcers, or previous abdominal issues?"

★ If complaint is COUGH → ask these ONE per turn:
  Q-A: "Is the cough dry, or are you bringing up phlegm/mucus?"
  Q-B: "If phlegm — what colour is it? (clear, white, yellow, green, or blood-tinged)"
  Q-C: "How long have you had this cough?"
  Q-D: "Any shortness of breath or wheezing along with the cough?"
  Q-E: "Any fever?"
  Q-F: "Any chest pain when you cough?"
  Q-G: "Any unexplained weight loss, night sweats, or fatigue over the past few weeks?"
  Q-H: "Do you smoke, or are you frequently exposed to dust, smoke, or fumes?"
  Q-I: "Any known allergies or history of asthma?"

★ If complaint is CHEST PAIN →
  First check severity: "Is the chest pain severe, crushing, or does it spread to your arm, jaw, or back? And do you have sweating or difficulty breathing right now?"
  If YES to any → "🚨 Call 112 NOW. This could be a heart emergency. Do not wait."
  If NO → continue with ONE question at a time:
  Q-A: "Where exactly in your chest — left, right, centre, or under the breastbone?"
  Q-B: "How would you describe it — sharp, pressure/tightness, burning, or stabbing?"
  Q-C: "Is it constant or does it come and go? Does it get worse when you breathe deeply or press on the chest?"
  Q-D: "Any fever or cough?"
  Q-E: "Any history of acid reflux/acidity?"
  Q-F: "Any history of heart problems, high blood pressure, or diabetes?"

★ If complaint is JOINT PAIN / BODY ACHES → ask these ONE per turn:
  Q-A: "Which joint or joints are affected?"
  Q-B: "Is there any swelling, redness, or warmth over the joint?"
  Q-C: "Did it start after a fall or injury, or did it come on gradually by itself?"
  Q-D: "Is the joint stiff in the morning? If yes, how long does the stiffness last?"
  Q-E: "Any fever or recent infection?"
  Q-F: "Any history of gout, rheumatoid arthritis, or previous joint problems?"

★ If complaint is SKIN RASH → ask these ONE per turn:
  Q-A: "Where on the body is the rash — face, arms, legs, chest, back, or widespread?"
  Q-B: "Is it itchy, painful, or just there with no sensation?"
  Q-C: "Does it look like flat red patches, raised bumps, blisters, or peeling skin?"
  Q-D: "Any fever with the rash?"
  Q-E: "Have you used any new soap, cream, food, or medication recently?"
  Q-F: "Any known allergies?"

★ If complaint is URINARY SYMPTOMS → ask these ONE per turn:
  Q-A: "Is there a burning or painful sensation when you urinate?"
  Q-B: "Are you urinating much more frequently than usual?"
  Q-C: "Have you noticed any blood in your urine, or is it cloudy?"
  Q-D: "Any pain in your lower back, sides, or lower abdomen?"
  Q-E: "Any fever or chills?"
  Q-F: "Any history of kidney stones or urinary infections before?"

★ For ANY OTHER complaint → ask these general follow-ups ONE per turn:
  Q-A: "When exactly did this start — today, a few days ago, or longer?"
  Q-B: "Did it start suddenly or come on gradually?"
  Q-C: "On a scale of 1 to 10, how severe is it?"
  Q-D: "Do you have any other symptoms along with this? (fever, pain, nausea, dizziness, etc.)"
  Q-E: "What makes it better or worse?"
  Q-F: "Any past history of a similar problem or any chronic medical conditions?"
  Q-G: "Are you currently taking any medications?"

━━━ CURRENT EXCHANGE COUNT: ${exchangeCount} ━━━
${!canConclude
  ? `⛔ HARD STOP: Only ${exchangeCount} exchange${exchangeCount === 1 ? '' : 's'} completed. You MUST NOT give any assessment or conclusion yet. Look at the interview steps above — find the next question you haven't asked yet based on the patient's complaint, and ask ONLY that one question. Nothing else.`
  : `✅ ${exchangeCount} exchanges completed. Check if all critical questions for this specific complaint have been answered. If yes, produce the structured CLINICAL ASSESSMENT. If 1-2 key questions are still unanswered, ask ONE more.`}

━━━ FINAL ASSESSMENT (produce only when ✅ above AND all complaint-specific questions are covered) ━━━

---
📋 **CLINICAL ASSESSMENT**

**Patient:** [age] [sex] | **Complaint:** [chief complaint]

**Most Likely Diagnoses:**
1. [Diagnosis] — [specific reason from this patient's history]
2. [Diagnosis] — [specific reason]
3. [Diagnosis] — [specific reason]

**Recommended Tests:**
- [Test specific to this complaint]
- [Test 2]

**Immediate Management:**
- [Specific OTC / home care step for India]
- [Step 2]

**When to Go to Hospital Immediately:**
- [Red flag from this patient's history]
- [Red flag 2]

**Indian Context:**
- [OTC medication available at Indian pharmacies]
- [PHC / government hospital if relevant]

---
*⚕️ AI-generated for informational purposes only. Please consult a qualified MBBS/MD doctor. Emergency: 112*

━━━ TONE ━━━
Warm, empathetic, concise. One short acknowledgement, then one question. Never cold or dismissive.`;
};

// Unified prompt builder — no separate personal/general split


// Analyze symptoms using keyword matching (fallback)
exports.analyzeSymptoms = (messageText) => {
  const lowerMessage = messageText.toLowerCase();
  const matches = [];

  diseaseDatabase.forEach(disease => {
    let matchCount = 0;
    let matchedKeywords = [];

    disease.keywords.forEach(keyword => {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    });

    if (matchCount > 0) {
      matches.push({
        disease,
        matchCount,
        matchedKeywords,
        confidence: Math.min((matchCount / disease.keywords.length) * 100, 95)
      });
    }
  });

  matches.sort((a, b) => b.matchCount - a.matchCount);
  return matches.length > 0 ? matches : null;
};

// Call NLP service for advanced symptom analysis
const analyzeWithNLP = async (userMessage, patientProfile = null) => {
  try {
    const endpoint = patientProfile ? `${NLP_SERVICE_URL}/analyze-personal` : `${NLP_SERVICE_URL}/analyze`;
    const requestData = patientProfile
      ? { text: userMessage, profile: patientProfile }
      : { text: userMessage };

    const response = await axios.post(endpoint, requestData, { timeout: 10000 });

    if (response.data && response.data.success) {
      return {
        success: true,
        symptoms: response.data.symptoms,
        predictions: response.data.predictions,
        response: response.data.response,
        severity: response.data.severity,
        model: patientProfile ? 'Rule-based Medical NLP (Personalized)' : 'Rule-based Medical NLP'
      };
    }
    return { success: false };
  } catch (error) {
    console.log('NLP service not available, using AI fallback:', error.message);
    return { success: false };
  }
};

// Build the messages array for OpenRouter (shared by streaming and non-streaming)
// Fetch RAG context from Python NLP service (non-fatal — returns empty string on failure)
const retrieveRAGContext = async (query) => {
  try {
    const response = await axios.post(`${NLP_SERVICE_URL}/retrieve`, { query, k: 3 }, { timeout: 3000 });
    if (response.data.success && response.data.context) {
      return response.data.context;
    }
  } catch {
    // RAG unavailable — continue without context
  }
  return '';
};

const buildMessages = (userMessage, conversationHistory, doctorType, patientProfile, language = 'en', ragContext = '') => {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || '';

  // Count completed AI turns = number of exchanges done (excludes the current user message being sent now)
  const priorHistory = conversationHistory.filter(m => m.sender !== 'user' || m.text !== userMessage);
  const exchangeCount = priorHistory.filter(m => m.sender === 'bot').length;

  // Language override goes FIRST so it takes highest priority
  let sysPrompt = langInstruction ? `${langInstruction}\n\n` : '';
  sysPrompt += buildSystemPrompt(exchangeCount);

  if (ragContext) {
    sysPrompt += `\n\n===VERIFIED MEDICAL REFERENCE===\n${ragContext}\n===END REFERENCE===`;
  }

  if (patientProfile) {
    sysPrompt += `\n\n===PATIENT PROFILE (treat these as already collected — do NOT ask for them again)===\n`;
    if (patientProfile.age) sysPrompt += `Age: ${patientProfile.age}\n`;
    if (patientProfile.gender) sysPrompt += `Sex: ${patientProfile.gender}\n`;
    if (patientProfile.chiefComplaint) sysPrompt += `Chief Complaint: ${patientProfile.chiefComplaint}\n`;
    if (patientProfile.symptomDuration) sysPrompt += `Duration: ${patientProfile.symptomDuration}\n`;
    if (patientProfile.symptomSeverity) sysPrompt += `Severity: ${patientProfile.symptomSeverity}/10\n`;
    if (patientProfile.additionalSymptoms) sysPrompt += `Additional Symptoms: ${patientProfile.additionalSymptoms}\n`;
    if (patientProfile.previousTreatment) sysPrompt += `Previous Treatment: ${patientProfile.previousTreatment}\n`;
    if (patientProfile.bmi) sysPrompt += `BMI: ${patientProfile.bmi} (${patientProfile.bmiCategory})\n`;
    const conditions = patientProfile.chronicConditions?.length ? patientProfile.chronicConditions.join(', ') : 'None';
    sysPrompt += `Chronic Conditions: ${conditions}\n`;
    const allergies = patientProfile.allergies?.length ? patientProfile.allergies.join(', ') : 'None';
    sysPrompt += `Allergies: ${allergies}\n`;
    const meds = patientProfile.currentMedications?.length ? patientProfile.currentMedications.join(', ') : 'None';
    sysPrompt += `Current Medications: ${meds}\n===END PATIENT PROFILE===\n`;
  }

  const messages = [{ role: 'system', content: sysPrompt }];
  // Pass last 20 messages so the AI knows exactly what has been asked
  conversationHistory.slice(-20).forEach(msg => {
    messages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
  });
  messages.push({ role: 'user', content: userMessage });
  return messages;
};

// Streaming AI response — yields tokens one by one for SSE
exports.streamAIResponse = async function* (userMessage, conversationHistory = [], doctorType = 'general', patientProfile = null, language = 'en') {
  if (!process.env.OPENROUTER_API_KEY) {
    const fallback = await getFallbackResponse(userMessage, conversationHistory, doctorType, patientProfile);
    yield fallback.text;
    return;
  }

  const ragContext = await retrieveRAGContext(userMessage);
  const messages = buildMessages(userMessage, conversationHistory, doctorType, patientProfile, language, ragContext);
  const stream = await openrouter.chat.completions.create({
    model: OPENROUTER_MODEL,
    messages,
    max_tokens: 1200,
    temperature: 0.3,
    stream: true
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (token) yield token;
  }
};

// Get AI response using OpenRouter (non-streaming fallback)
exports.getAIResponse = async (userMessage, conversationHistory = [], doctorType = 'general', patientProfile = null, language = 'en') => {
  try {
    // Go directly to OpenRouter — NLP service bypassed to preserve clinical interview flow
    if (!process.env.OPENROUTER_API_KEY) {
      return await getFallbackResponse(userMessage, conversationHistory, doctorType, patientProfile);
    }

    const ragContext = await retrieveRAGContext(userMessage);
    const messages = buildMessages(userMessage, conversationHistory, doctorType, patientProfile, language, ragContext);
    const startTime = Date.now();

    const completion = await openrouter.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages,
      max_tokens: 1200,
      temperature: 0.3
    });

    const responseTime = Date.now() - startTime;
    const text = completion.choices[0].message.content;

    return {
      text,
      metadata: {
        responseTime,
        model: completion.model || OPENROUTER_MODEL,
        tokens: completion.usage?.total_tokens || text.split(/\s+/).length
      }
    };
  } catch (error) {
    console.error('OpenRouter API Error:', error.message);
    return await getFallbackResponse(userMessage, conversationHistory, doctorType, patientProfile);
  }
};

// Rule-based fallback when all AI services are unavailable
const getFallbackResponse = async (userMessage, conversationHistory, doctorType, patientProfile = null) => {
  const lowerMessage = userMessage.toLowerCase();

  const symptomMatches = exports.analyzeSymptoms(userMessage);

  if (symptomMatches && symptomMatches.length > 0) {
    const topMatch = symptomMatches[0];
    const disease = topMatch.disease;

    let response = '';

    if (doctorType === 'personal') {
      response = `I see you're experiencing symptoms that could be related to **${disease.name}**. `;
      if (patientProfile) {
        response += `Given your profile (age ${patientProfile.age}, ${patientProfile.gender}), here's what I'd recommend:\n\n`;
      }
      response += `**About ${disease.name}:**\n${disease.description}\n\n`;
      response += `**Recommended actions:**\n`;
      disease.remedies.slice(0, 3).forEach(remedy => { response += `• ${remedy}\n`; });
    } else {
      response = `Based on your symptoms, you might be experiencing **${disease.name}**.\n\n`;
      response += `**Description:** ${disease.description}\n\n`;
      response += `**Severity:** ${disease.severity.toUpperCase()}\n\n`;
      response += `**Recommended actions:**\n`;
      disease.remedies.forEach(remedy => { response += `• ${remedy}\n`; });
    }

    response += `\n⚠️ **Important:** This information is for educational purposes only. Please consult a qualified doctor (MBBS/MD) for proper diagnosis and treatment. For emergencies, call **112**.`;

    if (symptomMatches.length > 1 && doctorType !== 'personal') {
      response += `\n\n**Other possible conditions:** ${symptomMatches.slice(1, 3).map(m => m.disease.name).join(', ')}`;
    }

    return {
      text: response,
      analysis: {
        type: 'disease',
        conditions: symptomMatches.slice(0, 3).map(m => ({
          name: m.disease.name,
          confidence: m.confidence,
          severity: m.disease.severity
        }))
      },
      metadata: { responseTime: 50, model: 'rule-based', tokens: 0 }
    };
  }

  if (lowerMessage.match(/^(hi|hello|hey|good morning|good evening|greetings|namaste)/)) {
    const greeting = doctorType === 'personal'
      ? "Namaste! I'm your Personal AI Doctor. I'm here to discuss your health concerns and provide personalized guidance. What brings you here today?"
      : "Namaste! Welcome to MediScan. I'm here to provide general health information. How can I assist you today?";
    return {
      text: greeting,
      analysis: { type: 'greeting' },
      metadata: { responseTime: 20, model: 'rule-based', tokens: 0 }
    };
  }

  if (lowerMessage.includes('hospital') || lowerMessage.includes('clinic') || lowerMessage.includes('doctor near')) {
    return {
      text: "I can help you find nearby hospitals and clinics! Please use the Hospital Finder section where you can:\n\n• Use your current location\n• Search by address\n• View hospitals with ratings and contact info\n• Get directions\n\nYou can also visit your nearest PHC (Primary Health Centre) or government hospital for free consultations.",
      analysis: { type: 'hospital' },
      metadata: { responseTime: 30, model: 'rule-based', tokens: 0 }
    };
  }

  if (lowerMessage.match(/(chest pain|heart attack|can't breathe|severe bleeding|unconscious|suicide|stroke)/)) {
    return {
      text: "🚨 **EMERGENCY ALERT** 🚨\n\nThe symptoms you've described may require immediate medical attention. Please:\n\n1. **Call 112 (India Emergency) immediately**\n2. **Do not wait — go to the nearest hospital emergency**\n3. **If possible, have someone stay with you**\n\nThis is a medical emergency requiring immediate professional care.",
      analysis: { type: 'emergency' },
      metadata: { responseTime: 40, model: 'rule-based', tokens: 0 }
    };
  }

  return {
    text: "I understand you have a health concern. To help you better, could you please describe your symptoms in more detail?\n\n• What symptoms are you experiencing?\n• How long have you had these symptoms?\n• Is there any pain? If so, where and how severe?\n• Any other discomfort you've noticed?\n\nThe more details you provide, the better I can assist. Remember, this information is educational and not a substitute for professional medical advice. For emergencies, call **112**.",
    analysis: { type: 'general' },
    metadata: { responseTime: 35, model: 'rule-based', tokens: 0 }
  };
};

exports.getDiseaseInfo = (diseaseName) => {
  return diseaseDatabase.find(d => d.name.toLowerCase() === diseaseName.toLowerCase());
};

exports.getAllDiseases = () => diseaseDatabase;

module.exports = exports;
