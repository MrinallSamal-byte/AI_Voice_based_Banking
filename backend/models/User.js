const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  pin: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'hi-IN',
    enum: ['hi-IN', 'or-IN', 'bn-IN', 'ta-IN', 'te-IN', 'kn-IN', 'mr-IN', 'gu-IN', 'en-IN']
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true
  },
  voicePrint: {
    type: String,
    default: null
  },
  voiceSamples: [{
    data: Buffer,
    timestamp: Date
  }],
  contacts: [{
    name: String,
    phone: String,
    nickname: String
  }],
  preferences: {
    smsAlerts: {
      type: Boolean,
      default: true
    },
    voiceSpeed: {
      type: String,
      default: 'normal',
      enum: ['slow', 'normal', 'fast']
    },
    voiceGender: {
      type: String,
      default: 'female',
      enum: ['male', 'female']
    }
  },
  securitySettings: {
    loginAttempts: {
      type: Number,
      default: 0
    },
    lockedUntil: Date,
    twoFactorEnabled: {
      type: Boolean,
      default: false
    }
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ phone: 1, accountNumber: 1 });

module.exports = mongoose.model('User', userSchema);
