const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { users } = require('./auth');

// In-memory transactions store
const transactions = new Map();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Get account balance
router.get('/balance', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: user.balance,
        accountNumber: user.accountNumber,
        name: user.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get transaction history
router.get('/transactions', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const userTransactions = Array.from(transactions.values())
      .filter(t => t.userId === user.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    res.json({
      success: true,
      data: {
        transactions: userTransactions,
        count: userTransactions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Transfer money
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { recipientPhone, amount, pin } = req.body;
    
    // Input validation
    if (!recipientPhone || !amount || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone, amount, and PIN are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Daily transfer limit check
    const dailyLimit = 50000;
    if (amount > dailyLimit) {
      return res.status(400).json({
        success: false,
        error: `Transfer amount exceeds daily limit of ₹${dailyLimit}`
      });
    }

    const sender = users.get(req.user.phone);

    if (!sender) {
      return res.status(404).json({
        success: false,
        error: 'Sender not found'
      });
    }

    // Verify PIN
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, sender.pin);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }

    // Check sufficient balance
    if (sender.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Get recipient
    const recipient = users.get(recipientPhone);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Process transaction
    sender.balance -= amount;
    recipient.balance += amount;

    users.set(sender.phone, sender);
    users.set(recipient.phone, recipient);

    // Create transaction records
    const transactionId = `TXN${Date.now()}`;
    
    const senderTransaction = {
      id: transactionId,
      userId: sender.id,
      type: 'debit',
      amount: amount,
      recipient: recipient.name,
      recipientPhone: recipient.phone,
      balance: sender.balance,
      timestamp: new Date(),
      status: 'completed'
    };

    const recipientTransaction = {
      id: transactionId,
      userId: recipient.id,
      type: 'credit',
      amount: amount,
      sender: sender.name,
      senderPhone: sender.phone,
      balance: recipient.balance,
      timestamp: new Date(),
      status: 'completed'
    };

    transactions.set(`${transactionId}_sender`, senderTransaction);
    transactions.set(`${transactionId}_recipient`, recipientTransaction);

    res.json({
      success: true,
      message: 'Transfer successful',
      data: {
        transactionId,
        amount,
        recipient: recipient.name,
        newBalance: sender.balance,
        timestamp: senderTransaction.timestamp
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mobile recharge
router.post('/recharge', authenticateToken, async (req, res) => {
  try {
    const { mobileNumber, amount, operator, pin } = req.body;
    
    // Input validation
    if (!mobileNumber || !amount || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Mobile number, amount, and PIN are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Validate mobile number format (10 digits)
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format'
      });
    }

    // Recharge amount limits
    if (amount < 10 || amount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Recharge amount must be between ₹10 and ₹10,000'
      });
    }

    const user = users.get(req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify PIN
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, user.pin);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }

    // Check sufficient balance
    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Process recharge
    user.balance -= amount;
    users.set(user.phone, user);

    // Create transaction
    const transactionId = `RECH${Date.now()}`;
    const transaction = {
      id: transactionId,
      userId: user.id,
      type: 'recharge',
      amount: amount,
      mobileNumber,
      operator,
      balance: user.balance,
      timestamp: new Date(),
      status: 'completed'
    };

    transactions.set(transactionId, transaction);

    res.json({
      success: true,
      message: 'Recharge successful',
      data: {
        transactionId,
        amount,
        mobileNumber,
        operator,
        newBalance: user.balance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get contacts for transfer
router.get('/contacts', authenticateToken, (req, res) => {
  try {
    const currentUser = users.get(req.user.phone);
    
    // Return all users except current user as potential contacts
    const contacts = Array.from(users.values())
      .filter(u => u.phone !== currentUser.phone)
      .map(u => ({
        name: u.name,
        phone: u.phone
      }));

    res.json({
      success: true,
      data: { contacts }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Request money
router.post('/request', authenticateToken, (req, res) => {
  try {
    const { fromPhone, amount, message } = req.body;
    const requester = users.get(req.user.phone);

    if (!requester) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const requestId = `REQ${Date.now()}`;

    res.json({
      success: true,
      message: 'Payment request sent',
      data: {
        requestId,
        amount,
        status: 'pending'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
