const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for NLP responses (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

class NLPService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.chatEndpoint = 'https://api.openai.com/v1/chat/completions';
    
    this.intents = [
      'balance_inquiry',
      'transfer_money',
      'transaction_history',
      'mobile_recharge',
      'dth_recharge',
      'bill_payment',
      'pin_change',
      'help',
      'greeting',
      'goodbye',
      'yes',
      'no',
      'unknown'
    ];

    this.systemPrompts = this.buildSystemPrompts();
  }

  /**
   * Build system prompts for different languages
   */
  buildSystemPrompts() {
    return {
      'hi-IN': `आप एक बैंकिंग सहायक हैं। उपयोगकर्ता के voice command से intent और entities निकालें।

Intents: balance_inquiry, transfer_money, transaction_history, mobile_recharge, dth_recharge, bill_payment, pin_change, help, greeting, goodbye, yes, no

Response format (JSON only):
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {
    "amount": number or null,
    "recipient_name": string or null,
    "recipient_phone": string or null,
    "mobile_number": string or null,
    "operator": string or null,
    "pin": string or null
  },
  "context": "any additional context",
  "requires_confirmation": boolean
}`,

      'en-IN': `You are a banking assistant. Extract intent and entities from user's voice command.

Intents: balance_inquiry, transfer_money, transaction_history, mobile_recharge, dth_recharge, bill_payment, pin_change, help, greeting, goodbye, yes, no

Response format (JSON only):
{
  "intent": "intent_name",
  "confidence": 0.0-1.0,
  "entities": {
    "amount": number or null,
    "recipient_name": string or null,
    "recipient_phone": string or null,
    "mobile_number": string or null,
    "operator": string or null,
    "pin": string or null
  },
  "context": "any additional context",
  "requires_confirmation": boolean
}`
    };
  }

  /**
   * Analyze text and extract intent and entities using GPT
   */
  async analyzeIntent(text, language = 'hi-IN', context = {}) {
    try {
      // Check cache
      const cacheKey = `nlp_${text}_${language}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached NLP analysis');
        return cached;
      }

      const systemPrompt = this.systemPrompts[language] || this.systemPrompts['en-IN'];

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this command: "${text}"${context.previousIntent ? ` (Previous intent: ${context.previousIntent})` : ''}` }
      ];

      const response = await axios.post(
        this.chatEndpoint,
        {
          model: 'gpt-4-turbo-preview',
          messages: messages,
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      const analysis = JSON.parse(response.data.choices[0].message.content);

      // Validate and normalize
      const result = {
        intent: this.normalizeIntent(analysis.intent),
        confidence: analysis.confidence || 0.7,
        entities: this.normalizeEntities(analysis.entities || {}),
        context: analysis.context || '',
        requiresConfirmation: analysis.requires_confirmation || false,
        rawAnalysis: analysis,
        timestamp: new Date()
      };

      // Cache result
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('NLP analysis error:', error.response?.data || error.message);
      
      // Fallback to rule-based analysis
      return this.fallbackAnalysis(text, language);
    }
  }

  /**
   * Normalize intent to standard format
   */
  normalizeIntent(intent) {
    const intentMap = {
      'balance': 'balance_inquiry',
      'transfer': 'transfer_money',
      'send': 'transfer_money',
      'pay': 'transfer_money',
      'transaction': 'transaction_history',
      'history': 'transaction_history',
      'recharge': 'mobile_recharge',
      'hi': 'greeting',
      'hello': 'greeting',
      'bye': 'goodbye',
      'thanks': 'goodbye',
      'yes': 'yes',
      'no': 'no',
      'help': 'help'
    };

    intent = intent.toLowerCase().trim();
    
    // Check direct match first
    if (this.intents.includes(intent)) {
      return intent;
    }

    // Check mapped values
    for (const [key, value] of Object.entries(intentMap)) {
      if (intent.includes(key)) {
        return value;
      }
    }

    return 'unknown';
  }

  /**
   * Normalize extracted entities
   */
  normalizeEntities(entities) {
    const normalized = {};

    // Amount
    if (entities.amount) {
      normalized.amount = parseInt(String(entities.amount).replace(/[^\d]/g, ''));
    }

    // Phone numbers (10 digits)
    if (entities.recipient_phone) {
      const phone = String(entities.recipient_phone).replace(/[^\d]/g, '');
      if (phone.length === 10) {
        normalized.recipientPhone = phone;
      }
    }

    if (entities.mobile_number) {
      const phone = String(entities.mobile_number).replace(/[^\d]/g, '');
      if (phone.length === 10) {
        normalized.mobileNumber = phone;
      }
    }

    // Recipient name
    if (entities.recipient_name) {
      normalized.recipientName = String(entities.recipient_name).trim();
    }

    // Operator
    if (entities.operator) {
      normalized.operator = String(entities.operator).trim();
    }

    // PIN (4 digits)
    if (entities.pin) {
      const pin = String(entities.pin).replace(/[^\d]/g, '');
      if (pin.length === 4) {
        normalized.pin = pin;
      }
    }

    return normalized;
  }

  /**
   * Fallback rule-based intent detection
   */
  fallbackAnalysis(text, language) {
    const lowerText = text.toLowerCase();

    // Intent patterns for different languages
    const patterns = {
      balance_inquiry: ['बैलेंस', 'balance', 'खाता', 'राशि', 'kitne', 'account', 'ବାଲାନ୍ସ', 'இருப்பு'],
      transfer_money: ['भेजना', 'भेज', 'transfer', 'send', 'pay', 'ପଠାନ୍ତୁ', 'அனுப்பு'],
      transaction_history: ['लेनदेन', 'transaction', 'history', 'हिस्ट्री', 'ଲେନ୍‌ଦେନ୍‌', 'பரிவர்த்தனை'],
      mobile_recharge: ['रिचार्ज', 'recharge', 'mobile', 'ରିଚାର୍ଜ', 'ரீசார்ஜ்'],
      greeting: ['नमस्ते', 'hello', 'hi', 'hey', 'ନମସ୍କାର', 'வணக்கம்'],
      goodbye: ['धन्यवाद', 'thank', 'bye', 'goodbye', 'ଧନ୍ୟବାଦ', 'நன்றி'],
      yes: ['हाँ', 'yes', 'ok', 'ହଁ', 'ஆம்'],
      no: ['नहीं', 'no', 'cancel', 'ନାହିଁ', 'இல்லை']
    };

    let detectedIntent = 'unknown';
    let maxMatches = 0;

    for (const [intent, keywords] of Object.entries(patterns)) {
      const matches = keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedIntent = intent;
      }
    }

    // Extract basic entities
    const entities = {};

    // Amount
    const amountMatch = text.match(/(\d+)/);
    if (amountMatch) {
      entities.amount = parseInt(amountMatch[1]);
    }

    // Phone number
    const phoneMatch = text.match(/(\d{10})/);
    if (phoneMatch) {
      entities.recipientPhone = phoneMatch[1];
    }

    return {
      intent: detectedIntent,
      confidence: maxMatches > 0 ? 0.6 : 0.3,
      entities: entities,
      context: '',
      requiresConfirmation: detectedIntent === 'transfer_money' || detectedIntent === 'mobile_recharge',
      timestamp: new Date(),
      fallback: true
    };
  }

  /**
   * Generate conversational response based on intent
   */
  async generateResponse(intent, entities, language = 'hi-IN', userData = {}) {
    const responses = this.getResponseTemplates(language);
    const template = responses[intent] || responses.unknown;

    // Replace placeholders
    let response = template;
    Object.keys(entities).forEach(key => {
      response = response.replace(`{${key}}`, entities[key] || '');
    });

    // Add user data
    if (userData.name) {
      response = response.replace('{name}', userData.name);
    }
    if (userData.balance !== undefined) {
      response = response.replace('{balance}', userData.balance);
    }

    return response;
  }

  /**
   * Get response templates by language
   */
  getResponseTemplates(language) {
    const templates = {
      'hi-IN': {
        balance_inquiry: 'आपके खाते में {balance} रुपये हैं।',
        transfer_money: '{amount} रुपये भेजने के लिए प्राप्तकर्ता का नाम या नंबर बताएं।',
        transaction_history: 'आपके पिछले लेनदेन दिखाए जा रहे हैं।',
        mobile_recharge: 'किस नंबर पर रिचार्ज करना है?',
        greeting: 'नमस्ते {name}! मैं आपकी कैसे मदद कर सकती हूं?',
        goodbye: 'धन्यवाद! आपका दिन शुभ हो।',
        yes: 'ठीक है, जारी रखूं?',
        no: 'ठीक है, रद्द किया जा रहा है।',
        help: 'मैं आपकी बैलेंस जांच, पैसे भेजने, लेनदेन देखने और रिचार्ज करने में मदद कर सकती हूं।',
        unknown: 'क्षमा करें, मैं समझ नहीं पाई। कृपया फिर से बोलें।'
      },
      'en-IN': {
        balance_inquiry: 'Your account has rupees {balance}.',
        transfer_money: 'Please tell the recipient name or number to send {amount} rupees.',
        transaction_history: 'Showing your recent transactions.',
        mobile_recharge: 'Which number do you want to recharge?',
        greeting: 'Hello {name}! How may I help you?',
        goodbye: 'Thank you! Have a nice day.',
        yes: 'Okay, shall I continue?',
        no: 'Okay, cancelling.',
        help: 'I can help you check balance, send money, view transactions, and do recharges.',
        unknown: 'Sorry, I didn\'t understand. Please say again.'
      }
    };

    return templates[language] || templates['hi-IN'];
  }

  /**
   * Batch analyze multiple texts
   */
  async batchAnalyze(texts, language = 'hi-IN') {
    const promises = texts.map(text =>
      this.analyzeIntent(text, language).catch(err => ({
        intent: 'unknown',
        error: err.message,
        success: false
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.flushAll();
  }
}

module.exports = new NLPService();
