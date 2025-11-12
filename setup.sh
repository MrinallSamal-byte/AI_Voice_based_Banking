#!/bin/bash
# Voice Banking System - Quick Setup Script for Linux/Mac
# This script automates the initial setup process

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     🏦 Voice Banking System - Quick Setup             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js installation
echo "[1/7] Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js found:${NC}"
    node --version
else
    echo -e "${RED}❌ Node.js not found! Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi
echo ""

# Check npm installation
echo "[2/7] Checking npm installation..."
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✅ npm found:${NC}"
    npm --version
else
    echo -e "${RED}❌ npm not found! Please install Node.js which includes npm${NC}"
    exit 1
fi
echo ""

# Check MongoDB installation
echo "[3/7] Checking MongoDB installation..."
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB found${NC}"
    mongod --version | head -n 1
else
    echo -e "${YELLOW}⚠️  MongoDB not found! You can install it later or use MongoDB Atlas${NC}"
    echo "   Install: https://www.mongodb.com/try/download/community"
fi
echo ""

# Install backend dependencies
echo "[4/7] Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "Installing packages..."
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend dependencies installed${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependencies already installed${NC}"
fi
echo ""

# Setup environment file
echo "[5/7] Setting up environment configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from template${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANT: Edit backend/.env and add your API keys!${NC}"
        echo "   - OPENAI_API_KEY (Required for voice features)"
        echo "   - TWILIO credentials (Optional for SMS/IVR)"
        echo "   - RAZORPAY credentials (Optional for payments)"
    else
        echo -e "${RED}❌ .env.example not found${NC}"
    fi
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

cd ..

# Check if MongoDB is running
echo "[6/7] Checking MongoDB status..."
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠️  MongoDB is not running${NC}"
    echo "   Start it with: sudo systemctl start mongod"
    echo "   Or: brew services start mongodb-community (on Mac)"
fi
echo ""

# Display next steps
echo "[7/7] Setup Complete! 🎉"
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║              Next Steps                               ║"
echo "╠═══════════════════════════════════════════════════════╣"
echo "║                                                       ║"
echo "║  1. Edit backend/.env and add your API keys:         ║"
echo "║     - Get OpenAI key: https://platform.openai.com/   ║"
echo "║     - Get Twilio (optional): https://twilio.com/     ║"
echo "║                                                       ║"
echo "║  2. Start MongoDB (if not running):                  ║"
echo "║     sudo systemctl start mongod                       ║"
echo "║     # or: brew services start mongodb-community      ║"
echo "║                                                       ║"
echo "║  3. Start the backend server:                        ║"
echo "║     cd backend                                        ║"
echo "║     npm start                                         ║"
echo "║                                                       ║"
echo "║  4. Open frontend in browser:                        ║"
echo "║     - Option A: open frontend/index.html             ║"
echo "║     - Option B: Use http server (recommended)        ║"
echo "║       cd frontend                                     ║"
echo "║       python -m http.server 8000                      ║"
echo "║       # or: npx serve .                               ║"
echo "║                                                       ║"
echo "║  5. Login with demo account:                         ║"
echo "║     Phone: 9876543210                                ║"
echo "║     PIN: 1234                                         ║"
echo "║                                                       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📚 Documentation:"
echo "   - README.md - Complete project overview"
echo "   - SETUP_GUIDE.md - Detailed setup instructions"
echo "   - IMPLEMENTATION_SUMMARY.md - What's included"
echo ""
echo -e "${YELLOW}⚠️  Remember to configure your .env file before starting!${NC}"
echo ""
