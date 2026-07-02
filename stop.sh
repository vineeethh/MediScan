#!/bin/bash
# MediScan - Stop All Services Script (macOS/Linux)
# Note: Firebase is cloud-based and doesn't need to be stopped

echo "============================================"
echo ""
echo "    Stopping all MediScan services..."
echo ""
echo "============================================"
echo ""

# Stop Frontend (Port 8000)
echo "Stopping Frontend (Port 8000)..."
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:8000 | xargs kill -9 2>/dev/null
    echo "[OK] Frontend stopped"
else
    echo "[INFO] Frontend not running"
fi
echo ""

# Stop Backend (Port 3001)
echo "Stopping Backend (Port 3001)..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    pkill -f "node.*server.js" 2>/dev/null
    echo "[OK] Backend stopped"
else
    echo "[INFO] Backend not running"
fi
echo ""

# Stop NLP Service (Port 5001)
echo "Stopping NLP Service (Port 5001)..."
if lsof -Pi :5001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    pkill -f "python.*lightweight_service.py" 2>/dev/null
    echo "[OK] NLP Service stopped"
else
    echo "[INFO] NLP Service not running"
fi
echo ""

# Additional cleanup for background processes
pkill -f "http.server 8000" 2>/dev/null
pkill -f "npm start" 2>/dev/null

echo "============================================"
echo ""
echo "All local services stopped successfully!"
echo ""
echo "Note: Firebase Authentication is cloud-based"
echo "      and remains available at all times."
echo ""
echo "============================================"
echo ""
