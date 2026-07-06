@echo off
title Goddest Metals — Build EXE
color 0A

echo.
echo  ============================================================
echo   Goddest Metals Company — Build Windows EXE
echo  ============================================================
echo.

:: ── Check Node.js ────────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Node.js not found.
    echo  Download from: https://nodejs.org  (choose LTS)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js: %NODE_VER%

:: ── Move to project root ─────────────────────────────────────────────────────
cd /d "%~dp0"

:: ── Skip code signing (avoids the symlink/winCodeSign error) ─────────────────
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set CSC_LINK=
set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true

:: ── Install / update dependencies ────────────────────────────────────────────
echo.
echo  [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm install failed.
    pause & exit /b 1
)
echo  [1/3] Dependencies ready.

:: ── Build React frontend ─────────────────────────────────────────────────────
echo.
echo  [2/3] Building React UI...
call npx vite build
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Vite build failed.
    pause & exit /b 1
)
echo  [2/3] React UI built.

:: ── Package EXE ──────────────────────────────────────────────────────────────
echo.
echo  [3/3] Packaging into EXE (this takes 3-8 mins)...
echo.

:: Try portable first (simpler, no NSIS symlink issues)
call npx electron-builder --win portable --x64 --publish=never
if %errorlevel% equ 0 goto :success

:: If portable failed, try nsis
echo.
echo  Portable build failed, trying NSIS installer...
call npx electron-builder --win nsis --x64 --publish=never
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Build failed. See errors above.
    echo.
    echo  Try running this script as Administrator:
    echo  Right-click BUILD_EXE.bat ^> Run as administrator
    echo.
    pause & exit /b 1
)

:success
echo.
color 0A
echo  ============================================================
echo   BUILD COMPLETE!
echo.
echo   Your EXE is in the  dist-electron\  folder.
echo.
echo   PORTABLE: Goddest Metals 1.0.0.exe
echo      ^> Single file, no install needed. Copy and run anywhere.
echo.
echo   INSTALLER: Goddest Metals Setup 1.0.0.exe  (if built)
echo      ^> Installs with desktop shortcut.
echo  ============================================================
echo.

:: Open the output folder
start "" "%~dp0dist-electron"
pause
