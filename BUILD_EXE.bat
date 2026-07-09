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
    echo  Download from: https://nodejs.org  (choose LTS v20)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  Node.js: %NODE_VER%
echo.

:: ── Move to project root ─────────────────────────────────────────────────────
cd /d "%~dp0"
echo  Working directory: %CD%
echo.

:: ── Disable code signing to avoid symlink errors ─────────────────────────────
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set CSC_LINK=
set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true
set DEBUG=electron-builder

:: ── Install dependencies ──────────────────────────────────────────────────────
echo  [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] npm install failed.
    pause & exit /b 1
)

:: Verify sql.js WASM file exists (required for packaged app)
if not exist "node_modules\sql.js\dist\sql-wasm.wasm" (
    color 0C
    echo  [ERROR] sql-wasm.wasm not found in node_modules.
    echo  Run: npm install sql.js
    pause & exit /b 1
)
echo  [1/3] Dependencies OK. WASM file found.
echo.

:: ── Build React UI ────────────────────────────────────────────────────────────
echo  [2/3] Building React UI (Vite)...
call npx vite build
if %errorlevel% neq 0 (
    color 0C
    echo  [ERROR] Vite build failed.
    pause & exit /b 1
)

:: Verify dist was created
if not exist "dist\index.html" (
    color 0C
    echo  [ERROR] dist\index.html not found after Vite build.
    pause & exit /b 1
)
echo  [2/3] React UI built. dist\index.html confirmed.
echo.

:: ── Package as portable EXE ───────────────────────────────────────────────────
echo  [3/3] Packaging into portable EXE...
echo  (This downloads Electron binaries on first run — may take 5-10 mins)
echo.

call npx electron-builder --win portable --x64 --publish=never
if %errorlevel% equ 0 goto :success

echo.
color 0E
echo  Portable build had issues. Trying NSIS installer instead...
color 0A
call npx electron-builder --win nsis --x64 --publish=never
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo  [ERROR] Build failed.
    echo.
    echo  Common fixes:
    echo    1. Run as Administrator (right-click ^> Run as admin)
    echo    2. Enable Developer Mode: Settings ^> System ^> For Developers
    echo    3. Delete dist-electron\ folder and try again
    echo.
    pause & exit /b 1
)

:success
echo.
color 0A
echo  ============================================================
echo   BUILD COMPLETE!
echo.
echo   Output folder:  dist-electron\
echo.
echo   Files created:
dir /b "%~dp0dist-electron\*.exe" 2>nul
echo.
echo   HOW TO USE:
echo   - Portable .exe: Copy anywhere and double-click to run
echo   - Setup .exe: Install it like any Windows program
echo  ============================================================
echo.

start "" "%~dp0dist-electron"
pause
