const crypto = require('crypto');
const NodeCache = require('node-cache');

// Cache for voiceprint comparisons (5 minute TTL)
const cache = new NodeCache({ stdTTL: 300 });

class VoiceprintService {
  constructor() {
    this.threshold = parseFloat(process.env.VOICEPRINT_THRESHOLD) || 0.85;
    this.minSamples = parseInt(process.env.VOICEPRINT_MIN_SAMPLES) || 3;
    this.maxSamples = 10;
  }

  /**
   * Extract voice features from audio buffer
   * In production, use advanced audio processing libraries like:
   * - librosa (Python binding)
   * - Mel-frequency cepstral coefficients (MFCCs)
   * - Deep learning models for speaker recognition
   */
  async extractFeatures(audioBuffer) {
    try {
      // For demo, create a hash-based "fingerprint"
      // In production, use proper audio feature extraction
      const hash = crypto
        .createHash('sha256')
        .update(audioBuffer)
        .digest('hex');

      // Simulate feature vector (in production, this would be MFCC or deep features)
      const features = {
        hash: hash,
        length: audioBuffer.length,
        spectralFeatures: this.simulateSpectralFeatures(audioBuffer),
        timestamp: new Date()
      };

      return features;
    } catch (error) {
      console.error('Feature extraction error:', error);
      throw new Error('Failed to extract voice features');
    }
  }

  /**
   * Simulate spectral features (replace with real MFCC extraction in production)
   */
  simulateSpectralFeatures(audioBuffer) {
    // In production, extract real audio features:
    // - Mel-frequency cepstral coefficients (MFCCs)
    // - Pitch, formants, duration
    // - Deep embeddings (x-vectors, d-vectors)
    
    const features = [];
    const samples = Math.min(100, audioBuffer.length);
    
    for (let i = 0; i < samples; i += Math.floor(audioBuffer.length / samples)) {
      features.push(audioBuffer[i] / 255); // Normalize
    }
    
    return features;
  }

  /**
   * Create a voiceprint from audio samples
   */
  async createVoiceprint(audioSamples) {
    try {
      if (!Array.isArray(audioSamples) || audioSamples.length < this.minSamples) {
        throw new Error(`At least ${this.minSamples} audio samples required`);
      }

      // Extract features from all samples
      const featureSets = await Promise.all(
        audioSamples.map(sample => this.extractFeatures(sample))
      );

      // Create average/representative voiceprint
      const voiceprint = {
        id: crypto.randomUUID(),
        features: this.averageFeatures(featureSets),
        sampleCount: audioSamples.length,
        createdAt: new Date(),
        metadata: {
          avgLength: audioSamples.reduce((sum, s) => sum + s.length, 0) / audioSamples.length,
          quality: this.assessQuality(featureSets)
        }
      };

      return voiceprint;
    } catch (error) {
      console.error('Voiceprint creation error:', error);
      throw error;
    }
  }

  /**
   * Average features from multiple samples
   */
  averageFeatures(featureSets) {
    const avgSpectral = [];
    const featureLength = Math.min(...featureSets.map(f => f.spectralFeatures.length));

    for (let i = 0; i < featureLength; i++) {
      const sum = featureSets.reduce((acc, f) => acc + (f.spectralFeatures[i] || 0), 0);
      avgSpectral.push(sum / featureSets.length);
    }

    return {
      spectral: avgSpectral,
      hashes: featureSets.map(f => f.hash)
    };
  }

  /**
   * Assess voiceprint quality
   */
  assessQuality(featureSets) {
    // Calculate consistency across samples
    const lengths = featureSets.map(f => f.spectralFeatures.length);
    const avgLength = lengths.reduce((a, b) => a + b) / lengths.length;
    const variance = lengths.reduce((acc, len) => acc + Math.pow(len - avgLength, 2), 0) / lengths.length;
    
    const consistency = 1 / (1 + variance);
    
    if (consistency > 0.8) return 'high';
    if (consistency > 0.6) return 'medium';
    return 'low';
  }

  /**
   * Verify audio against stored voiceprint
   */
  async verify(audioBuffer, storedVoiceprint) {
    try {
      // Check cache
      const cacheKey = `verify_${storedVoiceprint.id}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('✅ Using cached verification result');
        return cached;
      }

      // Extract features from input audio
      const inputFeatures = await this.extractFeatures(audioBuffer);

      // Calculate similarity score
      const similarityScore = this.calculateSimilarity(
        inputFeatures,
        storedVoiceprint.features
      );

      const result = {
        match: similarityScore >= this.threshold,
        confidence: similarityScore,
        threshold: this.threshold,
        timestamp: new Date()
      };

      // Cache result
      cache.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Voice verification error:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two feature sets
   * Using cosine similarity (in production, use more sophisticated methods)
   */
  calculateSimilarity(features1, features2) {
    const f1 = features1.spectralFeatures;
    const f2 = features2.spectral;

    if (!f1 || !f2 || f1.length === 0 || f2.length === 0) {
      return 0;
    }

    // Cosine similarity
    const minLength = Math.min(f1.length, f2.length);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < minLength; i++) {
      dotProduct += f1[i] * f2[i];
      norm1 += f1[i] * f1[i];
      norm2 += f2[i] * f2[i];
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, (similarity + 1) / 2));
  }

  /**
   * Update voiceprint with new sample
   */
  async updateVoiceprint(currentVoiceprint, newAudioBuffer) {
    try {
      const newFeatures = await this.extractFeatures(newAudioBuffer);
      
      // Add new features to existing ones
      currentVoiceprint.features.hashes.push(newFeatures.hash);
      
      // Keep only recent samples
      if (currentVoiceprint.features.hashes.length > this.maxSamples) {
        currentVoiceprint.features.hashes.shift();
      }

      // Recalculate average spectral features
      // (simplified - in production, maintain running average)
      currentVoiceprint.sampleCount++;
      currentVoiceprint.updatedAt = new Date();

      return currentVoiceprint;
    } catch (error) {
      console.error('Voiceprint update error:', error);
      throw error;
    }
  }

  /**
   * Validate audio quality for voiceprint
   */
  validateAudioQuality(audioBuffer) {
    const minSize = 5000; // 5KB minimum
    const maxSize = 10 * 1024 * 1024; // 10MB maximum

    if (audioBuffer.length < minSize) {
      return {
        valid: false,
        reason: 'Audio too short for voiceprint analysis'
      };
    }

    if (audioBuffer.length > maxSize) {
      return {
        valid: false,
        reason: 'Audio file too large'
      };
    }

    return { valid: true };
  }

  /**
   * Detect liveness (anti-spoofing)
   * In production, implement proper liveness detection
   */
  async detectLiveness(audioBuffer) {
    // In production, check for:
    // 1. Background noise patterns
    // 2. Natural speech variations
    // 3. Replay attack detection
    // 4. Deep fake detection
    
    // For demo, simple check
    const entropy = this.calculateEntropy(audioBuffer);
    
    return {
      isLive: entropy > 0.5,
      confidence: entropy,
      timestamp: new Date()
    };
  }

  /**
   * Calculate audio entropy (simplified)
   */
  calculateEntropy(audioBuffer) {
    const frequencies = new Map();
    
    for (let i = 0; i < Math.min(1000, audioBuffer.length); i++) {
      const byte = audioBuffer[i];
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }

    let entropy = 0;
    const total = Math.min(1000, audioBuffer.length);

    for (const count of frequencies.values()) {
      const probability = count / total;
      entropy -= probability * Math.log2(probability);
    }

    // Normalize
    return Math.min(1, entropy / 8);
  }

  /**
   * Generate voiceprint enrollment challenge
   */
  generateEnrollmentChallenge(language = 'hi-IN') {
    const challenges = {
      'hi-IN': [
        'कृपया अपना नाम बोलें',
        'आपके खाते का पिन नंबर बोलें',
        'आज की तारीख बोलें'
      ],
      'or-IN': [
        'ଦୟାକରି ଆପଣଙ୍କ ନାମ କୁହନ୍ତୁ',
        'ଆପଣଙ୍କ ପିନ୍ ନମ୍ବର କୁହନ୍ତୁ',
        'ଆଜିର ତାରିଖ କୁହନ୍ତୁ'
      ],
      'en-IN': [
        'Please say your name',
        'Say your PIN number',
        'Tell me today\'s date'
      ]
    };

    const langChallenges = challenges[language] || challenges['en-IN'];
    return langChallenges[Math.floor(Math.random() * langChallenges.length)];
  }
}

module.exports = new VoiceprintService();
