const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database
const database = require('./config/database');

// Import security middleware
const {
  apiRateLimiter,
  authRateLimiter,
  sanitizeInput,
  securityHeaders,
  securityLogger,
  corsOptions
} = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const bankingRoutes = require('./routes/banking');
const voiceRoutes = require('./routes/voice');
const smsRoutes = require('./routes/sms');
const ivrRoutes = require('./routes/ivr');
const advancedRoutes = require('./routes/advanced');
const qrcodeRoutes = require('./routes/qrcode');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(securityHeaders);
app.use(securityLogger);

// CORS
app.use(cors(corsOptions));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Rate limiting
app.use('/api/auth', authRateLimiter);
app.use('/api', apiRateLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/banking', bankingRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/ivr', ivrRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/qrcode', qrcodeRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server with database connection
const startServer = async () => {
  try {
    // Connect to database
    await database.connect();
    
    // Start listening
    app.listen(PORT, () => {
      console.log('╔═══════════════════════════════════════════════════════╗');
      console.log('║     🏦 Voice Banking System - Rural India             ║');
      console.log('╠═══════════════════════════════════════════════════════╣');
      console.log(`║  🚀 Server:      http://localhost:${PORT}              ║`);
      console.log(`║  📱 Environment: ${(process.env.NODE_ENV || 'development').padEnd(37)}║`);
      console.log(`║  🗣️  Languages:   ${process.env.SUPPORTED_LANGUAGES?.split(',').length || 9} regional languages     ║`);
      console.log(`║  📞 IVR Support: ${process.env.ENABLE_IVR_SUPPORT === 'true' ? 'Enabled ' : 'Disabled'}                    ║`);
      console.log(`║  📧 SMS Backup:  ${process.env.ENABLE_SMS_FALLBACK === 'true' ? 'Enabled ' : 'Disabled'}                    ║`);
      console.log(`║  🔐 Voiceprint:  ${process.env.ENABLE_VOICEPRINT_AUTH === 'true' ? 'Enabled ' : 'Disabled'}                    ║`);
      console.log('╚═══════════════════════════════════════════════════════╝');
      console.log('');
      console.log('📋 API Endpoints:');
      console.log('  - POST /api/auth/login          - User login');
      console.log('  - POST /api/auth/register       - User registration');
      console.log('  - POST /api/voice/process       - Voice command processing');
      console.log('  - GET  /api/banking/balance     - Check balance');
      console.log('  - POST /api/banking/transfer    - Transfer money');
      console.log('  - POST /api/sms/process         - SMS command processing');
      console.log('  - POST /api/ivr/welcome         - IVR call handling');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
