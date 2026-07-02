# 🏥 MediScan - AI-Powered Health Assistant

**Team 111 - Hack the Future 2025**

MediScan is an innovative AI-powered web application that helps users understand potential health conditions based on their symptoms. Using advanced Natural Language Processing (NLP) and AI, MediScan provides personalized health insights, finds nearby hospitals, and offers intelligent medical guidance.

---

## 🌟 Features

### 1. **Dual AI Doctor System**
- **General AI Doctor**: Privacy-focused, no data storage, general health advice
- **Personal AI Doctor**: Memory-enabled, personalized recommendations based on health history

### 2. **Intelligent Symptom Analysis**
- Natural language symptom description
- AI-powered condition prediction with confidence levels
- Severity indicators and safe remedy suggestions

### 3. **Hospital Finder**
- Real-time Google Maps integration
- Find nearby hospitals with accurate locations
- View ratings, reviews, contact details, and directions
- Interactive map visualization with Leaflet.js

### 4. **User Dashboard**
- Track search history and health queries
- View conversation history
- Monitor health patterns over time
- Personal health analytics

### 5. **Modern UI/UX**
- Dark mode support
- Responsive design for all devices
- Conversational chat interface
- Real-time typing indicators

---

## 🛠️ Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript**
- **Leaflet.js** - Interactive maps
- **Firebase Authentication** - User management
- **Font Awesome** - Icons

### Backend
- **Node.js & Express.js** - API server
- **MongoDB Atlas** - Cloud database
- **Mongoose** - ODM for MongoDB

### AI & NLP
- **Google Gemini AI** - Advanced conversational AI
- **Python Flask** - NLP service
- **SerpAPI** - Google Maps integration

### APIs Used
- Google Gemini AI API
- SerpAPI (Google Maps)
- Firebase Authentication API

---

## 📁 Project Structure

```
MediScan/
├── frontend/               # Frontend application
│   ├── index.html         # Main application page
│   ├── auth.html          # Login/Signup page
│   ├── dashboard.html     # User dashboard
│   ├── styles.css         # Main stylesheet
│   ├── script.js          # Main JavaScript
│   ├── dashboard.js       # Dashboard functionality
│   └── firebase-config.js # Firebase configuration
│
├── backend/               # Backend API server
│   ├── server.js         # Express server
│   ├── package.json      # Node dependencies
│   ├── .env              # Environment variables
│   ├── controllers/      # Request handlers
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── profileController.js
│   │   ├── hospitalController.js
│   │   └── analyticsController.js
│   ├── models/           # MongoDB schemas
│   │   ├── User.js
│   │   ├── Conversation.js
│   │   ├── PatientProfile.js
│   │   ├── SearchHistory.js
│   │   └── Analytics.js
│   ├── routes/           # API routes
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── hospitalRoutes.js
│   │   └── analyticsRoutes.js
│   ├── services/         # Business logic
│   │   ├── aiService.js
│   │   └── hospitalService.js
│   └── middleware/       # Custom middleware
│       ├── authMiddleware.js
│       └── errorMiddleware.js
│
├── nlp-service/          # Python NLP service
│   ├── medical_nlp_service.py
│   ├── lightweight_service.py
│   ├── requirements.txt
│   └── README.md
│
├── start.sh              # Start all services (Mac/Linux)
├── start.bat             # Start all services (Windows)
├── stop.sh               # Stop all services (Mac/Linux)
├── stop.bat              # Stop all services (Windows)
└── README.md             # This file
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v14 or higher)
- **Python 3** (v3.8 or higher)
- **MongoDB Atlas** account
- **Firebase** project
- **Google Gemini AI** API key
- **SerpAPI** key

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/HTF25-Team-111.git
cd HTF25-Team-111
```

### Step 2: Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_atlas_connection_string

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google Maps API (SerpAPI)
GOOGLE_MAPS_API_KEY=your_serpapi_key

# JWT Secret (for session management)
JWT_SECRET=your_random_secret_key_here
```

### Step 3: NLP Service Setup

```bash
cd ../nlp-service
pip3 install -r requirements.txt
```

### Step 4: Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Email/Password** and **Google** authentication
3. Copy your Firebase config and update `frontend/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "your_api_key",
    authDomain: "your_project.firebaseapp.com",
    projectId: "your_project_id",
    storageBucket: "your_project.appspot.com",
    messagingSenderId: "your_sender_id",
    appId: "your_app_id"
};
```

### Step 5: MongoDB Setup

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a database named `MediScan`
3. Whitelist your IP address in Network Access
4. Copy the connection string to your `.env` file

---

## 🎯 Running the Application

### Option 1: Using Start Scripts (Recommended)

#### On Mac/Linux:
```bash
chmod +x start.sh stop.sh
./start.sh
```

#### On Windows:
```cmd
start.bat
```

### Option 2: Manual Start

#### Terminal 1 - NLP Service:
```bash
cd nlp-service
python3 medical_nlp_service.py
```

#### Terminal 2 - Backend:
```bash
cd backend
node server.js
```

#### Terminal 3 - Frontend:
```bash
cd frontend
python3 -m http.server 8000
```

### Access the Application

- **Main App**: http://localhost:8000/frontend/index.html
- **Login**: http://localhost:8000/frontend/auth.html
- **Dashboard**: http://localhost:8000/frontend/dashboard.html
- **Backend API**: http://localhost:3001/api
- **NLP Service**: http://localhost:5001

---

## 📱 Usage Guide

### 1. **Sign Up / Login**
- Navigate to the authentication page
- Create an account using email/password or Google
- Login to access personalized features

### 2. **Chat with AI Doctor**
- Choose between General or Personal AI Doctor
- Describe your symptoms in natural language
- Example: "I have a sharp headache, fever for 3 days, and body aches"
- Get AI-powered diagnosis and recommendations

### 3. **Find Nearby Hospitals**
- Go to "Find Hospitals" section
- Enter your location or use current location
- View hospitals on an interactive map
- Get directions, contact info, and ratings

### 4. **View Dashboard**
- Track your search history
- Review past conversations
- Monitor health patterns
- View analytics

---

## 🔑 Key API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/user/sync` - Sync Firebase user to MongoDB

### Chat
- `POST /api/chat/message` - Send message to AI doctor
- `GET /api/chat/history/:firebaseUid` - Get conversation history
- `DELETE /api/chat/conversation/:conversationId` - Delete conversation

### Profile
- `GET /api/profile/:firebaseUid` - Get user profile
- `POST /api/profile` - Create/Update profile
- `GET /api/profile/status` - Check profile status

### Hospitals
- `POST /api/hospitals/search` - Search nearby hospitals

### Analytics
- `GET /api/user/dashboard/:firebaseUid` - Get user dashboard data
- `POST /api/user/search-history` - Save search history

---

## 🎨 Features in Detail

### Dark Mode
- Toggle between light and dark themes
- Automatic color scheme adaptation
- Persistent theme preference

### Conversational AI
- Context-aware responses
- Medical knowledge base
- Symptom pattern recognition
- Severity assessment

### Hospital Search
- Real-time Google Maps data
- Accurate location and ratings
- Phone numbers and addresses
- One-click directions

### User Dashboard
- Search history tracking
- Conversation archive
- Health analytics
- Activity timeline

---

## 🔒 Security Features

- Firebase Authentication for secure user management
- Environment variables for sensitive data
- CORS configuration for API security
- Input validation and sanitization
- Secure MongoDB connections

---

## 🧪 Testing

### Backend Health Check
```bash
curl http://localhost:3001/api/health
```

### NLP Service Health Check
```bash
curl http://localhost:5001/health
```

---

## 🤝 Contributing Team Members

- **Team 111** - Hack the Future 2025
- [Add team member names and roles]

---

## 📄 License

This project is created for Hack the Future 2025 hackathon.

---

## 🙏 Acknowledgments

- **CBIT Open Source Community** for organizing HTF25
- **Google Gemini AI** for conversational AI capabilities
- **SerpAPI** for real-time Google Maps data
- **Firebase** for authentication services
- **MongoDB Atlas** for cloud database hosting

---

## 📞 Contact

For questions or support, please contact:
- **Email**: vvuppala9@gmail.com
- **Phone**: +91 7702185470
- **Location**: CBIT, Hyderabad

---

## ⚠️ Medical Disclaimer

**Important**: MediScan is for informational purposes only and does not replace professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

---

## 🚀 Future Enhancements

- [ ] Multi-language support
- [ ] Voice input for symptoms
- [ ] Prescription upload and analysis
- [ ] Health report generation
- [ ] Appointment booking integration
- [ ] Medicine reminder system
- [ ] Telemedicine integration
- [ ] Health insurance integration

---

**Built with ❤️ by Team 111 for Hack the Future 2025**
