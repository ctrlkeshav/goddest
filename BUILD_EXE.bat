@echo off
title Goddest Metals - Build EXE
color 0A

echo.
echo =====================================================
echo  Goddest Metals Company - Build Windows EXE
echo =====================================================
echo.

:: Disable code signing to avoid symlink errors
set CSC_IDENTITY_AUTO_DISCOVERY=false
set WIN_CSC_LINK=
set CSC_LINK=
set ELECTRON_BUILDER_ALLOW_UNRESOLVED_DEPENDENCIES=true

:: Move to the folder where this .bat file is located
cd /d "%~dp0"
echo Working in: %CD%
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js not found.
    echo Please install Node.js from https://nodejs.org
    echo Choose the LTS version.
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo Node.js found: %NODE_VER%
echo.

:: Step 1 - Install packages
echo [1/3] Installing packages...
echo.
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: npm install failed. See error above.
    echo.
    pause
    exit /b 1
)
echo.
echo [1/3] Packages installed OK.
echo.

:: Step 2 - Build React UI
echo [2/3] Building React UI...
echo.
call npx vite build
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Vite build failed. See error above.
    echo.
    pause
    exit /b 1
)

if not exist "dist\index.html" (
    color 0C
    echo.
    echo ERROR: dist\index.html was not created.
    echo Something went wrong with the Vite build.
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] React UI built OK.
echo.

:: Step 3 - Package EXE
echo [3/3] Packaging EXE - this takes 5 to 10 minutes...
echo Please wait and do not close this window.
echo.

call npx electron-builder --win portable --x64 --publish=never
if %errorlevel% neq 0 (
    color 0E
    echo.
    echo Portable build failed. Trying NSIS installer...
    echo.
    call npx electron-builder --win nsis --x64 --publish=never
    if %errorlevel% neq 0 (
        color 0C
        echo.
        echo ERROR: Both builds failed.
        echo.
        echo Try these fixes:
        echo  1. Right-click BUILD_EXE.bat and Run as Administrator
        echo  2. Go to Settings - System - For Developers - turn on Developer Mode
        echo  3. Delete dist-electron folder and try again
        echo.
        pause
        exit /b 1
    )
)

echo.
color 0A
echo =====================================================
echo  BUILD COMPLETE!
echo.
echo  Your EXE files are in the dist-electron folder.
echo.
echo  Portable EXE = copy anywhere and double-click to run
echo  Setup EXE    = installs like a normal Windows program
echo =====================================================
echo.

start "" "%~dp0dist-electron"
echo Opening dist-electron folder...
echo.
pause
