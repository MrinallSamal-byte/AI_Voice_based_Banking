const twilio = require('twilio');

class SMSService {
  constructor() {
    this.enabled = process.env.SMS_ENABLED === 'true';
    this.client = null;
    
    if (this.enabled) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      // Only initialize if valid Twilio credentials
      if (accountSid && authToken && 
          accountSid.startsWith('AC') && 
          accountSid.length > 30) {
        try {
          this.client = twilio(accountSid, authToken);
          this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
          console.log('✅ Twilio SMS service initialized');
        } catch (error) {
          console.warn('⚠️  Failed to initialize Twilio SMS service:', error.message);
          this.enabled = false;
        }
      } else {
        console.log('ℹ️  Twilio SMS service not configured (demo mode)');
        this.enabled = false;
      }
    }

    this.templates = this.buildTemplates();
  }

  /**
   * Build SMS templates for different languages
   */
  buildTemplates() {
    return {
      'hi-IN': {
        balance: 'आपका बैलेंस: ₹{balance}\nखाता: {accountNumber}\n- Voice Banking',
        transfer_success: '₹{amount} {recipient} को भेजे गए\nबैलेंस: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        transfer_received: '₹{amount} {sender} से प्राप्त\nबैलेंस: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        recharge_success: '₹{amount} रिचार्ज सफल\nनंबर: {number}\nबैलेंस: ₹{balance}\n- Voice Banking',
        pin_changed: 'आपका PIN सफलतापूर्वक बदल दिया गया है।\n- Voice Banking',
        login_alert: 'आपके खाते में {time} पर लॉगिन हुआ।\n- Voice Banking',
        help: 'Voice Banking Commands:\nBAL - बैलेंस\nTXN - लेनदेन\nSEND <amt> <phone> <pin> - भेजें\nRECH <amt> <phone> <pin> - रिचार्ज\nHELP - मदद'
      },
      'or-IN': {
        balance: 'ଆପଣଙ୍କର ବାଲାନ୍ସ: ₹{balance}\nଖାତା: {accountNumber}\n- Voice Banking',
        transfer_success: '₹{amount} {recipient} କୁ ପଠାଯାଇଛି\nବାଲାନ୍ସ: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        transfer_received: '₹{amount} {sender} ରୁ ପ୍ରାପ୍ତ\nବାଲାନ୍ସ: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        recharge_success: '₹{amount} ରିଚାର୍ଜ ସଫଳ\nନମ୍ବର: {number}\nବାଲାନ୍ସ: ₹{balance}\n- Voice Banking',
        help: 'Voice Banking Commands:\nBAL - ବାଲାନ୍ସ\nTXN - ଲେନ୍‌ଦେନ୍‌\nSEND <amt> <phone> <pin> - ପଠାନ୍ତୁ\nHELP - ସାହାଯ୍ୟ'
      },
      'en-IN': {
        balance: 'Your Balance: ₹{balance}\nAccount: {accountNumber}\n- Voice Banking',
        transfer_success: '₹{amount} sent to {recipient}\nBalance: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        transfer_received: '₹{amount} received from {sender}\nBalance: ₹{balance}\nTXN: {transactionId}\n- Voice Banking',
        recharge_success: '₹{amount} recharge successful\nNumber: {number}\nBalance: ₹{balance}\n- Voice Banking',
        pin_changed: 'Your PIN has been changed successfully.\n- Voice Banking',
        login_alert: 'Login to your account at {time}.\n- Voice Banking',
        help: 'Voice Banking Commands:\nBAL - Balance\nTXN - Transactions\nSEND <amt> <phone> <pin> - Transfer\nRECH <amt> <phone> <pin> - Recharge\nHELP - Help'
      }
    };
  }

  /**
   * Send SMS to user
   */
  async sendSMS(phoneNumber, message, options = {}) {
    try {
      if (!this.enabled) {
        console.log(`📱 [SMS DISABLED] Would send to ${phoneNumber}: ${message}`);
        return {
          success: true,
          sid: `MOCK_${Date.now()}`,
          mock: true
        };
      }

      // Ensure phone number has country code
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedPhone,
        ...options
      });

      console.log(`✅ SMS sent to ${phoneNumber}: ${result.sid}`);

      return {
        success: true,
        sid: result.sid,
        status: result.status,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('SMS sending error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send templated SMS
   */
  async sendTemplatedSMS(phoneNumber, templateType, data, language = 'hi-IN') {
    const templates = this.templates[language] || this.templates['en-IN'];
    let message = templates[templateType];

    if (!message) {
      throw new Error(`Template ${templateType} not found for language ${language}`);
    }

    // Replace placeholders
    Object.keys(data).forEach(key => {
      message = message.replace(`{${key}}`, data[key]);
    });

    return this.sendSMS(phoneNumber, message);
  }

  /**
   * Send balance notification
   */
  async sendBalanceNotification(phoneNumber, balance, accountNumber, language = 'hi-IN') {
    return this.sendTemplatedSMS(phoneNumber, 'balance', {
      balance,
      accountNumber
    }, language);
  }

  /**
   * Send transaction alert
   */
  async sendTransactionAlert(phoneNumber, transaction, language = 'hi-IN') {
    const { type, amount, recipient, sender, balance, transactionId } = transaction;

    let templateType = 'transfer_success';
    let data = { amount, balance, transactionId };

    if (type === 'credit') {
      templateType = 'transfer_received';
      data.sender = sender || 'Unknown';
    } else if (type === 'debit' || type === 'transfer') {
      templateType = 'transfer_success';
      data.recipient = recipient || 'Unknown';
    } else if (type === 'recharge') {
      templateType = 'recharge_success';
      data.number = transaction.mobileNumber || '';
    }

    return this.sendTemplatedSMS(phoneNumber, templateType, data, language);
  }

  /**
   * Send bulk SMS
   */
  async sendBulkSMS(recipients, message) {
    const promises = recipients.map(phone =>
      this.sendSMS(phone, message).catch(err => ({
        phone,
        success: false,
        error: err.message
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Send OTP
   */
  async sendOTP(phoneNumber, otp, language = 'hi-IN') {
    const messages = {
      'hi-IN': `आपका OTP: ${otp}\nकृपया किसी के साथ साझा न करें।\n- Voice Banking`,
      'or-IN': `ଆପଣଙ୍କର OTP: ${otp}\nଦୟାକରି କାହା ସହ ସେୟାର କରନ୍ତୁ ନାହିଁ।\n- Voice Banking`,
      'en-IN': `Your OTP: ${otp}\nDo not share with anyone.\n- Voice Banking`
    };

    return this.sendSMS(phoneNumber, messages[language] || messages['en-IN']);
  }

  /**
   * Send help message
   */
  async sendHelp(phoneNumber, language = 'hi-IN') {
    return this.sendTemplatedSMS(phoneNumber, 'help', {}, language);
  }

  /**
   * Generate OTP
   */
  generateOTP(length = 6) {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
  }

  /**
   * Process incoming SMS command
   */
  processCommand(message) {
    const parts = message.trim().toUpperCase().split(/\s+/);
    const command = parts[0];

    const commandMap = {
      'BAL': 'balance',
      'BALANCE': 'balance',
      'TXN': 'transactions',
      'TRANS': 'transactions',
      'SEND': 'transfer',
      'PAY': 'transfer',
      'RECH': 'recharge',
      'RECHARGE': 'recharge',
      'HELP': 'help'
    };

    const intent = commandMap[command] || 'unknown';

    const result = {
      intent,
      command,
      parts: parts.slice(1)
    };

    // Extract specific data based on intent
    if (intent === 'transfer' && parts.length >= 4) {
      result.amount = parseInt(parts[1]);
      result.phone = parts[2];
      result.pin = parts[3];
    } else if (intent === 'recharge' && parts.length >= 4) {
      result.amount = parseInt(parts[1]);
      result.phone = parts[2];
      result.pin = parts[3];
    }

    return result;
  }

  /**
   * Send login alert
   */
  async sendLoginAlert(phoneNumber, language = 'hi-IN') {
    const time = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'short',
      timeStyle: 'short'
    });

    return this.sendTemplatedSMS(phoneNumber, 'login_alert', { time }, language);
  }

  /**
   * Send PIN changed notification
   */
  async sendPINChangedAlert(phoneNumber, language = 'hi-IN') {
    return this.sendTemplatedSMS(phoneNumber, 'pin_changed', {}, language);
  }
}

module.exports = new SMSService();
