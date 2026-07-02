#!/bin/bash
# MediScan - Complete System Startup Script (macOS/Linux)
# This script starts all three services: Frontend, Backend, and NLP Service
# Firebase Authentication is cloud-based and doesn't require local startup

echo "============================================"
echo ""
echo "       🏥 MediScan AI Doctor 🏥"
echo "        Starting All Services"
echo ""
echo "============================================"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check Firebase Configuration
echo "[0/5] Checking Firebase Configuration..."
echo ""
if grep -q "FIREBASE_API_KEY=AIza" backend/.env 2>/dev/null; then
    echo "[OK] Firebase credentials configured"
    echo "[INFO] Firebase Authentication: Cloud-based, always available"
else
    echo "[WARNING] Firebase not configured in .env file"
    echo "[INFO] Authentication features will not work"
    echo "[TIP] Add Firebase credentials to backend/.env file"
fi
echo ""

# Check MongoDB Configuration
echo "[0/5] Checking MongoDB Configuration..."
echo ""
if grep -q "MONGODB_URI=mongodb" backend/.env 2>/dev/null; then
    echo "[OK] MongoDB connection string configured"
    if grep -q "mongodb+srv://" backend/.env; then
        echo "[INFO] MongoDB Atlas: Cloud database detected"
        echo "[TIP] Ensure your IP is whitelisted in MongoDB Atlas Network Access"
    else
        echo "[INFO] Local MongoDB detected"
    fi
else
    echo "[WARNING] MongoDB URI not configured in .env file"
    echo "[ERROR] Database connection will fail!"
    echo "[TIP] Add MONGODB_URI to backend/.env file"
fi
echo ""

# Start NLP Service
echo "[1/5] Starting NLP Service (Port 5001)..."
echo ""
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] NLP Service already running on port 5001"
else
    echo "Starting NLP Service..."
    cd nlp-service
    if [ -f "../.venv/bin/python" ]; then
        nohup ../.venv/bin/python lightweight_service.py > ../nlp-service.log 2>&1 &
    elif [ -f "../.venv/bin/python3" ]; then
        nohup ../.venv/bin/python3 lightweight_service.py > ../nlp-service.log 2>&1 &
    else
        nohup python3 lightweight_service.py > ../nlp-service.log 2>&1 &
    fi
    cd ..
    sleep 3
    echo "[OK] NLP Service started"
fi
echo ""

# Start Backend
echo "[2/5] Starting Backend API (Port 3001)..."
echo ""
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Backend already running on port 3001"
else
    echo "Starting Backend..."
    cd backend
    nohup npm start > ../backend.log 2>&1 &
    cd ..
    echo "Waiting for Backend to connect to MongoDB..."
    sleep 8
    echo "[OK] Backend started"
fi
echo ""

# Start Frontend
echo "[3/5] Starting Frontend (Port 8000)..."
echo ""
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Frontend already running on port 8000"
else
    echo "Starting Frontend..."
    nohup python3 -m http.server 8000 > frontend.log 2>&1 &
    sleep 2
    echo "[OK] Frontend started"
fi
echo ""

# Service Status Check
echo "============================================"
echo "          Service Status Check"
echo "============================================"
echo ""

# Check Frontend
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Frontend:     Running on http://localhost:8000"
else
    echo "[X] Frontend:     Not Running"
fi

# Check Backend
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] Backend:      Running on http://localhost:3001"
else
    echo "[X] Backend:      Not Running"
fi

# Check NLP Service
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "[OK] NLP Service:  Running on http://localhost:5001"
else
    echo "[X] NLP Service:  Not Running"
fi

# Check Firebase Configuration
echo ""
if grep -q "FIREBASE_API_KEY=AIza" backend/.env 2>/dev/null; then
    echo "[OK] Firebase:     Configured and ready (Cloud-based)"
    echo "     Auth Page:    http://localhost:8000/auth.html"
else
    echo "[X] Firebase:     Not configured in .env file"
fi

# Check MongoDB Configuration
echo ""
if grep -q "MONGODB_URI=mongodb" backend/.env 2>/dev/null; then
    if grep -q "mongodb+srv://" backend/.env; then
        echo "[OK] MongoDB:      Configured"
        echo "     Type:        MongoDB Atlas (Cloud)"
        echo "     Dashboard:   http://localhost:8000/dashboard.html"
    else
        echo "[OK] MongoDB:      Configured"
        echo "     Type:        Local MongoDB"
    fi
else
    echo "[X] MongoDB:      Not configured - Database unavailable!"
fi

echo ""
echo "============================================"
echo ""
echo "All services have been started!"
echo ""
echo "Access your application:"
echo "   Main App:     http://localhost:8000/frontend/index.html"
echo "   Login Page:   http://localhost:8000/frontend/auth.html"
echo "   Sign Up:      http://localhost:8000/frontend/signup.html"
echo "   Dashboard:    http://localhost:8000/frontend/dashboard.html"
echo "   Test API:     http://localhost:8000/frontend/test-connection.html"
echo ""
echo "Features Available:"
echo "   • Firebase Authentication (Login/Sign Up)"
echo "   • User Dashboard with Search History"
echo "   • MongoDB Data Storage"
echo "   • General AI Doctor (No registration needed)"
echo "   • Personal AI Doctor (Profile-based diagnosis)"
echo "   • Hospital Finder with Google Maps"
echo "   • Real-time Chat with Medical NLP"
echo ""
echo "To stop all services: ./stop.sh"
echo ""
echo "============================================"
echo ""

# Open browser automatically (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "Opening MediScan in your default browser..."
    sleep 2
    open http://localhost:8000/frontend/index.html
    echo ""
    echo "Browser launched!"
else
    echo "Please open your browser and visit:"
    echo "http://localhost:8000/frontend/index.html"
fi
echo ""
echo "============================================"
echo ""
