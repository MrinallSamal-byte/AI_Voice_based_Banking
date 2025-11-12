const express = require('express');
const router = express.Router();
const { users } = require('./auth');

// In-memory SMS queue (Replace with actual SMS service in production)
const smsQueue = [];

// SMS commands mapping
const smsCommands = {
  'BAL': 'balance',
  'BALANCE': 'balance',
  'TXN': 'transactions',
  'TRANS': 'transactions',
  'SEND': 'transfer',
  'PAY': 'transfer',
  'RECH': 'recharge',
  'HELP': 'help'
};

// Process SMS command
router.post('/process', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    const user = users.get(phone);

    if (!user) {
      return sendSMS(phone, 'User not registered. Please register first.');
      return res.json({
        success: true,
        message: 'SMS sent'
      });
    }

    // Parse SMS command
    const parts = message.trim().toUpperCase().split(' ');
    const command = parts[0];
    const intent = smsCommands[command];

    let response = '';

    switch(intent) {
      case 'balance':
        response = `Your account balance is ₹${user.balance}. Account: ${user.accountNumber}`;
        break;

      case 'transactions':
        response = `Last transaction: Sent ₹500 to Ramesh on ${new Date().toLocaleDateString()}. Balance: ₹${user.balance}`;
        break;

      case 'transfer':
        // Format: SEND <amount> <phone> <pin>
        if (parts.length >= 4) {
          const amount = parseInt(parts[1]);
          const recipientPhone = parts[2];
          const pin = parts[3];

          if (user.balance >= amount) {
            response = `Transfer of ₹${amount} to ${recipientPhone} initiated. You will receive confirmation shortly.`;
          } else {
            response = `Insufficient balance. Your balance is ₹${user.balance}.`;
          }
        } else {
          response = 'Invalid format. Use: SEND <amount> <phone> <pin>';
        }
        break;

      case 'recharge':
        // Format: RECH <amount> <number> <pin>
        if (parts.length >= 4) {
          const amount = parseInt(parts[1]);
          const mobileNumber = parts[2];
          
          if (user.balance >= amount) {
            response = `Recharge of ₹${amount} for ${mobileNumber} successful. New balance: ₹${user.balance - amount}`;
          } else {
            response = `Insufficient balance. Your balance is ₹${user.balance}.`;
          }
        } else {
          response = 'Invalid format. Use: RECH <amount> <number> <pin>';
        }
        break;

      case 'help':
        response = `Voice Banking SMS Commands:
BAL - Check balance
TXN - Last transaction
SEND <amt> <phone> <pin> - Transfer money
RECH <amt> <number> <pin> - Mobile recharge
HELP - This message`;
        break;

      default:
        response = `Unknown command. Send HELP for available commands.`;
    }

    // Send SMS response
    await sendSMS(phone, response);

    res.json({
      success: true,
      data: {
        command: intent,
        response: response
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send SMS notification
router.post('/send', async (req, res) => {
  try {
    const { phone, message, type = 'notification' } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    await sendSMS(phone, message, type);

    res.json({
      success: true,
      message: 'SMS sent successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Send transaction alert
router.post('/alert', async (req, res) => {
  try {
    const { phone, transaction } = req.body;

    if (!phone || !transaction) {
      return res.status(400).json({
        success: false,
        error: 'Phone and transaction details are required'
      });
    }

    const user = users.get(phone);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const message = formatTransactionAlert(transaction, user);
    await sendSMS(phone, message, 'alert');

    res.json({
      success: true,
      message: 'Alert sent successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get SMS history
router.get('/history/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    
    const userSMS = smsQueue.filter(sms => sms.phone === phone)
      .slice(-10)
      .reverse();

    res.json({
      success: true,
      data: {
        sms: userSMS,
        count: userSMS.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to send SMS
async function sendSMS(phone, message, type = 'notification') {
  // In production, integrate with Twilio, MSG91, or other SMS provider
  
  const sms = {
    id: `SMS${Date.now()}`,
    phone: phone,
    message: message,
    type: type,
    status: 'sent',
    timestamp: new Date()
  };

  smsQueue.push(sms);

  // Mock SMS sending (In production, use actual SMS API)
  console.log(`📱 SMS to ${phone}: ${message}`);

  // Simulate Twilio integration (commented for reference)
  /*
  if (process.env.TWILIO_ENABLED === 'true') {
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
  }
  */

  return sms;
}

// Helper function to format transaction alert
function formatTransactionAlert(transaction, user) {
  const { type, amount, recipient, sender, balance } = transaction;

  if (type === 'debit' || type === 'transfer') {
    return `Sent ₹${amount} to ${recipient}. New balance: ₹${balance}. TXN ID: ${transaction.id}`;
  } else if (type === 'credit') {
    return `Received ₹${amount} from ${sender}. New balance: ₹${balance}. TXN ID: ${transaction.id}`;
  } else if (type === 'recharge') {
    return `Mobile recharge of ₹${amount} successful. New balance: ₹${balance}. TXN ID: ${transaction.id}`;
  }

  return `Transaction completed. Amount: ₹${amount}. Balance: ₹${balance}`;
}

// IVR webhook (for interactive voice response)
router.post('/ivr/webhook', async (req, res) => {
  try {
    const { phone, digit, callSid } = req.body;

    // Handle IVR menu selections
    const ivrMenu = {
      '1': 'balance',
      '2': 'transactions',
      '3': 'transfer',
      '4': 'recharge',
      '9': 'help'
    };

    const intent = ivrMenu[digit];
    const user = users.get(phone);

    if (!user) {
      return res.json({
        success: true,
        action: 'say',
        message: 'User not registered. Please register first.'
      });
    }

    let message = '';

    switch(intent) {
      case 'balance':
        message = `Your account balance is Rupees ${user.balance}`;
        break;
      case 'transactions':
        message = 'Your last transaction was Rupees 500 sent to Ramesh';
        break;
      case 'help':
        message = 'Press 1 for balance, 2 for transactions, 3 for transfer, 4 for recharge';
        break;
      default:
        message = 'Invalid option. Please try again.';
    }

    res.json({
      success: true,
      action: 'say',
      message: message
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
