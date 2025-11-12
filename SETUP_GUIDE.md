# 🚀 Quick Start Guide

## Step-by-Step Installation

### 1. Install Prerequisites

#### Install Node.js (v18+)
```bash
# Download from https://nodejs.org/
# Or use nvm (Node Version Manager)
nvm install 18
nvm use 18
```

#### Install MongoDB (v6+)
```bash
# Windows (with Chocolatey)
choco install mongodb

# Linux (Ubuntu/Debian)
sudo apt-get install -y mongodb-org

# Mac (with Homebrew)
brew tap mongodb/brew
brew install mongodb-community
```

### 2. Clone & Setup Project

```bash
# Clone repository
git clone <your-repo-url>
cd AI_Based_Banking_for_RemotAreas

# Install backend dependencies
cd backend
npm install

# Create .env file
cp .env.example .env
```

### 3. Configure Environment

Edit `backend/.env` and add your API keys:

#### Minimum Configuration (for testing):
```env
# Essential
PORT=5000
MONGODB_URI=mongodb://localhost:27017/voice_banking
JWT_SECRET=change_this_secret_key_in_production

# OpenAI (Required for voice features)
OPENAI_API_KEY=sk-your-api-key-here
```

#### Full Configuration (for production):
```env
# All settings as shown in .env.example
```

### 4. Get API Keys

#### OpenAI API Key (Required)
1. Go to https://platform.openai.com/
2. Sign up / Login
3. Navigate to API Keys section
4. Create new secret key
5. Copy and paste into `.env` as `OPENAI_API_KEY`

#### Twilio (Optional - for SMS/IVR)
1. Go to https://www.twilio.com/
2. Sign up for free trial
3. Get Account SID and Auth Token from console
4. Add to `.env`

#### Razorpay (Optional - for real payments)
1. Go to https://razorpay.com/
2. Sign up and create test account
3. Get API Key and Secret from dashboard
4. Add to `.env`

### 5. Start Services

#### Start MongoDB
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
# or
brew services start mongodb-community
```

#### Start Backend Server
```bash
cd backend
npm start

# Or in development mode with auto-reload
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║     🏦 Voice Banking System - Rural India             ║
╠═══════════════════════════════════════════════════════╣
║  🚀 Server:      http://localhost:5000                ║
║  📱 Environment: development                           ║
║  🗣️  Languages:   9 regional languages                ║
║  📞 IVR Support: Enabled                              ║
║  📧 SMS Backup:  Enabled                              ║
║  🔐 Voiceprint:  Enabled                              ║
╚═══════════════════════════════════════════════════════╝
```

### 6. Open Frontend

#### Option A: Direct File Access
```bash
# Simply open in browser
start frontend/index.html
# or
open frontend/index.html
```

#### Option B: Using HTTP Server (Recommended)
```bash
cd frontend

# Using Python
python -m http.server 8000

# Using Node.js
npx serve .

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000`

---

## 🧪 Testing the System

### 1. Test with Demo Account

Use these credentials:
```
Phone: 9876543210
PIN: 1234
```

### 2. Test Voice Commands

Click the microphone and say:
- **Hindi:** "Mera balance batao"
- **Odia:** "Mora balance kaha"
- **English:** "Tell me my balance"

### 3. Test SMS (if Twilio configured)

Send SMS:
```
BAL
```

### 4. Test API Directly

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","pin":"1234"}'

# Check Balance (replace TOKEN)
curl -X GET http://localhost:5000/api/banking/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ⚙️ Configuration Options

### Language Settings

Supported languages can be modified in `.env`:
```env
SUPPORTED_LANGUAGES=hi-IN,or-IN,bn-IN,ta-IN,te-IN,kn-IN,mr-IN,gu-IN,en-IN
DEFAULT_LANGUAGE=hi-IN
```

### Security Settings

```env
# Voiceprint authentication threshold (0.0-1.0)
VOICEPRINT_THRESHOLD=0.85

# Rate limiting
RATE_LIMIT_WINDOW=15      # minutes
RATE_LIMIT_MAX_REQUESTS=100

# Transaction limits
MIN_TRANSACTION_AMOUNT=1
MAX_TRANSACTION_AMOUNT=50000
DAILY_TRANSACTION_LIMIT=100000
```

### Feature Flags

Enable/disable features:
```env
ENABLE_VOICEPRINT_AUTH=true
ENABLE_SMS_FALLBACK=true
ENABLE_IVR_SUPPORT=true
ENABLE_OFFLINE_MODE=true
```

---

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Failed
```
Solution: Ensure MongoDB is running
$ sudo systemctl status mongod
$ sudo systemctl start mongod
```

### Issue: OpenAI API Error 401
```
Solution: Check your API key in .env
- Verify key is correct
- Ensure no extra spaces
- Check API usage limits
```

### Issue: Microphone Not Working
```
Solution: 
1. Grant microphone permissions in browser
2. Use HTTPS (required for production)
3. Check browser console for errors
```

### Issue: Port Already in Use
```
Solution: Change port in .env
PORT=5001

Or kill process using the port:
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill
```

---

## 📱 Mobile Testing

### Testing on Mobile Device

1. Find your local IP:
```bash
# Windows
ipconfig

# Linux/Mac
ifconfig
```

2. Update CORS in `.env`:
```env
CORS_ORIGIN=http://192.168.x.x:8000
```

3. Access from mobile:
```
http://192.168.x.x:8000
```

---

## 🚀 Deployment

### Deploy to Production

#### 1. Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create voice-banking-app

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set OPENAI_API_KEY=your_key

# Deploy
git push heroku main
```

#### 2. AWS EC2
```bash
# SSH into EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update
sudo apt install nodejs npm mongodb

# Clone and setup
git clone <repo>
cd AI_Based_Banking_for_RemotAreas/backend
npm install

# Start with PM2
sudo npm install -g pm2
pm2 start server.js
pm2 startup
pm2 save
```

#### 3. Docker
```bash
# Build image
docker build -t voice-banking .

# Run container
docker run -p 5000:5000 -e MONGODB_URI=your_uri voice-banking
```

---

## 📊 Monitoring & Logs

### View Logs
```bash
# Backend logs
tail -f backend/logs/app.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Monitor Performance
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js

# Monitor
pm2 monit
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change all default secrets in `.env`
- [ ] Enable HTTPS with SSL certificate
- [ ] Set strong JWT secret
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up database backups
- [ ] Configure firewall rules
- [ ] Enable logging and monitoring
- [ ] Review API key permissions
- [ ] Test security vulnerabilities

---

## 💡 Tips & Best Practices

1. **Development**: Use `npm run dev` for auto-reload
2. **Testing**: Test with different accents and dialects
3. **Performance**: Enable caching for faster responses
4. **Security**: Regularly rotate API keys
5. **Backup**: Setup automated database backups
6. **Monitoring**: Use PM2 or similar for process management

---

## 📚 Additional Resources

- [OpenAI Whisper Documentation](https://platform.openai.com/docs/guides/speech-to-text)
- [Twilio Voice API](https://www.twilio.com/docs/voice)
- [Razorpay API Docs](https://razorpay.com/docs/api/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## 🆘 Getting Help

If you encounter issues:

1. Check the [Troubleshooting](#-common-issues--solutions) section
2. Review logs for error messages
3. Search existing GitHub issues
4. Create new issue with:
   - Error message
   - Steps to reproduce
   - System information
   - Screenshots

---

**Happy Banking! 🏦** 🚀
