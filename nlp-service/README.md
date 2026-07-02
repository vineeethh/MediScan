# Medical NLP Service

AI-powered symptom analysis using ClinicalBERT and BioBERT models.

## Features

- **Medical Named Entity Recognition (NER)** using BioBERT
- **Symptom Extraction** from natural language
- **Disease Prediction** with confidence scores
- **Medical Recommendations** based on symptoms
- **Knowledge Base** of 10+ common medical conditions

## Installation

```bash
cd nlp-service
pip install -r requirements.txt
```

## Running the Service

```bash
python medical_nlp_service.py
```

The service will start on `http://localhost:5000`

## API Endpoints

### 1. Health Check
```bash
GET /health
```

### 2. Analyze Symptoms
```bash
POST /analyze
Content-Type: application/json

{
  "text": "I have a severe headache, nausea, and sensitivity to light"
}
```

### 3. Extract Symptoms Only
```bash
POST /extract-symptoms
Content-Type: application/json

{
  "text": "I've been having chest pain and difficulty breathing"
}
```

## Models Used

- **BioBERT** (`dmis-lab/biobert-base-cased-v1.2`) - Medical NER
- **Rule-based fallback** for robust symptom extraction

## Medical Disclaimer

This service provides informational analysis only and is NOT a substitute for professional medical advice.
