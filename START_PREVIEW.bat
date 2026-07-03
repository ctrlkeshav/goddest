@echo off
title Goddest Metals — Preview Launcher
color 0A

echo.
echo  ================================================
echo   Goddest Metals Company — Preview Mode
echo   Silver Transaction Management Software
echo  ================================================
echo.

:: ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Please download and install Node.js from:
    echo  https://nodejs.org  (LTS version recommended)
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js found: %NODE_VER%

:: ── Move into preview directory ───────────────────────────────────────────────
cd /d "%~dp0preview"

:: ── Install dependencies if node_modules is missing ──────────────────────────
if not exist "node_modules\" (
    echo.
    echo  Installing dependencies — this runs only once, please wait...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo  [ERROR] npm install failed. Check your internet connection and retry.
        pause
        exit /b 1
    )
    echo.
    echo  Dependencies installed successfully.
)

:: ── Launch Vite dev server ────────────────────────────────────────────────────
echo.
echo  Starting preview server...
echo  The app will open at:  http://localhost:3000
echo.
echo  Default login:  admin  /  admin123
echo.
echo  Press Ctrl+C in this window to stop the server.
echo  ------------------------------------------------
echo.

npx vite --port 3000 --open

pause
