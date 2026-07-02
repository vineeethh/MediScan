@echo off
REM MediScan - Stop All Services Script (Windows)
REM Note: Firebase is cloud-based and doesn't need to be stopped

title MediScan - Stopping All Services

echo ============================================
echo.
echo     Stopping all MediScan services...
echo.
echo ============================================
echo.

REM Stop Frontend (Port 8000)
echo Stopping Frontend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Frontend stopped
echo.

REM Stop Backend (Port 3001)
echo Stopping Backend (Port 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] Backend stopped
echo.

REM Stop NLP Service (Port 5001)
echo Stopping NLP Service (Port 5001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5001" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo [OK] NLP Service stopped
echo.

REM Kill processes by name (additional cleanup)
taskkill /F /IM python.exe /FI "WINDOWTITLE eq MediScan*" >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq MediScan*" >nul 2>&1

echo ============================================
echo.
echo All local services stopped successfully!
echo.
echo Note: Firebase Authentication is cloud-based
echo       and remains available at all times.
echo.
echo ============================================
echo.
