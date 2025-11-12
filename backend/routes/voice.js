const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configure multer for audio file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Middleware to verify JWT token (optional for voice processing)
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    // Allow unauthenticated access for demo/testing
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Language configurations
const languageConfig = {
  'hi-IN': { name: 'Hindi', code: 'hi' },
  'or-IN': { name: 'Odia', code: 'or' },
  'bn-IN': { name: 'Bengali', code: 'bn' },
  'ta-IN': { name: 'Tamil', code: 'ta' },
  'te-IN': { name: 'Telugu', code: 'te' },
  'kn-IN': { name: 'Kannada', code: 'kn' },
  'mr-IN': { name: 'Marathi', code: 'mr' },
  'gu-IN': { name: 'Gujarati', code: 'gu' },
  'en-IN': { name: 'English', code: 'en' }
};

// Intent detection patterns for different languages
const intentPatterns = {
  balance: {
    'hi': ['बैलेंस', 'खाता', 'राशि', 'पैसे कितने', 'balance', 'kitne paise'],
    'or': ['ବାଲାନ୍ସ', 'ଖାତା', 'ପଇସା', 'balance'],
    'ta': ['இருப்பு', 'balance', 'பணம்'],
    'te': ['బ్యాలెన్స్', 'balance', 'డబ్బు'],
    'en': ['balance', 'account', 'money', 'how much']
  },
  transfer: {
    'hi': ['भेजना', 'भेज', 'transfer', 'send', 'पैसे भेजो', 'भेजना है'],
    'or': ['ପଠାନ୍ତୁ', 'ପଇସା ପଠାନ୍ତୁ', 'transfer', 'send'],
    'ta': ['அனுப்பு', 'transfer', 'send', 'பணம் அனுப்பு'],
    'te': ['పంపండి', 'transfer', 'send'],
    'en': ['send', 'transfer', 'pay']
  },
  transactions: {
    'hi': ['लेनदेन', 'transaction', 'हिस्ट्री', 'history', 'पिछला'],
    'or': ['ଲେନ୍‌ଦେନ୍‌', 'transaction', 'history'],
    'ta': ['பரிவர்த்தனை', 'transaction', 'history'],
    'te': ['లావాదేవీ', 'transaction', 'history'],
    'en': ['transaction', 'history', 'last', 'previous']
  },
  recharge: {
    'hi': ['रिचार्ज', 'recharge', 'मोबाइल', 'mobile'],
    'or': ['ରିଚାର୍ଜ', 'recharge', 'mobile'],
    'ta': ['ரீசார்ஜ்', 'recharge', 'mobile'],
    'te': ['రీఛార్జ్', 'recharge', 'mobile'],
    'en': ['recharge', 'mobile', 'phone']
  }
};

// Mock speech-to-text function (Replace with actual Whisper API in production)
async function speechToText(audioBuffer, language = 'hi-IN') {
  // In production, integrate with OpenAI Whisper or Google Speech API
  // For demo, return mock transcriptions based on language
  
  const mockTranscriptions = {
    'hi-IN': 'मेरा बैलेंस बताओ',
    'or-IN': 'ମୋର ବାଲାନ୍ସ କହନ୍ତୁ',
    'ta-IN': 'என் இருப்பு சொல்லுங்கள்',
    'te-IN': 'నా బ్యాలెన్స్ చెప్పండి',
    'en-IN': 'tell me my balance'
  };

  return {
    text: mockTranscriptions[language] || mockTranscriptions['hi-IN'],
    confidence: 0.85,
    language: language
  };
}

// Detect intent from text
function detectIntent(text, language = 'hi') {
  const lowerText = text.toLowerCase();
  
  for (const [intent, patterns] of Object.entries(intentPatterns)) {
    const langPatterns = patterns[language] || patterns['en'];
    
    for (const pattern of langPatterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return intent;
      }
    }
  }
  
  return 'unknown';
}

// Extract entities from text
function extractEntities(text, intent) {
  const entities = {};
  
  // Extract amount (numbers)
  const amountMatch = text.match(/(\d+)/);
  if (amountMatch && (intent === 'transfer' || intent === 'recharge')) {
    entities.amount = parseInt(amountMatch[1]);
  }
  
  // Extract phone numbers
  const phoneMatch = text.match(/(\d{10})/);
  if (phoneMatch && intent === 'transfer') {
    entities.phone = phoneMatch[1];
  }
  
  return entities;
}

// Process voice command
router.post('/process', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { language = 'hi-IN' } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    // Convert speech to text
    const transcription = await speechToText(req.file.buffer, language);
    
    // Detect intent
    const langCode = languageConfig[language]?.code || 'hi';
    const intent = detectIntent(transcription.text, langCode);
    
    // Extract entities
    const entities = extractEntities(transcription.text, intent);

    res.json({
      success: true,
      data: {
        transcription: transcription.text,
        intent: intent,
        entities: entities,
        confidence: transcription.confidence,
        language: language
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Text-to-speech endpoint
router.post('/tts', async (req, res) => {
  try {
    const { text, language = 'hi-IN', voice = 'female' } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // In production, integrate with OpenAI TTS, Google TTS, or Coqui.ai
    // For demo, return mock response
    
    res.json({
      success: true,
      data: {
        audioUrl: `data:audio/mp3;base64,mock_audio_data`,
        text: text,
        language: language,
        voice: voice,
        duration: text.length * 0.1 // Mock duration
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get response for intent
router.post('/response', async (req, res) => {
  try {
    const { intent, entities, language = 'hi-IN', userData } = req.body;

    const responses = {
      balance: {
        'hi-IN': `आपके खाते में ₹${userData?.balance || 0} हैं।`,
        'or-IN': `ଆପଣଙ୍କ ଖାତାରେ ₹${userData?.balance || 0} ଅଛି।`,
        'ta-IN': `உங்கள் கணக்கில் ₹${userData?.balance || 0} உள்ளது.`,
        'te-IN': `మీ ఖాతాలో ₹${userData?.balance || 0} ఉంది.`,
        'en-IN': `Your account has ₹${userData?.balance || 0}.`
      },
      transfer: {
        'hi-IN': entities.amount 
          ? `₹${entities.amount} भेजने के लिए अपना पिन बोलिए।`
          : 'कितने रुपये भेजना चाहते हैं?',
        'or-IN': entities.amount
          ? `₹${entities.amount} ପଠାଇବାକୁ ନିଜ ପିନ୍ କୁହନ୍ତୁ।`
          : 'କେତେ ଟଙ୍କା ପଠାଇବାକୁ ଚାହାଁନ୍ତି?',
        'en-IN': entities.amount
          ? `Please say your PIN to send ₹${entities.amount}.`
          : 'How much money do you want to send?'
      },
      transactions: {
        'hi-IN': 'आपके पिछले 5 लेनदेन दिखाए जा रहे हैं।',
        'or-IN': 'ଆପଣଙ୍କର ଶେଷ 5 ଲେନ୍‌ଦେନ୍‌ ଦେଖାଯାଉଛି।',
        'en-IN': 'Showing your last 5 transactions.'
      },
      recharge: {
        'hi-IN': 'किस नंबर पर रिचार्ज करना है?',
        'or-IN': 'କେଉଁ ନମ୍ବରରେ ରିଚାର୍ଜ କରିବାକୁ?',
        'en-IN': 'Which number do you want to recharge?'
      },
      unknown: {
        'hi-IN': 'माफ़ करें, मैं समझ नहीं पाया। कृपया दोबारा कहें।',
        'or-IN': 'ଦୁଃଖିତ, ମୁଁ ବୁଝିପାରିଲି ନାହିଁ। ଦୟାକରି ପୁଣି କୁହନ୍ତୁ।',
        'en-IN': 'Sorry, I didn\'t understand. Please say again.'
      }
    };

    const response = responses[intent]?.[language] || responses.unknown[language];

    res.json({
      success: true,
      data: {
        response: response,
        intent: intent,
        requiresAuth: intent === 'transfer' || intent === 'recharge',
        nextStep: intent === 'transfer' && !entities.amount ? 'amount' : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get supported languages
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    data: {
      languages: Object.entries(languageConfig).map(([code, config]) => ({
        code: code,
        name: config.name,
        nativeName: config.name
      }))
    }
  });
});

module.exports = router;
