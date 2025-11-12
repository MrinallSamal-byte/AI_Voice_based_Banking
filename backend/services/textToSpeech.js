const axios = require('axios');
const NodeCache = require('node-cache');

// Cache for TTS responses (10 minute TTL)
const cache = new NodeCache({ stdTTL: 600 });

class TextToSpeechService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.ttsEndpoint = 'https://api.openai.com/v1/audio/speech';
    
    // Voice mappings for different languages and genders
    this.voices = {
      'hi-IN': { male: 'onyx', female: 'nova' },
      'or-IN': { male: 'onyx', female: 'nova' },
      'bn-IN': { male: 'onyx', female: 'nova' },
      'ta-IN': { male: 'onyx', female: 'nova' },
      'te-IN': { male: 'onyx', female: 'nova' },
      'kn-IN': { male: 'onyx', female: 'nova' },
      'mr-IN': { male: 'onyx', female: 'nova' },
      'gu-IN': { male: 'onyx', female: 'nova' },
      'en-IN': { male: 'onyx', female: 'shimmer' }
    };

    this.speeds = {
      'slow': 0.75,
      'normal': 1.0,
      'fast': 1.25
    };
  }

  /**
   * Convert text to speech using OpenAI TTS
   */
  async textToSpeech(text, options = {}) {
    try {
      const {
        language = 'hi-IN',
        voice = 'female',
        speed = 'normal',
        format = 'mp3'
      } = options;

      // Check cache
      const cacheKey = `tts_${text}_${language}_${voice}_${speed}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached TTS audio');
        return cached;
      }

      const selectedVoice = this.voices[language]?.[voice] || 'nova';
      const selectedSpeed = this.speeds[speed] || 1.0;

      const response = await axios.post(
        this.ttsEndpoint,
        {
          model: 'tts-1',
          input: text,
          voice: selectedVoice,
          speed: selectedSpeed,
          response_format: format
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      const result = {
        audio: Buffer.from(response.data),
        format: format,
        text: text,
        language: language,
        voice: voice,
        speed: speed,
        duration: this.estimateDuration(text, selectedSpeed),
        timestamp: new Date()
      };

      // Cache result
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Text-to-speech error:', error.response?.data || error.message);
      throw new Error(`TTS conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert multiple texts to speech in batch
   */
  async batchTextToSpeech(texts, options = {}) {
    const promises = texts.map(text =>
      this.textToSpeech(text, options).catch(err => ({
        error: err.message,
        success: false
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Generate banking-specific voice responses
   */
  async generateBankingResponse(type, data, language = 'hi-IN', userPrefs = {}) {
    const templates = this.getBankingTemplates(language);
    const text = this.formatBankingMessage(type, data, templates);

    return this.textToSpeech(text, {
      language,
      voice: userPrefs.voiceGender || 'female',
      speed: userPrefs.voiceSpeed || 'normal'
    });
  }

  /**
   * Get banking message templates by language
   */
  getBankingTemplates(language) {
    const templates = {
      'hi-IN': {
        balance: 'आपके खाते में {amount} रुपये हैं।',
        transfer_confirm: '{amount} रुपये {recipient} को भेजने के लिए अपना पिन बोलिए।',
        transfer_success: '{amount} रुपये {recipient} को सफलतापूर्वक भेज दिए गए हैं। आपका नया बैलेंस {balance} रुपये है।',
        insufficient_funds: 'क्षमा करें, आपके खाते में पर्याप्त राशि नहीं है। आपका बैलेंस {balance} रुपये है।',
        transaction_history: 'आपका पिछला लेनदेन {date} को {amount} रुपये {type} था।',
        recharge_confirm: '{number} के लिए {amount} रुपये का रिचार्ज करने के लिए अपना पिन बोलिए।',
        recharge_success: '{number} के लिए {amount} रुपये का रिचार्ज सफल रहा।',
        greeting: 'नमस्ते {name}, मैं आपकी कैसे मदद कर सकती हूं?',
        goodbye: 'धन्यवाद। आपका दिन शुभ हो।',
        error: 'क्षमा करें, कुछ गलती हो गई। कृपया दोबारा प्रयास करें।',
        not_understood: 'क्षमा करें, मैं समझ नहीं पाई। कृपया फिर से बोलें।'
      },
      'or-IN': {
        balance: 'ଆପଣଙ୍କ ଖାତାରେ {amount} ଟଙ୍କା ଅଛି।',
        transfer_confirm: '{amount} ଟଙ୍କା {recipient} କୁ ପଠାଇବାକୁ ନିଜର ପିନ୍ କୁହନ୍ତୁ।',
        transfer_success: '{amount} ଟଙ୍କା {recipient} କୁ ସଫଳତାର ସହିତ ପଠାଯାଇଛି। ଆପଣଙ୍କର ନୂତନ ବାଲାନ୍ସ {balance} ଟଙ୍କା ଅଛି।',
        insufficient_funds: 'ଦୁଃଖିତ, ଆପଣଙ୍କ ଖାତାରେ ପର୍ଯ୍ୟାପ୍ତ ଟଙ୍କା ନାହିଁ। ଆପଣଙ୍କର ବାଲାନ୍ସ {balance} ଟଙ୍କା ଅଛି।',
        transaction_history: 'ଆପଣଙ୍କର ଶେଷ ଲେନ୍‌ଦେନ୍‌ {date} ରେ {amount} ଟଙ୍କା {type} ଥିଲା।',
        greeting: 'ନମସ୍କାର {name}, ମୁଁ ଆପଣଙ୍କୁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି?',
        goodbye: 'ଧନ୍ୟବାଦ। ଆପଣଙ୍କର ଦିନ ଶୁଭ ହେଉ।',
        error: 'ଦୁଃଖିତ, କିଛି ଭୁଲ୍ ହୋଇଛି। ଦୟାକରି ପୁଣି ଚେଷ୍ଟା କରନ୍ତୁ।',
        not_understood: 'ଦୁଃଖିତ, ମୁଁ ବୁଝିପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।'
      },
      'ta-IN': {
        balance: 'உங்கள் கணக்கில் {amount} ரூபாய் உள்ளது.',
        transfer_confirm: '{amount} ரூபாயை {recipient} க்கு அனுப்ப உங்கள் பின்னை சொல்லுங்கள்.',
        transfer_success: '{amount} ரூபாய் {recipient} க்கு வெற்றிகரமாக அனுப்பப்பட்டது. உங்கள் புதிய இருப்பு {balance} ரூபாய்.',
        insufficient_funds: 'மன்னிக்கவும், உங்கள் கணக்கில் போதுமான தொகை இல்லை. உங்கள் இருப்பு {balance} ரூபாய்.',
        transaction_history: 'உங்கள் கடைசி பரிவர்த்தனை {date} அன்று {amount} ரூபாய் {type}.',
        recharge_confirm: '{number} க்கு {amount} ரூபாய் ரீசார்ஜ் செய்ய உங்கள் பின்னை சொல்லுங்கள்.',
        recharge_success: '{number} க்கு {amount} ரூபாய் ரீசார்ஜ் வெற்றிகரமாக முடிந்தது.',
        greeting: 'வணக்கம் {name}, நான் உங்களுக்கு எப்படி உதவ முடியும்?',
        goodbye: 'நன்றி. உங்கள் நாள் இனிதாக இருக்கட்டும்.',
        error: 'மன்னிக்கவும், ஏதோ தவறு நடந்துள்ளது. மீண்டும் முயற்சிக்கவும்.',
        not_understood: 'மன்னிக்கவும், என்னால் புரிந்து கொள்ள முடியவில்லை. மீண்டும் சொல்லுங்கள்.'
      },
      'te-IN': {
        balance: 'మీ ఖాతాలో {amount} రూపాయలు ఉన్నాయి.',
        transfer_confirm: '{amount} రూపాయలు {recipient} కు పంపడానికి మీ పిన్ చెప్పండి.',
        transfer_success: '{amount} రూపాయలు {recipient} కు విజయవంతంగా పంపబడ్డాయి. మీ కొత్త బ్యాలెన్స్ {balance} రూపాయలు.',
        insufficient_funds: 'క్షమించండి, మీ ఖాతాలో తగినంత డబ్బు లేదు. మీ బ్యాలెన్స్ {balance} రూపాయలు.',
        transaction_history: 'మీ చివరి లావాదేవీ {date} న {amount} రూపాయలు {type}.',
        recharge_confirm: '{number} కు {amount} రూపాయలు రీఛార్జ్ చేయడానికి మీ పిన్ చెప్పండి.',
        recharge_success: '{number} కు {amount} రూపాయలు రీఛార్జ్ విజయవంతంగా పూర్తయింది.',
        greeting: 'నమస్కారం {name}, నేను మీకు ఎలా సహాయం చేయగలను?',
        goodbye: 'ధన్యవాదాలు. మీ రోజు శుభంగా ఉండాలి.',
        error: 'క్షమించండి, ఏదో తప్పు జరిగింది. దయచేసి మళ్ళీ ప్రయత్నించండి.',
        not_understood: 'క్షమించండి, నాకు అర్థం కాలేదు. దయచేసి మళ్ళీ చెప్పండి.'
      },
      'kn-IN': {
        balance: 'ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ {amount} ರೂಪಾಯಿಗಳಿವೆ.',
        transfer_confirm: '{amount} ರೂಪಾಯಿಗಳನ್ನು {recipient} ಗೆ ಕಳುಹಿಸಲು ನಿಮ್ಮ ಪಿನ್ ಹೇಳಿ.',
        transfer_success: '{amount} ರೂಪಾಯಿಗಳು {recipient} ಗೆ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಹೊಸ ಬ್ಯಾಲೆನ್ಸ್ {balance} ರೂಪಾಯಿಗಳು.',
        insufficient_funds: 'ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಸಾಕಷ್ಟು ಹಣವಿಲ್ಲ. ನಿಮ್ಮ ಬ್ಯಾಲೆನ್ಸ್ {balance} ರೂಪಾಯಿಗಳು.',
        transaction_history: 'ನಿಮ್ಮ ಕೊನೆಯ ವಹಿವಾಟು {date} ರಂದು {amount} ರೂಪಾಯಿಗಳು {type}.',
        recharge_confirm: '{number} ಗೆ {amount} ರೂಪಾಯಿಗಳ ರೀಚಾರ್ಜ್ ಮಾಡಲು ನಿಮ್ಮ ಪಿನ್ ಹೇಳಿ.',
        recharge_success: '{number} ಗೆ {amount} ರೂಪಾಯಿಗಳ ರೀಚಾರ್ಜ್ ಯಶಸ್ವಿಯಾಗಿದೆ.',
        greeting: 'ನಮಸ್ಕಾರ {name}, ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
        goodbye: 'ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ದಿನ ಶುಭವಾಗಿರಲಿ.',
        error: 'ಕ್ಷಮಿಸಿ, ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
        not_understood: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.'
      },
      'mr-IN': {
        balance: 'तुमच्या खात्यात {amount} रुपये आहेत.',
        transfer_confirm: '{amount} रुपये {recipient} ला पाठवण्यासाठी तुमचा पिन सांगा.',
        transfer_success: '{amount} रुपये {recipient} ला यशस्वीपणे पाठवले गेले. तुमची नवीन शिल्लक {balance} रुपये आहे.',
        insufficient_funds: 'क्षमस्व, तुमच्या खात्यात पुरेसे पैसे नाहीत. तुमची शिल्लक {balance} रुपये आहे.',
        transaction_history: 'तुमचा शेवटचा व्यवहार {date} रोजी {amount} रुपये {type} होता.',
        recharge_confirm: '{number} साठी {amount} रुपये रिचार्ज करण्यासाठी तुमचा पिन सांगा.',
        recharge_success: '{number} साठी {amount} रुपये रिचार्ज यशस्वी झाला.',
        greeting: 'नमस्कार {name}, मी तुम्हाला कशी मदत करू शकते?',
        goodbye: 'धन्यवाद. तुमचा दिवस शुभ जावो.',
        error: 'क्षमस्व, काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.',
        not_understood: 'क्षमस्व, मला समजले नाही. कृपया पुन्हा सांगा.'
      },
      'gu-IN': {
        balance: 'તમારા ખાતામાં {amount} રૂપિયા છે.',
        transfer_confirm: '{amount} રૂપિયા {recipient} ને મોકલવા માટે તમારો પિન કહો.',
        transfer_success: '{amount} રૂપિયા {recipient} ને સફળતાપૂર્વક મોકલ્યા. તમારો નવો બેલેન્સ {balance} રૂપિયા છે.',
        insufficient_funds: 'માફ કરશો, તમારા ખાતામાં પૂરતા પૈસા નથી. તમારો બેલેન્સ {balance} રૂપિયા છે.',
        transaction_history: 'તમારો છેલ્લો વ્યવહાર {date} ના રોજ {amount} રૂપિયા {type} હતો.',
        recharge_confirm: '{number} માટે {amount} રૂપિયાનો રિચાર્જ કરવા માટે તમારો પિન કહો.',
        recharge_success: '{number} માટે {amount} રૂપિયાનો રિચાર્જ સફળ રહ્યો.',
        greeting: 'નમસ્તે {name}, હું તમને કેવી રીતે મદદ કરી શકું?',
        goodbye: 'આભાર. તમારો દિવસ શુભ રહે.',
        error: 'માફ કરશો, કંઈક ખોટું થયું. મહેરબાની કરીને ફરી પ્રયાસ કરો.',
        not_understood: 'માફ કરશો, મને સમજાયું નહીં. મહેરબાની કરીને ફરી કહો.'
      },
      'bn-IN': {
        balance: 'আপনার অ্যাকাউন্টে {amount} টাকা আছে।',
        transfer_confirm: '{amount} টাকা {recipient} কে পাঠাতে আপনার পিন বলুন।',
        transfer_success: '{amount} টাকা {recipient} কে সফলভাবে পাঠানো হয়েছে। আপনার নতুন ব্যালেন্স {balance} টাকা।',
        insufficient_funds: 'দুঃখিত, আপনার অ্যাকাউন্টে পর্যাপ্ত টাকা নেই। আপনার ব্যালেন্স {balance} টাকা।',
        transaction_history: 'আপনার শেষ লেনদেন {date} তারিখে {amount} টাকা {type} ছিল।',
        recharge_confirm: '{number} এর জন্য {amount} টাকা রিচার্জ করতে আপনার পিন বলুন।',
        recharge_success: '{number} এর জন্য {amount} টাকা রিচার্জ সফল হয়েছে।',
        greeting: 'নমস্কার {name}, আমি আপনাকে কীভাবে সাহায্য করতে পারি?',
        goodbye: 'ধন্যবাদ। আপনার দিন শুভ হোক।',
        error: 'দুঃখিত, কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        not_understood: 'দুঃখিত, আমি বুঝতে পারিনি। অনুগ্রহ করে আবার বলুন।'
      },
      'en-IN': {
        balance: 'Your account has rupees {amount}.',
        transfer_confirm: 'Please say your PIN to send rupees {amount} to {recipient}.',
        transfer_success: 'Rupees {amount} sent successfully to {recipient}. Your new balance is rupees {balance}.',
        insufficient_funds: 'Sorry, you have insufficient funds. Your balance is rupees {balance}.',
        transaction_history: 'Your last transaction was rupees {amount} {type} on {date}.',
        recharge_confirm: 'Please say your PIN to recharge {number} with rupees {amount}.',
        recharge_success: 'Recharge of rupees {amount} for {number} was successful.',
        greeting: 'Hello {name}, how may I help you?',
        goodbye: 'Thank you. Have a nice day.',
        error: 'Sorry, something went wrong. Please try again.',
        not_understood: 'Sorry, I didn\'t understand. Please say again.'
      }
    };

    return templates[language] || templates['hi-IN'];
  }

  /**
   * Format banking message with data
   */
  formatBankingMessage(type, data, templates) {
    let template = templates[type] || templates.error;

    // Replace placeholders
    Object.keys(data).forEach(key => {
      template = template.replace(`{${key}}`, data[key]);
    });

    return template;
  }

  /**
   * Estimate audio duration based on text length
   */
  estimateDuration(text, speed = 1.0) {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length;
    const minutes = words / 150;
    const seconds = (minutes * 60) / speed;
    return Math.ceil(seconds);
  }

  /**
   * Convert audio to base64 for web transmission
   */
  audioToBase64(audioBuffer, format = 'mp3') {
    const base64 = audioBuffer.toString('base64');
    return `data:audio/${format};base64,${base64}`;
  }

  /**
   * Generate SSML for advanced speech control
   */
  generateSSML(text, options = {}) {
    const {
      emphasis = 'none',
      pause = 0,
      rate = 'medium',
      pitch = 'medium'
    } = options;

    return `
      <speak>
        <prosody rate="${rate}" pitch="${pitch}">
          ${pause > 0 ? `<break time="${pause}ms"/>` : ''}
          <emphasis level="${emphasis}">${text}</emphasis>
        </prosody>
      </speak>
    `.trim();
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.flushAll();
  }
}

module.exports = new TextToSpeechService();
