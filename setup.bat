@echo off
REM Voice Banking System - Quick Setup Script for Windows
REM This script automates the initial setup process

echo ╔═══════════════════════════════════════════════════════╗
echo ║     🏦 Voice Banking System - Quick Setup             ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

REM Check Node.js installation
echo [1/7] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
echo ✅ Node.js found: 
node --version
echo.

REM Check npm installation
echo [2/7] Checking npm installation...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found! Please install Node.js which includes npm
    pause
    exit /b 1
)
echo ✅ npm found:
npm --version
echo.

REM Check MongoDB installation
echo [3/7] Checking MongoDB installation...
where mongod >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB not found! You can install it later or use MongoDB Atlas
    echo    Download from: https://www.mongodb.com/try/download/community
) else (
    echo ✅ MongoDB found
    mongod --version
)
echo.

REM Install backend dependencies
echo [4/7] Installing backend dependencies...
cd backend
if not exist node_modules (
    echo Installing packages...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Backend dependencies installed
) else (
    echo ✅ Dependencies already installed
)
echo.

REM Setup environment file
echo [5/7] Setting up environment configuration...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo ✅ Created .env file from template
        echo ⚠️  IMPORTANT: Edit backend\.env and add your API keys!
        echo    - OPENAI_API_KEY (Required for voice features)
        echo    - TWILIO credentials (Optional for SMS/IVR)
        echo    - RAZORPAY credentials (Optional for payments)
    ) else (
        echo ❌ .env.example not found
    )
) else (
    echo ✅ .env file already exists
)
echo.

cd ..

REM Check if MongoDB is running
echo [6/7] Checking MongoDB status...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if %errorlevel% equ 0 (
    echo ✅ MongoDB is running
) else (
    echo ⚠️  MongoDB is not running
    echo    Start it with: net start MongoDB
    echo    Or download MongoDB Compass: https://www.mongodb.com/try/download/compass
)
echo.

REM Display next steps
echo [7/7] Setup Complete! 🎉
echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║              Next Steps                               ║
echo ╠═══════════════════════════════════════════════════════╣
echo ║                                                       ║
echo ║  1. Edit backend\.env and add your API keys:         ║
echo ║     - Get OpenAI key: https://platform.openai.com/   ║
echo ║     - Get Twilio (optional): https://twilio.com/     ║
echo ║                                                       ║
echo ║  2. Start MongoDB (if not running):                  ║
echo ║     net start MongoDB                                 ║
echo ║                                                       ║
echo ║  3. Start the backend server:                        ║
echo ║     cd backend                                        ║
echo ║     npm start                                         ║
echo ║                                                       ║
echo ║  4. Open frontend in browser:                        ║
echo ║     - Option A: Double-click frontend\index.html     ║
echo ║     - Option B: Use http server (recommended)        ║
echo ║       cd frontend                                     ║
echo ║       npx serve .                                     ║
echo ║                                                       ║
echo ║  5. Login with demo account:                         ║
echo ║     Phone: 9876543210                                ║
echo ║     PIN: 1234                                         ║
echo ║                                                       ║
echo ╚═══════════════════════════════════════════════════════╝
echo.
echo 📚 Documentation:
echo    - README.md - Complete project overview
echo    - SETUP_GUIDE.md - Detailed setup instructions
echo    - IMPLEMENTATION_SUMMARY.md - What's included
echo.
echo ⚠️  Remember to configure your .env file before starting!
echo.
pause
