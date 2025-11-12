const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Security Middleware Collection
 */

/**
 * Rate limiting middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message = 'Too many requests, please try again later.'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: message
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many login attempts, please try again after 15 minutes.'
});

/**
 * Voice API rate limiter
 */
const voiceRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many voice requests, please wait a moment.'
});

/**
 * General API rate limiter
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Rate limit exceeded, please try again later.'
});

/**
 * Encryption utilities
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
    this.key = this.getEncryptionKey();
  }

  getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length < this.keyLength) {
      console.warn('⚠️  Encryption key not set or too short. Using default (insecure for production).');
      return crypto.randomBytes(this.keyLength);
    }
    return Buffer.from(key.padEnd(this.keyLength, '0').slice(0, this.keyLength));
  }

  /**
   * Encrypt data
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate secure random string
   */
  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate PIN
   */
  generatePIN(length = 4) {
    let pin = '';
    for (let i = 0; i < length; i++) {
      pin += Math.floor(Math.random() * 10);
    }
    return pin;
  }
}

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Remove potentially dangerous characters from inputs
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove script tags, SQL injection attempts, etc.
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

/**
 * Request validation middleware
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }
    
    next();
  };
};

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',');
    
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Request logging for security audit
 */
const securityLogger = (req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || 'anonymous'
  };

  // Log suspicious activities
  if (req.path.includes('..') || req.path.includes('etc/passwd')) {
    console.warn('🚨 Suspicious request detected:', logData);
  }

  next();
};

/**
 * Anti-CSRF token middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || token !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  next();
};

/**
 * Generate CSRF token
 */
const generateCSRFToken = (req) => {
  if (!req.session) {
    throw new Error('Session not initialized');
  }

  const token = crypto.randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  return token;
};

const encryptionService = new EncryptionService();

module.exports = {
  // Rate limiters
  authRateLimiter,
  voiceRateLimiter,
  apiRateLimiter,
  createRateLimiter,

  // Encryption
  encryptionService,

  // Middleware
  sanitizeInput,
  validateRequest,
  corsOptions,
  securityHeaders,
  securityLogger,
  csrfProtection,
  generateCSRFToken
};
