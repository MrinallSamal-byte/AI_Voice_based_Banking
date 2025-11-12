const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;

class IVRService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
    }

    // IVR menu structure
    this.menus = this.buildMenus();
  }

  /**
   * Build IVR menu structure for different languages
   */
  buildMenus() {
    return {
      'hi-IN': {
        welcome: 'Voice Banking में आपका स्वागत है। कृपया अपना विकल्प चुनें।',
        options: {
          '1': { text: 'खाता बैलेंस जानने के लिए 1 दबाएं', action: 'balance' },
          '2': { text: 'पैसे भेजने के लिए 2 दबाएं', action: 'transfer' },
          '3': { text: 'लेनदेन इतिहास के लिए 3 दबाएं', action: 'transactions' },
          '4': { text: 'मोबाइल रिचार्ज के लिए 4 दबाएं', action: 'recharge' },
          '9': { text: 'मुख्य मेनू पर वापस जाने के लिए 9 दबाएं', action: 'main_menu' },
          '0': { text: 'ग्राहक सेवा के लिए 0 दबाएं', action: 'customer_service' }
        },
        goodbye: 'धन्यवाद। Voice Banking का उपयोग करने के लिए धन्यवाद। आपका दिन शुभ हो।'
      },
      'or-IN': {
        welcome: 'Voice Banking ରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ। ଦୟାକରି ଆପଣଙ୍କର ବିକଳ୍ପ ଚୟନ କରନ୍ତୁ।',
        options: {
          '1': { text: 'ବାଲାନ୍ସ ଜାଣିବାକୁ 1 ଦବାନ୍ତୁ', action: 'balance' },
          '2': { text: 'ଟଙ୍କା ପଠାଇବାକୁ 2 ଦବାନ୍ତୁ', action: 'transfer' },
          '3': { text: 'ଲେନ୍‌ଦେନ୍‌ ଇତିହାସ ପାଇଁ 3 ଦବାନ୍ତୁ', action: 'transactions' },
          '4': { text: 'ମୋବାଇଲ୍ ରିଚାର୍ଜ ପାଇଁ 4 ଦବାନ୍ତୁ', action: 'recharge' },
          '9': { text: 'ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ 9 ଦବାନ୍ତୁ', action: 'main_menu' },
          '0': { text: 'ଗ୍ରାହକ ସେବା ପାଇଁ 0 ଦବାନ୍ତୁ', action: 'customer_service' }
        },
        goodbye: 'ଧନ୍ୟବାଦ। Voice Banking ବ୍ୟବହାର କରିଥିବାରୁ ଧନ୍ୟବାଦ।'
      },
      'en-IN': {
        welcome: 'Welcome to Voice Banking. Please select your option.',
        options: {
          '1': { text: 'Press 1 for account balance', action: 'balance' },
          '2': { text: 'Press 2 to send money', action: 'transfer' },
          '3': { text: 'Press 3 for transaction history', action: 'transactions' },
          '4': { text: 'Press 4 for mobile recharge', action: 'recharge' },
          '9': { text: 'Press 9 to return to main menu', action: 'main_menu' },
          '0': { text: 'Press 0 for customer service', action: 'customer_service' }
        },
        goodbye: 'Thank you for using Voice Banking. Have a great day.'
      }
    };
  }

  /**
   * Initiate outbound IVR call
   */
  async makeCall(toNumber, options = {}) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized. Check credentials.');
      }

      const { language = 'hi-IN', callbackUrl } = options;

      const call = await this.client.calls.create({
        url: callbackUrl || `${process.env.BASE_URL}/api/ivr/welcome?language=${language}`,
        to: toNumber,
        from: this.phoneNumber,
        statusCallback: `${process.env.BASE_URL}/api/ivr/status`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        record: true,
        recordingStatusCallback: `${process.env.BASE_URL}/api/ivr/recording`
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        to: toNumber,
        from: this.phoneNumber
      };
    } catch (error) {
      console.error('IVR call error:', error);
      throw error;
    }
  }

  /**
   * Generate welcome menu TwiML
   */
  generateWelcomeMenu(language = 'hi-IN', sessionData = {}) {
    const twiml = new VoiceResponse();
    const menu = this.menus[language] || this.menus['hi-IN'];

    // Gather user input
    const gather = twiml.gather({
      input: 'dtmf speech',
      timeout: 10,
      numDigits: 1,
      action: '/api/ivr/process',
      method: 'POST',
      language: language,
      hints: Object.values(menu.options).map(o => o.text).join(',')
    });

    // Play welcome message
    gather.say(
      { language: language, voice: 'woman' },
      menu.welcome
    );

    // Read menu options
    Object.values(menu.options).forEach(option => {
      gather.say({ language: language, voice: 'woman' }, option.text);
    });

    // If no input, repeat menu
    twiml.redirect('/api/ivr/welcome');

    return twiml.toString();
  }

  /**
   * Process IVR menu selection
   */
  generateMenuResponse(digit, language = 'hi-IN', userData = {}) {
    const twiml = new VoiceResponse();
    const menu = this.menus[language] || this.menus['hi-IN'];
    const option = menu.options[digit];

    if (!option) {
      twiml.say(
        { language: language, voice: 'woman' },
        'Invalid option. Please try again.'
      );
      twiml.redirect('/api/ivr/welcome');
      return twiml.toString();
    }

    switch (option.action) {
      case 'balance':
        return this.generateBalanceResponse(language, userData);
      
      case 'transfer':
        return this.generateTransferMenu(language, userData);
      
      case 'transactions':
        return this.generateTransactionsResponse(language, userData);
      
      case 'recharge':
        return this.generateRechargeMenu(language, userData);
      
      case 'main_menu':
        twiml.redirect('/api/ivr/welcome');
        break;
      
      case 'customer_service':
        twiml.say(
          { language: language, voice: 'woman' },
          'Connecting to customer service...'
        );
        twiml.dial('+91-1800-XXX-XXXX'); // Add actual customer service number
        break;
    }

    return twiml.toString();
  }

  /**
   * Generate balance inquiry response
   */
  generateBalanceResponse(language, userData) {
    const twiml = new VoiceResponse();
    const balance = userData.balance || 0;

    const messages = {
      'hi-IN': `आपके खाते में ${balance} रुपये हैं। मुख्य मेनू पर वापस जाने के लिए 9 दबाएं।`,
      'or-IN': `ଆପଣଙ୍କ ଖାତାରେ ${balance} ଟଙ୍କା ଅଛି। ମୁଖ୍ୟ ମେନୁକୁ ଫେରିବାକୁ 9 ଦବାନ୍ତୁ।`,
      'en-IN': `Your account balance is ${balance} rupees. Press 9 to return to main menu.`
    };

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 5,
      numDigits: 1,
      action: '/api/ivr/process'
    });

    gather.say(
      { language: language, voice: 'woman' },
      messages[language] || messages['en-IN']
    );

    return twiml.toString();
  }

  /**
   * Generate transfer menu
   */
  generateTransferMenu(language, userData) {
    const twiml = new VoiceResponse();

    const messages = {
      'hi-IN': 'कृपया प्राप्तकर्ता का 10 अंकों का मोबाइल नंबर दर्ज करें, इसके बाद हैश दबाएं।',
      'or-IN': 'ଦୟାକରି ପ୍ରାପକଙ୍କ 10 ଅଙ୍କର ମୋବାଇଲ୍ ନମ୍ବର ପ୍ରବେଶ କରନ୍ତୁ, ତା ପରେ ହ୍ୟାସ୍ ଦବାନ୍ତୁ।',
      'en-IN': 'Please enter recipient\'s 10 digit mobile number followed by hash.'
    };

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      finishOnKey: '#',
      action: '/api/ivr/transfer/amount',
      method: 'POST'
    });

    gather.say(
      { language: language, voice: 'woman' },
      messages[language] || messages['en-IN']
    );

    return twiml.toString();
  }

  /**
   * Generate transactions response
   */
  generateTransactionsResponse(language, userData) {
    const twiml = new VoiceResponse();
    const transactions = userData.recentTransactions || [];

    const messages = {
      'hi-IN': 'आपके अंतिम लेनदेन:',
      'or-IN': 'ଆପଣଙ୍କର ଅନ୍ତିମ ଲେନ୍‌ଦେନ୍‌:',
      'en-IN': 'Your recent transactions:'
    };

    twiml.say(
      { language: language, voice: 'woman' },
      messages[language] || messages['en-IN']
    );

    // Read last 3 transactions
    transactions.slice(0, 3).forEach((txn, index) => {
      const txnMsg = this.formatTransaction(txn, language);
      twiml.say({ language: language, voice: 'woman' }, txnMsg);
    });

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 5,
      numDigits: 1,
      action: '/api/ivr/process'
    });

    gather.say(
      { language: language, voice: 'woman' },
      'Press 9 for main menu'
    );

    return twiml.toString();
  }

  /**
   * Generate recharge menu
   */
  generateRechargeMenu(language, userData) {
    const twiml = new VoiceResponse();

    const messages = {
      'hi-IN': 'कृपया रिचार्ज के लिए मोबाइल नंबर दर्ज करें, इसके बाद हैश दबाएं।',
      'or-IN': 'ଦୟାକରି ରିଚାର୍ଜ ପାଇଁ ମୋବାଇଲ୍ ନମ୍ବର ପ୍ରବେଶ କରନ୍ତୁ, ତା ପରେ ହ୍ୟାସ୍ ଦବାନ୍ତୁ।',
      'en-IN': 'Please enter mobile number for recharge followed by hash.'
    };

    const gather = twiml.gather({
      input: 'dtmf',
      timeout: 30,
      finishOnKey: '#',
      action: '/api/ivr/recharge/amount',
      method: 'POST'
    });

    gather.say(
      { language: language, voice: 'woman' },
      messages[language] || messages['en-IN']
    );

    return twiml.toString();
  }

  /**
   * Generate goodbye message
   */
  generateGoodbye(language = 'hi-IN') {
    const twiml = new VoiceResponse();
    const menu = this.menus[language] || this.menus['hi-IN'];

    twiml.say(
      { language: language, voice: 'woman' },
      menu.goodbye
    );

    twiml.hangup();

    return twiml.toString();
  }

  /**
   * Format transaction for voice
   */
  formatTransaction(transaction, language) {
    const templates = {
      'hi-IN': `${transaction.type === 'credit' ? 'प्राप्त' : 'भेजा'} ${transaction.amount} रुपये। ${transaction.description}`,
      'or-IN': `${transaction.type === 'credit' ? 'ପ୍ରାପ୍ତ' : 'ପଠାଯାଇଛି'} ${transaction.amount} ଟଙ୍କା। ${transaction.description}`,
      'en-IN': `${transaction.type === 'credit' ? 'Received' : 'Sent'} ${transaction.amount} rupees. ${transaction.description}`
    };

    return templates[language] || templates['en-IN'];
  }

  /**
   * Send SMS with call details
   */
  async sendCallSummary(phoneNumber, summary, language = 'hi-IN') {
    try {
      if (!this.client) {
        console.warn('Twilio client not initialized. Cannot send SMS.');
        return;
      }

      const message = await this.client.messages.create({
        body: summary,
        from: this.phoneNumber,
        to: phoneNumber
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status
      };
    } catch (error) {
      console.error('SMS send error:', error);
      throw error;
    }
  }

  /**
   * Get call logs
   */
  async getCallLogs(phoneNumber, limit = 10) {
    try {
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      const calls = await this.client.calls.list({
        to: phoneNumber,
        limit: limit
      });

      return calls.map(call => ({
        callSid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime
      }));
    } catch (error) {
      console.error('Call logs error:', error);
      throw error;
    }
  }
}

module.exports = new IVRService();
