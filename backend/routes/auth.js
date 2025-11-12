const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// In-memory user store (Replace with database in production)
const users = new Map();

// Mock user data for demo
users.set('9876543210', {
  id: uuidv4(),
  phone: '9876543210',
  name: 'राजेश कुमार',
  pin: bcrypt.hashSync('1234', 10),
  language: 'hi-IN',
  balance: 4250,
  accountNumber: 'ACC001234567890',
  voicePrint: null,
  createdAt: new Date()
});

users.set('9123456789', {
  id: uuidv4(),
  phone: '9123456789',
  name: 'ସୁନୀତା ପଟ୍ଟନାୟକ',
  pin: bcrypt.hashSync('5678', 10),
  language: 'or-IN',
  balance: 8500,
  accountNumber: 'ACC001234567891',
  voicePrint: null,
  createdAt: new Date()
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { phone, name, pin, language } = req.body;

    if (!phone || !name || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Phone, name, and PIN are required'
      });
    }

    if (users.has(phone)) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const userId = uuidv4();
    
    const newUser = {
      id: userId,
      phone,
      name,
      pin: hashedPin,
      language: language || 'hi-IN',
      balance: 1000, // Welcome bonus
      accountNumber: `ACC${Date.now()}`,
      voicePrint: null,
      createdAt: new Date()
    };

    users.set(phone, newUser);

    const token = jwt.sign(
      { id: userId, phone },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: newUser.id,
          phone: newUser.phone,
          name: newUser.name,
          language: newUser.language,
          accountNumber: newUser.accountNumber
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Login with phone and PIN
router.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Phone and PIN are required'
      });
    }

    const user = users.get(phone);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isValidPin = await bcrypt.compare(pin, user.pin);
    
    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          language: user.language,
          accountNumber: user.accountNumber,
          balance: user.balance
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Voice authentication (voiceprint)
router.post('/voice-auth', async (req, res) => {
  try {
    const { phone, voiceData } = req.body;

    if (!phone || !voiceData) {
      return res.status(400).json({
        success: false,
        error: 'Phone and voice data are required'
      });
    }

    const user = users.get(phone);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Mock voice authentication (In production, use actual voice biometrics)
    const voiceMatch = Math.random() > 0.3; // 70% success rate for demo

    if (!voiceMatch) {
      return res.status(401).json({
        success: false,
        error: 'Voice authentication failed'
      });
    }

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Voice authentication successful',
      data: {
        token,
        confidence: 0.85,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          language: user.language
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = users.get(decoded.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          language: user.language,
          accountNumber: user.accountNumber,
          balance: user.balance
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Export users map for other routes
router.getUserByPhone = (phone) => users.get(phone);
router.updateUser = (phone, updates) => {
  const user = users.get(phone);
  if (user) {
    users.set(phone, { ...user, ...updates });
    return users.get(phone);
  }
  return null;
};

module.exports = router;
module.exports.users = users;
