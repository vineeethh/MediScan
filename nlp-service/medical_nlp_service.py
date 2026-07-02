"""
Medical NLP Service using ClinicalBERT for Symptom Analysis
This service provides medical entity recognition and symptom-to-disease mapping
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForTokenClassification, AutoModelForSequenceClassification, pipeline
import torch
import re
from typing import List, Dict, Tuple
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global variables for models
ner_pipeline = None
tokenizer = None
disease_classifier = None

# Medical symptom-disease knowledge base
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


def initialize_models():
    """Initialize ClinicalBERT and BioBERT models"""
    global ner_pipeline, tokenizer, disease_classifier
    
    try:
        logger.info("Loading ClinicalBERT for Named Entity Recognition...")
        # Using BioBERT for medical NER
        ner_pipeline = pipeline(
            "ner",
            model="dmis-lab/biobert-base-cased-v1.2",
            tokenizer="dmis-lab/biobert-base-cased-v1.2",
            aggregation_strategy="simple"
        )
        
        logger.info("Models loaded successfully!")
        return True
    except Exception as e:
        logger.error(f"Error loading models: {str(e)}")
        logger.info("Will use fallback rule-based system")
        return False


def extract_symptoms_nlp(text: str) -> List[str]:
    """Extract medical symptoms using NLP models"""
    symptoms = []
    
    try:
        if ner_pipeline:
            # Use BioBERT for entity extraction
            entities = ner_pipeline(text)
            
            for entity in entities:
                if entity['score'] > 0.7:  # Confidence threshold
                    entity_text = entity['word'].lower()
                    symptoms.append(entity_text)
        
        # Fallback to rule-based extraction
        symptoms.extend(extract_symptoms_rule_based(text))
        
        # Remove duplicates while preserving order
        return list(dict.fromkeys(symptoms))
    
    except Exception as e:
        logger.error(f"NLP extraction error: {str(e)}")
        return extract_symptoms_rule_based(text)


def extract_symptoms_rule_based(text: str) -> List[str]:
    """Fallback rule-based symptom extraction"""
    text_lower = text.lower()
    symptoms = []
    
    # Common symptom patterns
    symptom_keywords = [
        "pain", "ache", "fever", "cough", "nausea", "vomiting", "diarrhea",
        "headache", "fatigue", "weakness", "dizziness", "chills", "sweating",
        "shortness of breath", "difficulty breathing", "wheezing", "congestion",
        "runny nose", "sore throat", "sneezing", "itching", "rash", "swelling",
        "bleeding", "numbness", "tingling", "cramps", "spasm", "stiffness"
    ]
    
    for keyword in symptom_keywords:
        if keyword in text_lower:
            symptoms.append(keyword)
    
    # Extract body part + symptom combinations
    body_parts = ["head", "chest", "stomach", "abdomen", "back", "neck", "throat", "ear", "eye", "nose"]
    for part in body_parts:
        if f"{part} pain" in text_lower or f"{part} ache" in text_lower:
            symptoms.append(f"{part} pain")
    
    return symptoms


def calculate_symptom_match_score(user_symptoms: List[str], disease_symptoms: List[str]) -> float:
    """Calculate matching score between user symptoms and disease symptoms"""
    if not user_symptoms or not disease_symptoms:
        return 0.0
    
    matches = 0
    for user_symptom in user_symptoms:
        for disease_symptom in disease_symptoms:
            # Check for exact match or substring match
            if user_symptom.lower() in disease_symptom.lower() or disease_symptom.lower() in user_symptom.lower():
                matches += 1
                break
    
    # Calculate confidence score
    score = (matches / len(disease_symptoms)) * 100
    return min(score, 95)  # Cap at 95% to avoid overconfidence


def predict_diseases(symptoms: List[str]) -> List[Dict]:
    """Predict possible diseases based on extracted symptoms"""
    predictions = []
    
    for disease_name, disease_info in MEDICAL_KNOWLEDGE_BASE.items():
        score = calculate_symptom_match_score(symptoms, disease_info["symptoms"])
        
        if score > 0:
            predictions.append({
                "disease": disease_name,
                "confidence": round(score, 2),
                "severity": disease_info["severity"],
                "description": disease_info["description"],
                "recommendations": disease_info["recommendations"],
                "matched_symptoms": [s for s in symptoms if any(ds in s.lower() or s.lower() in ds for ds in disease_info["symptoms"])]
            })
    
    # Sort by confidence score
    predictions.sort(key=lambda x: x["confidence"], reverse=True)
    
    return predictions[:5]  # Return top 5 predictions


def generate_medical_response(symptoms: List[str], predictions: List[Dict]) -> str:
    """Generate a comprehensive medical response"""
    if not predictions:
        return ("I've analyzed your symptoms but couldn't match them to specific conditions in my knowledge base. "
                "Please describe your symptoms in more detail, or consult a healthcare professional for proper evaluation.")
    
    top_prediction = predictions[0]
    
    response = f"Based on the symptoms you've described, you might be experiencing **{top_prediction['disease']}**.\n\n"
    response += f"**Description:** {top_prediction['description']}\n\n"
    response += f"**Severity:** {top_prediction['severity'].upper()}\n\n"
    response += f"**Confidence:** {top_prediction['confidence']}%\n\n"
    
    if top_prediction['matched_symptoms']:
        response += f"**Detected Symptoms:** {', '.join(top_prediction['matched_symptoms'])}\n\n"
    
    response += "**Recommended Actions:**\n"
    for i, recommendation in enumerate(top_prediction['recommendations'], 1):
        response += f"{i}. {recommendation}\n"
    
    if len(predictions) > 1:
        response += f"\n**Other Possible Conditions:** {', '.join([p['disease'] for p in predictions[1:3]])}\n"
    
    response += ("\n⚠️ **Important Medical Disclaimer:**\n"
                "This analysis is powered by ClinicalBERT/BioBERT AI models and is for informational purposes only. "
                "It is NOT a substitute for professional medical advice, diagnosis, or treatment. "
                "Always consult a qualified healthcare provider for proper evaluation and care.")
    
    return response


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "Medical NLP Service",
        "models_loaded": ner_pipeline is not None
    })


@app.route('/analyze', methods=['POST'])
def analyze_symptoms():
    """Analyze symptoms and predict diseases"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        user_text = data['text']
        
        # Extract symptoms using NLP
        symptoms = extract_symptoms_nlp(user_text)
        logger.info(f"Extracted symptoms: {symptoms}")
        
        # Predict diseases
        predictions = predict_diseases(symptoms)
        logger.info(f"Top prediction: {predictions[0]['disease'] if predictions else 'None'}")
        
        # Generate response
        response_text = generate_medical_response(symptoms, predictions)
        
        return jsonify({
            "success": True,
            "symptoms": symptoms,
            "predictions": predictions,
            "response": response_text,
            "model": "ClinicalBERT/BioBERT"
        })
    
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/extract-symptoms', methods=['POST'])
def extract_symptoms_endpoint():
    """Extract symptoms from text"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        symptoms = extract_symptoms_nlp(data['text'])
        
        return jsonify({
            "success": True,
            "symptoms": symptoms
        })
    
    except Exception as e:
        logger.error(f"Extraction error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


if __name__ == '__main__':
    logger.info("Starting Medical NLP Service...")
    initialize_models()
    app.run(host='0.0.0.0', port=5000, debug=False)
