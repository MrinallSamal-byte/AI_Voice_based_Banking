const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const { users } = require('./auth');

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

// In-memory QR code payments
const qrPayments = new Map();

/**
 * Generate QR code for receiving payment
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { amount, note } = req.body;
    const user = users.get(req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate unique payment ID
    const paymentId = `QR${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // Create payment data
    const paymentData = {
      paymentId,
      recipientPhone: user.phone,
      recipientName: user.name,
      recipientAccount: user.accountNumber,
      amount: amount || null,
      note: note || '',
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // Store payment data
    qrPayments.set(paymentId, paymentData);

    // Generate QR code string (UPI format)
    const upiString = `upi://pay?pa=${user.accountNumber}@voicebank&pn=${encodeURIComponent(user.name)}&am=${amount || ''}&cu=INR&tn=${encodeURIComponent(note || 'Payment')}&tid=${paymentId}`;

    // Generate QR code image
    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      message: 'QR code generated successfully',
      data: {
        paymentId,
        qrCode: qrCodeDataURL,
        upiString,
        amount: amount || 'Any amount',
        expiresAt: paymentData.expiresAt,
        validFor: '15 minutes'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Scan and decode QR code
 */
router.post('/scan', authenticateToken, (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'QR data is required'
      });
    }

    // Parse UPI string
    const url = new URL(qrData);
    const params = new URLSearchParams(url.search);

    const paymentInfo = {
      recipientAccount: params.get('pa'),
      recipientName: decodeURIComponent(params.get('pn') || ''),
      amount: params.get('am') || null,
      currency: params.get('cu') || 'INR',
      note: decodeURIComponent(params.get('tn') || ''),
      transactionId: params.get('tid')
    };

    res.json({
      success: true,
      message: 'QR code scanned successfully',
      data: paymentInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Invalid QR code format'
    });
  }
});

/**
 * Process QR code payment
 */
router.post('/pay', authenticateToken, async (req, res) => {
  try {
    const { paymentId, amount, pin } = req.body;
    const sender = users.get(req.user.phone);

    if (!sender) {
      return res.status(404).json({
        success: false,
        error: 'Sender not found'
      });
    }

    // Validate inputs
    if (!paymentId || !amount || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Payment ID, amount, and PIN are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }

    // Get payment details
    const paymentData = qrPayments.get(paymentId);

    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Invalid or expired QR code'
      });
    }

    // Check if expired
    if (new Date() > paymentData.expiresAt) {
      return res.status(400).json({
        success: false,
        error: 'QR code has expired'
      });
    }

    // Check if already used
    if (paymentData.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'QR code already used'
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
    const recipient = users.get(paymentData.recipientPhone);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Process payment
    sender.balance -= amount;
    recipient.balance += amount;

    users.set(sender.phone, sender);
    users.set(recipient.phone, recipient);

    // Update payment status
    paymentData.status = 'completed';
    paymentData.completedAt = new Date();
    paymentData.senderPhone = sender.phone;
    paymentData.senderName = sender.name;
    paymentData.paidAmount = amount;

    const transactionId = `TXN${Date.now()}`;

    res.json({
      success: true,
      message: 'Payment successful',
      data: {
        transactionId,
        amount,
        recipient: recipient.name,
        recipientPhone: recipient.phone,
        newBalance: sender.balance,
        timestamp: paymentData.completedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get QR payment status
 */
router.get('/status/:paymentId', authenticateToken, (req, res) => {
  try {
    const { paymentId } = req.params;
    const paymentData = qrPayments.get(paymentId);

    if (!paymentData) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    const isExpired = new Date() > paymentData.expiresAt;
    
    res.json({
      success: true,
      data: {
        paymentId,
        status: isExpired && paymentData.status === 'pending' ? 'expired' : paymentData.status,
        amount: paymentData.paidAmount || paymentData.amount,
        recipient: paymentData.recipientName,
        createdAt: paymentData.createdAt,
        completedAt: paymentData.completedAt || null,
        expiresAt: paymentData.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's QR payment history
 */
router.get('/history', authenticateToken, (req, res) => {
  try {
    const userPhone = req.user.phone;
    const userPayments = [];

    // Get all payments where user is sender or recipient
    for (const [paymentId, payment] of qrPayments.entries()) {
      if (payment.recipientPhone === userPhone || payment.senderPhone === userPhone) {
        userPayments.push({
          paymentId,
          type: payment.recipientPhone === userPhone ? 'received' : 'sent',
          amount: payment.paidAmount || payment.amount,
          otherParty: payment.recipientPhone === userPhone ? payment.senderName : payment.recipientName,
          status: payment.status,
          timestamp: payment.completedAt || payment.createdAt
        });
      }
    }

    // Sort by timestamp
    userPayments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      success: true,
      data: {
        payments: userPayments.slice(0, 20), // Last 20 payments
        count: userPayments.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate static QR code for merchant
 */
router.post('/merchant/generate', authenticateToken, async (req, res) => {
  try {
    const { merchantName, shopName } = req.body;
    const user = users.get(req.user.phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const merchantId = `MERCH${Date.now()}`;

    // Generate static merchant QR code
    const upiString = `upi://pay?pa=${user.accountNumber}@voicebank&pn=${encodeURIComponent(merchantName || user.name)}&mc=5411&tid=${merchantId}`;

    const qrCodeDataURL = await QRCode.toDataURL(upiString, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2
    });

    res.json({
      success: true,
      message: 'Merchant QR code generated',
      data: {
        merchantId,
        qrCode: qrCodeDataURL,
        merchantName: merchantName || user.name,
        shopName: shopName || '',
        accountNumber: user.accountNumber,
        note: 'This is a static QR code. Customers can enter any amount.'
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
