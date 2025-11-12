const express = require('express');
const router = express.Router();
const ivrService = require('../services/ivr');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * IVR Welcome - Initial call handler
 */
router.post('/welcome', async (req, res) => {
  try {
    const { language = 'hi-IN', phone } = req.query;

    console.log(`📞 IVR call from ${phone || 'unknown'} in ${language}`);

    // Generate welcome menu
    const twiml = ivrService.generateWelcomeMenu(language);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR welcome error:', error);
    res.status(500).send('Error processing call');
  }
});

/**
 * Process IVR menu selection
 */
router.post('/process', async (req, res) => {
  try {
    const { Digits, From, SpeechResult } = req.body;
    const digit = Digits || SpeechResult;
    const phone = From?.replace(/\D/g, '').slice(-10);

    console.log(`📞 IVR input: ${digit} from ${phone}`);

    // Get user data
    let userData = {};
    if (phone) {
      const user = await User.findOne({ phone });
      if (user) {
        const transactions = await Transaction.find({ userId: user._id })
          .sort({ createdAt: -1 })
          .limit(5);

        userData = {
          balance: user.balance,
          name: user.name,
          recentTransactions: transactions
        };
      }
    }

    const twiml = ivrService.generateMenuResponse(digit, 'hi-IN', userData);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('IVR process error:', error);
    res.status(500).send('Error processing input');
  }
});

/**
 * Transfer - Get amount
 */
router.post('/transfer/amount', async (req, res) => {
  try {
    const { Digits, From } = req.body;
    const recipientPhone = Digits;
    const senderPhone = From?.replace(/\D/g, '').slice(-10);

    const twiml = new (require('twilio').twiml.VoiceResponse)();

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      finishOnKey: '#',
      action: `/api/ivr/transfer/confirm?recipient=${recipientPhone}&sender=${senderPhone}`,
      method: 'POST'
    });

    gather.say(
      { language: 'hi-IN', voice: 'woman' },
      'कृपया राशि दर्ज करें, इसके बाद हैश दबाएं।'
    );

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Transfer amount error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Transfer - Confirm with PIN
 */
router.post('/transfer/confirm', async (req, res) => {
  try {
    const { Digits } = req.body;
    const { recipient, sender } = req.query;
    const amount = parseInt(Digits);

    const twiml = new (require('twilio').twiml.VoiceResponse)();

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      numDigits: 4,
      action: `/api/ivr/transfer/execute?recipient=${recipient}&sender=${sender}&amount=${amount}`,
      method: 'POST'
    });

    gather.say(
      { language: 'hi-IN', voice: 'woman' },
      `${amount} रुपये भेजने के लिए अपना 4 अंकों का पिन दर्ज करें।`
    );

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Transfer confirm error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Transfer - Execute
 */
router.post('/transfer/execute', async (req, res) => {
  try {
    const { Digits: pin } = req.body;
    const { recipient, sender, amount } = req.query;

    const twiml = new (require('twilio').twiml.VoiceResponse)();

    // Verify PIN and execute transfer
    const senderUser = await User.findOne({ phone: sender });
    
    if (!senderUser) {
      twiml.say(
        { language: 'hi-IN', voice: 'woman' },
        'उपयोगकर्ता नहीं मिला।'
      );
      twiml.redirect('/api/ivr/welcome');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    const bcrypt = require('bcryptjs');
    const pinValid = await bcrypt.compare(pin, senderUser.pin);

    if (!pinValid) {
      twiml.say(
        { language: 'hi-IN', voice: 'woman' },
        'गलत पिन। कृपया पुन: प्रयास करें।'
      );
      twiml.redirect('/api/ivr/welcome');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    if (senderUser.balance < amount) {
      twiml.say(
        { language: 'hi-IN', voice: 'woman' },
        `अपर्याप्त राशि। आपका बैलेंस ${senderUser.balance} रुपये है।`
      );
      twiml.redirect('/api/ivr/welcome');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Execute transfer
    senderUser.balance -= parseInt(amount);
    await senderUser.save();

    // Create transaction record
    const transaction = new Transaction({
      transactionId: `TXN${Date.now()}`,
      userId: senderUser._id,
      type: 'transfer',
      amount: parseInt(amount),
      balanceBefore: senderUser.balance + parseInt(amount),
      balanceAfter: senderUser.balance,
      recipient: { phone: recipient },
      status: 'success'
    });
    await transaction.save();

    twiml.say(
      { language: 'hi-IN', voice: 'woman' },
      `${amount} रुपये सफलतापूर्वक भेज दिए गए हैं। आपका नया बैलेंस ${senderUser.balance} रुपये है। धन्यवाद।`
    );

    // Send SMS confirmation
    await ivrService.sendCallSummary(
      sender,
      `Transfer of ₹${amount} to ${recipient} successful. New balance: ₹${senderUser.balance}`,
      'hi-IN'
    );

    twiml.hangup();

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Transfer execute error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Recharge - Get amount
 */
router.post('/recharge/amount', async (req, res) => {
  try {
    const { Digits } = req.body;
    const mobileNumber = Digits;

    const twiml = new (require('twilio').twiml.VoiceResponse)();

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      finishOnKey: '#',
      action: `/api/ivr/recharge/confirm?mobile=${mobileNumber}`,
      method: 'POST'
    });

    gather.say(
      { language: 'hi-IN', voice: 'woman' },
      'कृपया रिचार्ज राशि दर्ज करें, इसके बाद हैश दबाएं।'
    );

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Recharge amount error:', error);
    res.status(500).send('Error');
  }
});

/**
 * Recharge - Confirm
 */
router.post('/recharge/confirm', async (req, res) => {
  try {
    const { Digits, From } = req.body;
    const { mobile } = req.query;
    const amount = parseInt(Digits);
    const phone = From?.replace(/\D/g, '').slice(-10);

    const twiml = new (require('twilio').twiml.VoiceResponse)();

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      numDigits: 4,
      action: `/api/ivr/recharge/execute?mobile=${mobile}&phone=${phone}&amount=${amount}`,
      method: 'POST'
    });

    gather.say(
      { language: 'hi-IN', voice: 'woman' },
      `${mobile} के लिए ${amount} रुपये रिचार्ज करने के लिए अपना पिन दर्ज करें।`
    );

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Recharge confirm error:', error);
    res.status(500).send('Error');
  }
});

/**
 * IVR call status callback
 */
router.post('/status', (req, res) => {
  const { CallSid, CallStatus, From, To } = req.body;
  
  console.log(`📞 Call ${CallSid} status: ${CallStatus}`);
  console.log(`   From: ${From} To: ${To}`);

  res.sendStatus(200);
});

/**
 * IVR recording callback
 */
router.post('/recording', (req, res) => {
  const { RecordingUrl, RecordingSid, CallSid } = req.body;
  
  console.log(`🎙️ Recording available: ${RecordingUrl}`);
  
  // Store recording URL in database if needed
  
  res.sendStatus(200);
});

module.exports = router;
