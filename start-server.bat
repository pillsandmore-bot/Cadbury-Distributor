@echo off
title Cadbury Distributor Management & Tracking System (DMS)
color 0B
echo =========================================================================
echo       CADBURY DISTRIBUTOR MANAGEMENT & LIVE TRACKING SYSTEM (DMS)
echo =========================================================================
echo.
echo [1] Checking Node.js environment...
node -v
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH!
    pause
    exit /b 1
)

echo.
echo [2] Starting Cadbury DMS Server on http://localhost:3000 ...
echo Real-time Socket.IO and GPS Telemetry active.
echo.
npx tsx server.ts
pause
