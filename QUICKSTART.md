# 🚀 Quick Start Guide - Voice Banking System

Get the Voice Banking System running in **5 minutes**!

---

## Prerequisites

- Node.js (v18+)
- MongoDB (v6+)
- npm or yarn

---

## Step 1: Clone and Install (2 minutes)

```bash
# Clone repository
git clone <repository-url>
cd AI_Voice_based_Banking

# Install backend dependencies
cd backend
npm install
```

---

## Step 2: Configure Environment (1 minute)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file - minimal required configuration:
# MONGODB_URI=mongodb://localhost:27017/voice_banking
# JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
```

**Optional API Keys** (for full features):
- `OPENAI_API_KEY` - For actual voice processing (Whisper, GPT, TTS)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` - For SMS/IVR features
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` - For real payments

**Note:** System works in demo mode without these keys!

---

## Step 3: Start MongoDB (30 seconds)

```bash
# Linux/Mac
sudo systemctl start mongod

# Windows
net start MongoDB

# Docker
docker run -d -p 27017:27017 mongo

# Check if running
mongo --eval "db.version()"
```

---

## Step 4: Start Server (30 seconds)

```bash
# From backend directory
npm start
```

You should see:
```
✅ All environment variables validated successfully!
✅ MongoDB connected successfully
╔═══════════════════════════════════════════════════════╗
║     🏦 Voice Banking System - Rural India             ║
╠═══════════════════════════════════════════════════════╣
║  🚀 Server:      http://localhost:5000              ║
║  📱 Environment: development                          ║
║  🗣️  Languages:   9 regional languages               ║
╚═══════════════════════════════════════════════════════╝
```

---

## Step 5: Test API (1 minute)

### Option A: Use the Test Suite
```bash
# Open new terminal
cd backend
node test/api.test.js
```

### Option B: Manual Testing with cURL

**1. Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","pin":"1234"}'
```

Save the token from response!

**2. Get Balance:**
```bash
curl -X GET http://localhost:5000/api/banking/balance \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**3. Generate QR Code:**
```bash
curl -X POST http://localhost:5000/api/qrcode/generate \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"amount":100,"note":"Test payment"}'
```

---

## 🎉 Success! What's Next?

### Access the Frontend
```bash
# Open in browser
cd ../frontend
open index.html
# or use a local server
python -m http.server 8000
# Then open: http://localhost:8000
```

### Demo Accounts
- **Account 1:** 📱 9876543210 | 🔐 1234 | 💰 ₹4,250
- **Account 2:** 📱 9123456789 | 🔐 5678 | 💰 ₹8,500

### Try These Features

**1. Beneficiary Management:**
```bash
curl -X POST http://localhost:5000/api/advanced/beneficiary/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ramesh Kumar",
    "phone": "9123456789",
    "nickname": "Brother"
  }'
```

**2. Create Savings Goal:**
```bash
curl -X POST http://localhost:5000/api/advanced/savings-goal/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Bicycle",
    "targetAmount": 5000,
    "targetDate": "2024-12-31"
  }'
```

**3. Set Balance Alert:**
```bash
curl -X POST http://localhost:5000/api/advanced/alert/balance/set \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "threshold": 1000,
    "alertType": "low"
  }'
```

---

## 📋 All Available Endpoints

### Core Banking
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/banking/balance` - Check balance
- `POST /api/banking/transfer` - Transfer money
- `POST /api/banking/recharge` - Mobile recharge
- `GET /api/banking/transactions` - Transaction history

### Advanced Features
- `POST /api/advanced/beneficiary/*` - Manage beneficiaries
- `POST /api/advanced/scheduled-payment/*` - Recurring payments
- `POST /api/advanced/savings-goal/*` - Savings goals
- `POST /api/advanced/dispute/*` - Transaction disputes
- `POST /api/advanced/alert/*` - Balance alerts
- `POST /api/advanced/reminder/*` - Bill reminders
- `GET /api/advanced/analytics/*` - Transaction analytics
- `GET /api/advanced/statement/mini` - Mini statement

### QR Code Payments
- `POST /api/qrcode/generate` - Generate QR code
- `POST /api/qrcode/scan` - Scan QR code
- `POST /api/qrcode/pay` - Process payment
- `GET /api/qrcode/status/:id` - Payment status

### Voice & SMS
- `POST /api/voice/process` - Process voice command
- `POST /api/voice/tts` - Text-to-speech
- `GET /api/voice/languages` - Supported languages
- `POST /api/sms/process` - SMS command processing

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check MongoDB is running
mongo --eval "db.version()"

# Check port 5000 is available
lsof -i :5000

# Check .env file exists
ls -la .env
```

### "MongoDB connection failed"
```bash
# Start MongoDB
sudo systemctl start mongod

# Or use Docker
docker run -d -p 27017:27017 mongo
```

### "Invalid token" errors
```bash
# Make sure JWT_SECRET is set in .env
# and is at least 32 characters long
grep JWT_SECRET .env
```

### Port already in use
```bash
# Change port in .env file
echo "PORT=5001" >> .env

# Or kill process using port 5000
lsof -ti:5000 | xargs kill -9
```

---

## 🎯 Voice Commands (Multi-language)

### Hindi
- "मेरा बैलेंस बताओ" - Check balance
- "रमेश को 500 रुपये भेजो" - Send ₹500 to Ramesh
- "पिछले 5 लेनदेन सुनाओ" - Last 5 transactions
- "मोबाइल रिचार्ज करो" - Mobile recharge

### English
- "Tell me my balance" - Check balance
- "Send 500 rupees to Ramesh" - Transfer money
- "Show last 5 transactions" - Transaction history
- "Recharge my mobile" - Mobile recharge

### Odia
- "ମୋର ବାଲାନ୍ସ କହନ୍ତୁ" - Check balance
- "ରମେଶଙ୍କୁ 500 ଟଙ୍କା ପଠାନ୍ତୁ" - Send money

---

## 📚 Documentation

- **README.md** - Complete setup guide
- **FEATURES.md** - All 200+ features listed
- **ADVANCED_FEATURES.md** - New features documentation
- **BUGFIX_SUMMARY.md** - All bugs fixed
- **.env.example** - Environment variables guide

---

## 🔐 Security Notes

1. **Change default secrets** in production:
   - `JWT_SECRET` - Use strong random string
   - `ENCRYPTION_KEY` - 32+ character key

2. **Enable HTTPS** in production

3. **Set CORS_ORIGIN** to your frontend domain

4. **Use environment variables** - Never commit secrets

5. **Enable rate limiting** - Already configured!

---

## 💡 Tips

1. **Development Mode**: All features work without API keys in demo mode
2. **Test Suite**: Run `node test/api.test.js` to verify everything works
3. **Logs**: Check console for detailed error messages
4. **Documentation**: All features documented in ADVANCED_FEATURES.md
5. **Multi-language**: 9 Indian languages supported out of the box

---

## 🚦 Production Deployment

### 1. Environment Setup
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/voice_banking
JWT_SECRET=<strong-secret-minimum-32-chars>
OPENAI_API_KEY=<your-key>
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
CORS_ORIGIN=https://yourdomain.com
```

### 2. Process Manager
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name voice-banking

# Auto-restart on reboot
pm2 startup
pm2 save
```

### 3. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📞 Support

- 📧 Check documentation files in project root
- 🐛 GitHub Issues for bug reports
- 💬 GitHub Discussions for questions
- 📚 Complete API docs in ADVANCED_FEATURES.md

---

## ✅ Checklist

- [ ] Node.js and MongoDB installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] MongoDB running
- [ ] Server started successfully
- [ ] Test suite passes
- [ ] Demo accounts working
- [ ] Frontend accessible

---

**Ready to bank with your voice!** 🎤💰🏦

*Made with ❤️ for Rural India* 🇮🇳
