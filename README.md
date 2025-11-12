# 🏦 Voice Banking System for Rural India

## 🌟 Overview

An AI-driven, voice-based banking system designed specifically for rural and semi-urban areas in India. This system enables users to perform complete banking operations using voice commands in their regional language, with support for offline/SMS fallback and IVR calling.

### ✨ Key Features

- 🗣️ **Multi-lingual Voice Banking** - Support for 9+ Indian languages (Hindi, Odia, Bengali, Tamil, Telugu, Kannada, Marathi, Gujarati, English)
- 🔐 **Voiceprint Authentication** - Biometric security using voice recognition
- 💰 **Complete Banking Operations** - Balance inquiry, money transfer, transaction history, mobile recharge
- 📱 **SMS Fallback** - Works offline with SMS commands
- 📞 **IVR Support** - Call-based banking for feature phones
- 🎯 **Accessibility First** - Designed for elderly and low-literacy users
- 🔒 **Bank-grade Security** - End-to-end encryption, PIN authentication, rate limiting
- 💳 **UPI Integration** - Real-time money transfers via UPI/IMPS

---

## 🎯 Target Users

- 👨‍🌾 Rural and semi-urban residents
- 👵 Elderly citizens with limited tech literacy
- 📵 Users with feature phones or low internet connectivity
- 🗣️ Regional language speakers
- ♿ Users requiring accessibility features

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Voice Banking System                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │   Frontend   │    │   Backend    │    │   Database   │ │
│  │   (Web/App)  │◄──►│  (Node.js)   │◄──►│  (MongoDB)   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                              │
│         ▼                    ▼                              │
│  ┌──────────────┐    ┌──────────────┐                     │
│  │ Voice Input  │    │   Services   │                     │
│  │  Recording   │    │              │                     │
│  └──────────────┘    └──────────────┘                     │
│                             │                              │
│         ┌───────────────────┼───────────────────┐         │
│         ▼                   ▼                   ▼         │
│  ┌────────────┐      ┌────────────┐     ┌────────────┐  │
│  │  Whisper   │      │    GPT     │     │   OpenAI   │  │
│  │ Speech API │      │  NLP Model │     │    TTS     │  │
│  └────────────┘      └────────────┘     └────────────┘  │
│         │                   │                   │         │
│         └───────────────────┴───────────────────┘         │
│                             │                              │
│                             ▼                              │
│                    ┌──────────────────┐                   │
│                    │  Payment Gateway │                   │
│                    │  (UPI/Razorpay)  │                   │
│                    └──────────────────┘                   │
│                                                             │
│  Alternative Channels:                                     │
│  ┌────────────┐           ┌────────────┐                 │
│  │    SMS     │           │    IVR     │                 │
│  │  (Twilio)  │           │  (Twilio)  │                 │
│  └────────────┘           └────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### Required Software
- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### API Keys Required
1. **OpenAI** - For Whisper (speech-to-text), GPT (NLP), and TTS
2. **Twilio** - For SMS and IVR support (optional)
3. **Razorpay** - For UPI/payment integration (optional)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd AI_Based_Banking_for_RemotAreas
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies (if using separate frontend)
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` in the backend folder:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Essential Configuration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/voice_banking
JWT_SECRET=your_secure_jwt_secret

# OpenAI API (Required for voice features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Twilio (Optional - for SMS/IVR)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Razorpay (Optional - for real payments)
RAZORPAY_KEY_ID=rzp_test_your_key
RAZORPAY_KEY_SECRET=your_secret

# Security
ENCRYPTION_KEY=your_32_character_encryption_key_here
SESSION_SECRET=your_session_secret
```

### 5. Start MongoDB

```bash
# On Windows
net start MongoDB

# On Linux/Mac
sudo systemctl start mongod
```

### 6. Run the Application

**Backend:**
```bash
cd backend
npm start
```

**Frontend (serve static files):**
```bash
cd frontend
# Open index.html in browser or use a local server
python -m http.server 8000
# or
npx serve .
```

---

## 📱 Usage

### Web Interface

1. Open `http://localhost:8000` in your browser
2. Select your preferred language
3. Login with demo credentials or register
4. Click the microphone icon and speak your command

### Voice Commands Examples

#### Hindi
- "Mera balance batao" → Check balance
- "Ramesh ko 500 rupees bhejo" → Transfer ₹500 to Ramesh
- "Pichli 5 transactions sunao" → Hear last 5 transactions
- "Mobile recharge karo" → Recharge mobile

#### Odia
- "Mora balance kaha" → Check balance
- "Ramesh ku 500 tanka pathao" → Transfer ₹500 to Ramesh

#### English
- "Tell me my balance" → Check balance
- "Send 500 rupees to Ramesh" → Transfer money

### SMS Commands

Send SMS to the system number (if Twilio configured):

```
BAL                    → Check balance
SEND 500 9876543210 1234  → Transfer ₹500 (PIN required)
TXN                    → Last transactions
RECH 100 9876543210 1234  → Recharge ₹100
HELP                   → Get help
```

### IVR (Phone Banking)

Call the system number and follow voice prompts:
- Press 1 for balance
- Press 2 to transfer money
- Press 3 for transaction history
- Press 4 for mobile recharge
- Press 0 for customer service

---

## 🔌 API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "9876543210",
  "name": "राजेश कुमार",
  "pin": "1234",
  "language": "hi-IN"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "9876543210",
  "pin": "1234"
}
```

### Voice Banking

#### Process Voice Command
```http
POST /api/voice/process
Authorization: Bearer <token>
Content-Type: multipart/form-data

audio: <audio file>
language: hi-IN
sessionId: <session-id>
```

### Banking Operations

#### Check Balance
```http
GET /api/banking/balance
Authorization: Bearer <token>
```

#### Transfer Money
```http
POST /api/banking/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientPhone": "9123456789",
  "amount": 500,
  "pin": "1234"
}
```

#### Get Transactions
```http
GET /api/banking/transactions?limit=10
Authorization: Bearer <token>
```

### SMS Banking

#### Process SMS Command
```http
POST /api/sms/process
Content-Type: application/json

{
  "phone": "9876543210",
  "message": "BAL"
}
```

---

## 🌍 Supported Languages

| Language | Code | Script | Status |
|----------|------|--------|--------|
| Hindi | hi-IN | देवनागरी | ✅ Full Support |
| Odia | or-IN | ଓଡ଼ିଆ | ✅ Full Support |
| Bengali | bn-IN | বাংলা | ✅ Full Support |
| Tamil | ta-IN | தமிழ் | ✅ Full Support |
| Telugu | te-IN | తెలుగు | ✅ Full Support |
| Kannada | kn-IN | ಕನ್ನಡ | ✅ Full Support |
| Marathi | mr-IN | मराठी | ✅ Full Support |
| Gujarati | gu-IN | ગુજરાતી | ✅ Full Support |
| English | en-IN | English | ✅ Full Support |

---

## 🔐 Security Features

1. **Multi-Factor Authentication**
   - PIN-based authentication
   - Optional voiceprint verification
   - Session management

2. **Data Security**
   - End-to-end encryption
   - AES-256-GCM encryption for sensitive data
   - Secure password hashing with bcrypt

3. **API Security**
   - Rate limiting (prevents abuse)
   - JWT token authentication
   - CSRF protection
   - Input sanitization
   - Helmet.js security headers

4. **Transaction Security**
   - PIN confirmation for all transactions
   - Daily transaction limits
   - Suspicious activity detection
   - Transaction logging

---

## 🧪 Testing

### Demo Accounts

```
Account 1:
Phone: 9876543210
PIN: 1234
Balance: ₹4,250
Language: Hindi

Account 2:
Phone: 9123456789
PIN: 5678
Balance: ₹8,500
Language: Odia
```

### Test Voice Commands

Use the built-in test suite:
```bash
cd backend
npm test
```

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongod --version
# Restart MongoDB service
sudo systemctl restart mongod
```

### Audio Recording Not Working
- Ensure microphone permissions are granted
- Use HTTPS for production (required for getUserMedia)
- Check browser console for errors

### OpenAI API Errors
- Verify API key is correct
- Check API usage limits
- Ensure sufficient credits

### Twilio SMS/IVR Issues
- Verify account SID and auth token
- Check phone number format (+country code)
- Ensure webhook URLs are publicly accessible

---

## 📊 Performance Optimization

1. **Caching**
   - NLP results cached for 5 minutes
   - TTS audio cached for 10 minutes
   - Voice recognition results cached

2. **Database Indexing**
   - Phone number indexed for fast lookups
   - Transaction history optimized with compound indexes

3. **API Optimization**
   - Request batching for multiple operations
   - Compression enabled
   - Connection pooling

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team & Support

For questions, issues, or support:
- 📧 Email: support@voicebanking.in
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

## 🙏 Acknowledgments

- OpenAI for Whisper, GPT, and TTS APIs
- Twilio for SMS and IVR infrastructure
- Razorpay for payment gateway
- MongoDB team for database support
- Open source community

---

## 🗺️ Roadmap

### Phase 1 (Current) ✅
- [x] Multi-lingual voice recognition
- [x] Basic banking operations
- [x] SMS fallback
- [x] IVR support
- [x] Voiceprint authentication

### Phase 2 (Upcoming) 🔄
- [ ] WhatsApp integration
- [ ] Offline mode with local storage
- [ ] Advanced fraud detection
- [ ] Loan application via voice
- [ ] Government scheme integration

### Phase 3 (Future) 📅
- [ ] AI financial advisor
- [ ] Crop insurance integration
- [ ] Marketplace integration
- [ ] Video KYC
- [ ] Multi-bank support

---

## 📞 Emergency Support

For critical issues during business hours:
- 📱 Helpline: 1800-XXX-XXXX (Toll-free)
- 💬 SMS: Send "HELP" to XXXXX
- 📧 Emergency Email: emergency@voicebanking.in

---

**Made with ❤️ for Rural India** 🇮🇳
