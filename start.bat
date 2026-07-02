@echo off
REM MediScan - Complete System Startup Script (Windows)
REM This script starts all three services: Frontend, Backend, and NLP Service
REM Firebase Authentication is cloud-based and doesn't require local startup

title MediScan - Starting All Services

echo ============================================
echo.
echo        🏥 MediScan AI Doctor 🏥
echo         Starting All Services
echo.
echo ============================================
echo.

REM Get the directory of the script
cd /d "%~dp0"

REM Check Firebase Configuration
echo [0/5] Checking Firebase Configuration...
echo.
findstr /C:"FIREBASE_API_KEY=AIza" backend\.env >nul
if %errorlevel% equ 0 (
    echo [OK] Firebase credentials configured
    echo [INFO] Firebase Authentication: Cloud-based, always available
) else (
    echo [WARNING] Firebase not configured in .env file
    echo [INFO] Authentication features will not work
    echo [TIP] Add Firebase credentials to backend\.env file
)
echo.

REM Check MongoDB Configuration
echo [0/5] Checking MongoDB Configuration...
echo.
findstr /C:"MONGODB_URI=mongodb" backend\.env >nul
if %errorlevel% equ 0 (
    echo [OK] MongoDB connection string configured
    findstr /C:"mongodb+srv://" backend\.env >nul
    if %errorlevel% equ 0 (
        echo [INFO] MongoDB Atlas: Cloud database detected
        echo [TIP] Ensure your IP is whitelisted in MongoDB Atlas Network Access
    ) else (
        echo [INFO] Local MongoDB detected
    )
) else (
    echo [WARNING] MongoDB URI not configured in .env file
    echo [ERROR] Database connection will fail!
    echo [TIP] Add MONGODB_URI to backend\.env file
)
echo.

REM Function to check if port is in use (via netstat)
REM We'll use inline checks instead

echo [1/5] Starting NLP Service (Port 5001)...
echo.

REM Check if port 5001 is already in use
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] NLP Service already running on port 5001
) else (
    echo Starting NLP Service...
    cd nlp-service
    start "MediScan NLP Service" /MIN cmd /c "..\\.venv\\Scripts\\python.exe lightweight_service.py"
    cd ..
    timeout /t 3 /nobreak >nul
    echo [OK] NLP Service started
)
echo.

echo [2/5] Starting Backend API (Port 3001)...
echo.

REM Check if port 3001 is already in use
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend already running on port 3001
) else (
    echo Starting Backend...
    cd backend
    start "MediScan Backend" /MIN cmd /c "npm start"
    cd ..
    echo Waiting for Backend to connect to MongoDB...
    timeout /t 8 /nobreak >nul
    echo [OK] Backend started
)
echo.

echo [3/5] Starting Frontend (Port 8000)...
echo.

REM Check if port 8000 is already in use
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend already running on port 8000
) else (
    echo Starting Frontend...
    cd frontend
    start "MediScan Frontend" /MIN cmd /c "python -m http.server 8000"
    cd ..
    timeout /t 2 /nobreak >nul
    echo [OK] Frontend started
)
echo.

echo ============================================
echo           Service Status Check
echo ============================================
echo.

REM Check Frontend
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend:     Running on http://localhost:8000
) else (
    echo [X] Frontend:     Not Running
)

REM Check Backend
netstat -ano | findstr ":3001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend:      Running on http://localhost:3001
) else (
    echo [X] Backend:      Not Running
)

REM Check NLP Service
netstat -ano | findstr ":5001" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] NLP Service:  Running on http://localhost:5001
) else (
    echo [X] NLP Service:  Not Running
)

REM Check Firebase Configuration
echo.
findstr /C:"FIREBASE_API_KEY=AIza" backend\.env >nul
if %errorlevel% equ 0 (
    echo [OK] Firebase:     Configured and ready ^(Cloud-based^)
    echo      Auth Page:    http://localhost:8000/auth.html
) else (
    echo [X] Firebase:     Not configured in .env file
)

REM Check MongoDB Configuration
echo.
findstr /C:"MONGODB_URI=mongodb" backend\.env >nul
if %errorlevel% equ 0 (
    findstr /C:"mongodb+srv://" backend\.env >nul
    if %errorlevel% equ 0 (
        echo [OK] MongoDB:      Configured
        echo      Type:        MongoDB Atlas ^(Cloud^)
        echo      Dashboard:   http://localhost:8000/dashboard.html
    ) else (
        echo [OK] MongoDB:      Configured
        echo      Type:        Local MongoDB
    )
) else (
    echo [X] MongoDB:      Not configured - Database unavailable!
)

echo.
echo ============================================
echo.
echo All services have been started!
echo.
echo Access your application:
echo    Main App:     http://localhost:8000 (requires login)
echo    Login Page:   http://localhost:8000/auth.html
echo    Sign Up:      http://localhost:8000/signup.html
echo    Dashboard:    http://localhost:8000/dashboard.html
echo    Test API:     http://localhost:8000/test-connection.html
echo.
echo Features Available:
echo    • Firebase Authentication (Login/Sign Up)
echo    • User Dashboard with Search History
echo    • MongoDB Data Storage
echo    • General AI Doctor (No registration needed)
echo    • Personal AI Doctor (Profile-based diagnosis)
echo    • Hospital Finder
echo    • Real-time Chat with Medical NLP
echo.
echo To stop all services: run stop.bat
echo.
echo ============================================
echo.

REM Open browser automatically
echo Opening MediScan in your default browser...
timeout /t 2 /nobreak >nul
start http://localhost:8000

echo.
echo Browser launched! If it doesn't open automatically,
echo visit: http://localhost:8000
echo.
