const axios = require('axios');
const FormData = require('form-data');
const NodeCache = require('node-cache');

// Cache for API responses (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

class VoiceRecognitionService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.whisperEndpoint = 'https://api.openai.com/v1/audio/transcriptions';
    
    // Language model mappings
    this.languageModels = {
      'hi-IN': 'hi',
      'or-IN': 'or',
      'bn-IN': 'bn',
      'ta-IN': 'ta',
      'te-IN': 'te',
      'kn-IN': 'kn',
      'mr-IN': 'mr',
      'gu-IN': 'gu',
      'en-IN': 'en'
    };
  }

  /**
   * Convert speech to text using OpenAI Whisper
   */
  async speechToText(audioBuffer, language = 'hi-IN', options = {}) {
    try {
      // Check cache
      const cacheKey = `stt_${Buffer.from(audioBuffer).toString('base64').slice(0, 50)}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached transcription');
        return cached;
      }

      const formData = new FormData();
      formData.append('file', audioBuffer, {
        filename: 'audio.wav',
        contentType: 'audio/wav'
      });
      formData.append('model', 'whisper-1');
      formData.append('language', this.languageModels[language] || 'hi');
      formData.append('response_format', 'verbose_json');

      if (options.prompt) {
        formData.append('prompt', options.prompt);
      }

      const response = await axios.post(this.whisperEndpoint, formData, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          ...formData.getHeaders()
        },
        timeout: 30000
      });

      const result = {
        text: response.data.text,
        language: response.data.language,
        duration: response.data.duration,
        confidence: this.calculateConfidence(response.data),
        segments: response.data.segments || [],
        timestamp: new Date()
      };

      // Cache result
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Speech-to-text error:', error.response?.data || error.message);
      throw new Error(`Voice recognition failed: ${error.message}`);
    }
  }

  /**
   * Batch process multiple audio files
   */
  async batchSpeechToText(audioBuffers, language = 'hi-IN') {
    const promises = audioBuffers.map(buffer => 
      this.speechToText(buffer, language).catch(err => ({
        error: err.message,
        success: false
      }))
    );

    return Promise.all(promises);
  }

  /**
   * Calculate confidence score from Whisper response
   */
  calculateConfidence(whisperData) {
    if (!whisperData.segments || whisperData.segments.length === 0) {
      return 0.5;
    }

    // Average confidence from all segments
    const avgConfidence = whisperData.segments.reduce((sum, seg) => {
      return sum + (seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.5);
    }, 0) / whisperData.segments.length;

    return Math.max(0, Math.min(1, avgConfidence));
  }

  /**
   * Validate audio quality before processing
   */
  validateAudio(audioBuffer) {
    const minSize = 1000; // 1KB minimum
    const maxSize = 25 * 1024 * 1024; // 25MB maximum

    if (audioBuffer.length < minSize) {
      throw new Error('Audio file too small. Minimum 1KB required.');
    }

    if (audioBuffer.length > maxSize) {
      throw new Error('Audio file too large. Maximum 25MB allowed.');
    }

    return true;
  }

  /**
   * Enhance audio for better recognition (noise reduction, etc.)
   */
  async enhanceAudio(audioBuffer) {
    // In production, use audio processing libraries like ffmpeg
    // For now, return original buffer
    return audioBuffer;
  }

  /**
   * Detect language from audio
   */
  async detectLanguage(audioBuffer) {
    try {
      const result = await this.speechToText(audioBuffer, 'en-IN', {
        prompt: 'Detect the language being spoken'
      });

      return {
        language: result.language,
        confidence: result.confidence
      };
    } catch (error) {
      throw new Error(`Language detection failed: ${error.message}`);
    }
  }

  /**
   * Create voice fingerprint for authentication
   */
  async createVoicePrint(audioSamples) {
    // In production, use voice biometric APIs like Azure Speaker Recognition
    // For now, create a simple hash-based fingerprint
    
    const features = audioSamples.map(sample => {
      const buffer = Buffer.from(sample);
      return buffer.toString('base64').slice(0, 100);
    }).join(':');

    const crypto = require('crypto');
    return crypto.createHash('sha256').update(features).digest('hex');
  }

  /**
   * Verify voice against stored voiceprint
   */
  async verifyVoice(audioBuffer, storedVoicePrint) {
    // Mock verification - in production use proper voice biometrics
    const currentPrint = await this.createVoicePrint([audioBuffer]);
    
    // Simulate 85% accuracy
    const similarity = Math.random();
    
    return {
      match: similarity > 0.15,
      confidence: similarity,
      voicePrint: currentPrint
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    cache.flushAll();
  }
}

module.exports = new VoiceRecognitionService();
