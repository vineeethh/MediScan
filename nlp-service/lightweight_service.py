#!/usr/bin/env python3.12
"""
Lightweight Medical NLP Service
Uses rule-based medical NLP + LangChain RAG over Indian medical knowledge base.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import logging
import sys
import os

# RAG retriever (lazy-loaded so service starts even if Qdrant is temporarily unavailable)
_rag_available = False
try:
    sys.path.insert(0, os.path.dirname(__file__))
    from rag.retriever import retrieve_as_context
    _rag_available = True
    logging.getLogger(__name__).info("RAG retriever loaded successfully")
except Exception as _rag_err:
    logging.getLogger(__name__).warning(f"RAG retriever not available: {_rag_err}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Medical symptom-disease knowledge base (same as full version)
MEDICAL_KNOWLEDGE_BASE = {
    "Common Cold": {
        "symptoms": ["runny nose", "sneezing", "cough", "sore throat", "congestion", "nasal congestion", "stuffy nose", "headache"],
        "severity": "mild",
        "description": "A viral infection of the upper respiratory tract.",
        "recommendations": [
            "Rest and get plenty of sleep",
            "Stay hydrated with water and warm fluids",
            "Use saline nasal drops or spray",
            "Gargle with warm salt water for sore throat",
            "Take over-the-counter pain relievers if needed"
        ]
    },
    "Influenza": {
        "symptoms": ["fever", "high fever", "chills", "body aches", "fatigue", "muscle pain", "weakness", "dry cough", "headache"],
        "severity": "moderate",
        "description": "A contagious respiratory illness caused by influenza viruses.",
        "recommendations": [
            "Rest and avoid physical exertion",
            "Drink plenty of fluids",
            "Consider antiviral medications (consult doctor within 48 hours)",
            "Take fever reducers like acetaminophen or ibuprofen",
            "Stay home to avoid spreading infection"
        ]
    },
    "Migraine": {
        "symptoms": ["severe headache", "throbbing headache", "nausea", "vomiting", "light sensitivity", "photophobia", "sound sensitivity", "visual disturbances", "aura"],
        "severity": "moderate",
        "description": "Intense, debilitating headaches often accompanied by nausea and sensitivity.",
        "recommendations": [
            "Rest in a quiet, dark room",
            "Apply cold or warm compress to head/neck",
            "Stay hydrated",
            "Practice relaxation techniques",
            "Consult doctor for prescription medications"
        ]
    },
    "Gastroenteritis": {
        "symptoms": ["diarrhea", "nausea", "vomiting", "abdominal pain", "stomach cramps", "stomach pain", "upset stomach", "dehydration"],
        "severity": "moderate",
        "description": "Inflammation of the stomach and intestines, usually viral.",
        "recommendations": [
            "Stay hydrated with oral rehydration solutions",
            "Eat bland foods (BRAT diet: bananas, rice, applesauce, toast)",
            "Avoid dairy, caffeine, and fatty foods temporarily",
            "Rest as much as possible",
            "Seek medical attention if symptoms persist beyond 48 hours"
        ]
    },
    "Allergic Rhinitis": {
        "symptoms": ["sneezing", "itchy eyes", "watery eyes", "runny nose", "nasal congestion", "postnasal drip", "itchy nose"],
        "severity": "mild",
        "description": "Allergic reaction affecting the nose and eyes.",
        "recommendations": [
            "Avoid known allergens when possible",
            "Use antihistamines for symptom relief",
            "Keep windows closed during high pollen seasons",
            "Use air purifiers indoors",
            "Consider allergy testing and immunotherapy"
        ]
    },
    "Bronchitis": {
        "symptoms": ["persistent cough", "productive cough", "mucus", "phlegm", "chest discomfort", "fatigue", "shortness of breath", "wheezing"],
        "severity": "moderate",
        "description": "Inflammation of the bronchial tubes carrying air to the lungs.",
        "recommendations": [
            "Get plenty of rest",
            "Drink lots of fluids to thin mucus",
            "Use a humidifier",
            "Avoid smoke and irritants",
            "Consult doctor if symptoms worsen or persist"
        ]
    },
    "Anxiety Disorder": {
        "symptoms": ["anxiety", "worry", "nervousness", "panic", "restlessness", "rapid heartbeat", "sweating", "trembling", "difficulty concentrating"],
        "severity": "moderate",
        "description": "Excessive worry and fear that affects daily activities.",
        "recommendations": [
            "Practice deep breathing exercises",
            "Try meditation and mindfulness",
            "Regular physical exercise",
            "Maintain healthy sleep schedule",
            "Consider cognitive behavioral therapy (CBT)"
        ]
    },
    "Asthma": {
        "symptoms": ["wheezing", "shortness of breath", "chest tightness", "coughing", "difficulty breathing", "rapid breathing"],
        "severity": "moderate-severe",
        "description": "Chronic condition causing airway inflammation and breathing difficulties.",
        "recommendations": [
            "Use prescribed inhalers as directed",
            "Avoid asthma triggers (smoke, allergens)",
            "Monitor peak flow regularly",
            "Have emergency inhaler accessible",
            "Seek immediate help if severe symptoms occur"
        ]
    },
    "Urinary Tract Infection": {
        "symptoms": ["burning urination", "frequent urination", "urgency", "cloudy urine", "pelvic pain", "lower abdominal pain", "blood in urine"],
        "severity": "moderate",
        "description": "Bacterial infection affecting the urinary system.",
        "recommendations": [
            "Drink plenty of water",
            "Urinate frequently",
            "Consult doctor for antibiotic prescription",
            "Avoid irritants (caffeine, alcohol, spicy foods)",
            "Apply heating pad to lower abdomen for pain relief"
        ]
    },
    "Tension Headache": {
        "symptoms": ["dull headache", "pressure", "tight band around head", "neck pain", "shoulder tension", "mild to moderate pain"],
        "severity": "mild",
        "description": "Most common type of headache caused by muscle tension.",
        "recommendations": [
            "Take over-the-counter pain relievers",
            "Practice stress management techniques",
            "Apply heat or ice to neck and shoulders",
            "Improve posture",
            "Take regular breaks from screen time"
        ]
    }
}


def extract_symptoms(text):
    """Enhanced rule-based symptom extraction"""
    text_lower = text.lower()
    symptoms = []
    
    # Pattern matching for symptom phrases
    symptom_patterns = [
        r"(?:have|having|experiencing|feel|feeling|got)\s+(?:a\s+)?([^.,!?]+)",
        r"(?:my|i)\s+([^.,!?]+)\s+(?:hurt|hurts|ache|aches|pain)",
        r"(?:suffering from|dealing with)\s+([^.,!?]+)"
    ]
    
    for pattern in symptom_patterns:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            # Clean and add symptom
            symptom = match.strip()
            if len(symptom) > 3 and len(symptom) < 50:
                symptoms.append(symptom)
    
    # Check for direct symptom mentions
    symptom_keywords = [
        "fever", "cough", "headache", "nausea", "vomiting", "diarrhea",
        "pain", "ache", "fatigue", "weakness", "dizziness", "chills",
        "shortness of breath", "difficulty breathing", "wheezing",
        "congestion", "runny nose", "sore throat", "sneezing",
        "body aches", "muscle pain", "chest pain", "stomach pain",
        "abdominal pain", "back pain", "neck pain"
    ]
    
    for keyword in symptom_keywords:
        if keyword in text_lower:
            symptoms.append(keyword)
    
    return list(set(symptoms))  # Remove duplicates


def calculate_match_score(user_symptoms, disease_symptoms):
    """Calculate matching score"""
    if not user_symptoms or not disease_symptoms:
        return 0.0
    
    matches = 0
    for user_symptom in user_symptoms:
        for disease_symptom in disease_symptoms:
            if user_symptom.lower() in disease_symptom.lower() or disease_symptom.lower() in user_symptom.lower():
                matches += 1
                break
    
    score = (matches / len(disease_symptoms)) * 100
    return min(score, 95)


def predict_diseases(symptoms):
    """Predict diseases based on symptoms"""
    predictions = []
    
    for disease_name, disease_info in MEDICAL_KNOWLEDGE_BASE.items():
        score = calculate_match_score(symptoms, disease_info["symptoms"])
        
        if score > 0:
            predictions.append({
                "disease": disease_name,
                "confidence": round(score, 2),
                "severity": disease_info["severity"],
                "description": disease_info["description"],
                "recommendations": disease_info["recommendations"],
                "matched_symptoms": [s for s in symptoms if any(ds in s.lower() or s.lower() in ds for ds in disease_info["symptoms"])]
            })
    
    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    return predictions[:5]


def generate_response(symptoms, predictions):
    """Generate medical response"""
    if not predictions:
        return ("I couldn't match your symptoms to specific conditions. "
                "Please describe your symptoms in more detail or consult a healthcare professional.")
    
    top = predictions[0]
    response = f"Based on your symptoms, you might be experiencing **{top['disease']}**.\n\n"
    response += f"**Description:** {top['description']}\n\n"
    response += f"**Severity:** {top['severity'].upper()}\n\n"
    response += f"**Confidence:** {top['confidence']}% (Medical NLP Analysis)\n\n"
    
    if top['matched_symptoms']:
        response += f"**Detected Symptoms:** {', '.join(top['matched_symptoms'])}\n\n"
    
    response += "**Recommended Actions:**\n"
    for i, rec in enumerate(top['recommendations'], 1):
        response += f"{i}. {rec}\n"
    
    if len(predictions) > 1:
        response += f"\n**Other Possible Conditions:** {', '.join([p['disease'] for p in predictions[1:3]])}\n"
    
    response += ("\n⚠️ **Medical Disclaimer:** This analysis uses clinical medical NLP algorithms "
                "for informational purposes only. Always consult a qualified healthcare provider.")
    
    return response


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Medical NLP Service (Lightweight)",
        "rag_enabled": _rag_available
    })


@app.route('/retrieve', methods=['POST'])
def retrieve_context():
    """RAG endpoint — returns relevant medical context from Qdrant for a given query."""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({"error": "query field required"}), 400

        if not _rag_available:
            return jsonify({"success": False, "context": "", "error": "RAG not available"}), 503

        k = int(data.get('k', 3))
        context = retrieve_as_context(data['query'], k=k)
        return jsonify({"success": True, "context": context, "rag_used": True})
    except Exception as e:
        logger.error(f"RAG retrieve error: {e}")
        return jsonify({"success": False, "context": "", "error": str(e)}), 500


@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        symptoms = extract_symptoms(data['text'])
        logger.info(f"Extracted symptoms: {symptoms}")
        
        predictions = predict_diseases(symptoms)
        response_text = generate_response(symptoms, predictions)
        
        return jsonify({
            "success": True,
            "symptoms": symptoms,
            "predictions": predictions,
            "response": response_text,
            "model": "Clinical NLP (Rule-based)"
        })
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analyze-personal', methods=['POST'])
def analyze_personal():
    """Personalized analysis with patient profile"""
    try:
        data = request.get_json()
        if not data or 'text' not in data or 'profile' not in data:
            return jsonify({"error": "Text and profile required"}), 400
        
        symptoms = extract_symptoms(data['text'])
        profile = data['profile']
        
        logger.info(f"Personal analysis for age: {profile.get('age')}, gender: {profile.get('gender')}")
        logger.info(f"Extracted symptoms: {symptoms}")
        
        # Get base predictions
        predictions = predict_diseases(symptoms)
        
        # Adjust predictions based on profile
        adjusted_predictions = adjust_for_profile(predictions, profile)
        
        # Generate personalized response
        response_text = generate_personalized_response(symptoms, adjusted_predictions, profile)
        
        # Check if condition is severe
        severity_check = check_severity(adjusted_predictions, profile)
        
        return jsonify({
            "success": True,
            "symptoms": symptoms,
            "predictions": adjusted_predictions,
            "response": response_text,
            "severity": severity_check,
            "model": "Clinical NLP (Personalized)"
        })
    except Exception as e:
        logger.error(f"Error in personal analysis: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


def adjust_for_profile(predictions, profile):
    """Adjust disease predictions based on patient profile"""
    adjusted = []
    
    for pred in predictions:
        confidence = pred['confidence']
        risk_multiplier = 1.0
        notes = []
        
        # Age-based adjustments
        age = profile.get('age', 0)
        if age > 65:
            if pred['disease'] in ['Influenza', 'Bronchitis', 'Asthma']:
                risk_multiplier *= 1.2
                notes.append("Higher risk due to age")
        
        # Chronic conditions
        chronic_conditions = profile.get('chronicConditions', [])
        if chronic_conditions:
            for condition in chronic_conditions:
                if 'diabetes' in condition.lower() or 'heart' in condition.lower():
                    risk_multiplier *= 1.15
                    notes.append(f"Complicated by {condition}")
        
        # Lifestyle factors
        if profile.get('smokingIntensity') in ['moderate', 'heavy']:
            if pred['disease'] in ['Bronchitis', 'Asthma']:
                risk_multiplier *= 1.3
                notes.append("Smoking increases risk")
        
        if profile.get('physicalActivity', {}).get('level') == 'sedentary':
            if pred['severity'] != 'mild':
                risk_multiplier *= 1.1
                notes.append("Sedentary lifestyle may worsen condition")
        
        # BMI considerations
        bmi = profile.get('bmi')
        if bmi and bmi > 30:
            if pred['disease'] in ['Asthma', 'Anxiety Disorder']:
                risk_multiplier *= 1.15
                notes.append("Obesity is a risk factor")
        
        # Adjust confidence
        adjusted_confidence = min(confidence * risk_multiplier, 95)
        
        adjusted.append({
            **pred,
            'confidence': round(adjusted_confidence, 2),
            'originalConfidence': confidence,
            'riskFactors': notes,
            'adjusted': risk_multiplier != 1.0
        })
    
    adjusted.sort(key=lambda x: x['confidence'], reverse=True)
    return adjusted


def check_severity(predictions, profile):
    """Determine if condition requires immediate attention"""
    if not predictions:
        return {"level": "unknown", "requiresHospital": False}
    
    top_prediction = predictions[0]
    severity = top_prediction.get('severity', 'moderate')
    confidence = top_prediction.get('confidence', 0)
    
    requires_hospital = False
    level = severity
    reasoning = []
    
    # High confidence severe conditions
    if severity in ['moderate-severe', 'severe'] and confidence > 70:
        requires_hospital = True
        reasoning.append("High confidence severe condition")
    
    # Check risk factors
    risk_factors = profile.get('riskFactors', [])
    high_risk_count = sum(1 for r in risk_factors if any(x in r.lower() for x in ['chronic', 'obesity', 'smoker']))
    
    if high_risk_count >= 2 and confidence > 60:
        requires_hospital = True
        reasoning.append("Multiple high-risk factors present")
    
    # Age considerations
    age = profile.get('age', 0)
    if age > 70 or age < 5:
        if severity != 'mild' and confidence > 50:
            requires_hospital = True
            reasoning.append("Vulnerable age group")
    
    return {
        "level": level,
        "requiresHospital": requires_hospital,
        "confidence": confidence,
        "reasoning": reasoning
    }


def generate_personalized_response(symptoms, predictions, profile):
    """Generate response tailored to patient profile"""
    if not predictions:
        return "I couldn't match your symptoms to specific conditions. Given your medical history, I recommend consulting your healthcare provider."
    
    top = predictions[0]
    
    # Personalized greeting
    age = profile.get('age', 0)
    gender = profile.get('gender', 'patient')
    
    response = f"Based on your symptoms and health profile (Age: {age}, Gender: {gender}), "
    response += f"you may be experiencing **{top['disease']}**.\n\n"
    
    response += f"**Description:** {top['description']}\n\n"
    response += f"**Confidence:** {top['confidence']}% "
    
    if top.get('adjusted'):
        response += f"(adjusted from {top['originalConfidence']}% based on your profile)\n\n"
    else:
        response += "\n\n"
    
    # Risk factors specific to patient
    if top.get('riskFactors'):
        response += f"**Personalized Risk Factors:**\n"
        for rf in top['riskFactors']:
            response += f"• {rf}\n"
        response += "\n"
    
    # Profile-aware recommendations
    response += "**Personalized Recommendations:**\n"
    for i, rec in enumerate(top['recommendations'], 1):
        response += f"{i}. {rec}\n"
    
    # Add lifestyle-specific advice
    if profile.get('smokingIntensity') in ['moderate', 'heavy']:
        response += "\n**Important:** Your smoking habit may significantly worsen your condition. Consider smoking cessation programs.\n"
    
    if profile.get('chronicConditions'):
        conditions = ', '.join(profile['chronicConditions'])
        response += f"\n**Note:** Given your chronic conditions ({conditions}), consult your regular physician before starting any new treatments.\n"
    
    if len(predictions) > 1:
        response += f"\n**Alternative Diagnoses:** {', '.join([p['disease'] for p in predictions[1:3]])}\n"
    
    response += ("\n⚠️ **Personalized Medical Disclaimer:**\n"
                "This analysis considers your health profile and is for informational purposes only. "
                "Given your medical history and current symptoms, we strongly recommend consulting "
                "your healthcare provider for proper evaluation and treatment.")
    
    return response


@app.route('/extract-symptoms', methods=['POST'])
def extract():
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        symptoms = extract_symptoms(data['text'])
        return jsonify({"success": True, "symptoms": symptoms})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    logger.info("Starting Lightweight Medical NLP Service...")
    app.run(host='0.0.0.0', port=5001, debug=False)
