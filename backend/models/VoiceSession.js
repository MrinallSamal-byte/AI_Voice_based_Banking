const mongoose = require('mongoose');

const voiceSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  phone: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  interactions: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    audioUrl: String,
    audioLength: Number,
    transcription: String,
    intent: String,
    confidence: Number,
    entities: mongoose.Schema.Types.Mixed,
    response: String,
    responseAudioUrl: String,
    success: Boolean,
    errorMessage: String
  }],
  context: {
    currentIntent: String,
    awaitingConfirmation: Boolean,
    pendingAmount: Number,
    pendingRecipient: String,
    step: String
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: Date,
  duration: Number,
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'completed', 'timeout', 'error']
  },
  completedActions: [{
    action: String,
    result: String,
    timestamp: Date
  }]
}, {
  timestamps: true
});

// TTL index to auto-delete old sessions after 24 hours
voiceSessionSchema.index({ startTime: 1 }, { expireAfterSeconds: 86400 });
voiceSessionSchema.index({ userId: 1, startTime: -1 });

module.exports = mongoose.model('VoiceSession', voiceSessionSchema);
