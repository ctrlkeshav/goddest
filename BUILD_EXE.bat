@echo off
title Goddest Metals — Build EXE Installer
color 0A

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║   Goddest Metals — Building Windows Installer (.exe)  ║
echo  ║   This will take 3-8 minutes. Please wait...          ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not found. Install from https://nodejs.org
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js: %NODE_VER%

:: ── Move to project root ─────────────────────────────────────────────────────
cd /d "%~dp0"

:: ── Install dependencies if needed ───────────────────────────────────────────
if not exist "node_modules\" (
    echo.
    echo  [1/3] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo  [ERROR] npm install failed.
        pause & exit /b 1
    )
)
echo  [1/3] Dependencies ready.

:: ── Build React frontend ─────────────────────────────────────────────────────
echo.
echo  [2/3] Building React frontend (Vite)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Vite build failed. Check the output above.
    pause & exit /b 1
)
echo  [2/3] Frontend built.

:: ── Package into EXE ─────────────────────────────────────────────────────────
echo.
echo  [3/3] Packaging into Windows installer EXE...
call npx electron-builder --win
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] electron-builder failed. Check the output above.
    pause & exit /b 1
)

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
color 0A
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║   BUILD COMPLETE!                                     ║
echo  ║                                                       ║
echo  ║   Your installer is in:  dist-electron\               ║
echo  ║   File: Goddest Metals Setup 1.0.0.exe               ║
echo  ║                                                       ║
echo  ║   Copy this .exe to any Windows PC and install!       ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.

:: Open the output folder
explorer dist-electron

pause
