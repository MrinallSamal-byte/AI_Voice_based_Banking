/**
 * Environment Variable Validation
 * Validates all required environment variables on startup
 */

const validators = {
  // Required variables
  required: [
    'MONGODB_URI',
    'JWT_SECRET'
  ],
  
  // Optional but recommended
  recommended: [
    'OPENAI_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ],
  
  // Validation functions
  validate: {
    MONGODB_URI: (value) => {
      if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
        return 'Must start with mongodb:// or mongodb+srv://';
      }
      return null;
    },
    
    JWT_SECRET: (value) => {
      if (value.length < 32) {
        return 'Should be at least 32 characters for security';
      }
      return null;
    },
    
    PORT: (value) => {
      const port = parseInt(value);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'Must be a valid port number (1-65535)';
      }
      return null;
    },
    
    DAILY_TRANSFER_LIMIT: (value) => {
      const limit = parseInt(value);
      if (isNaN(limit) || limit < 0) {
        return 'Must be a positive number';
      }
      return null;
    },
    
    TWILIO_PHONE_NUMBER: (value) => {
      if (value && !value.startsWith('+')) {
        return 'Should start with + followed by country code';
      }
      return null;
    }
  }
};

/**
 * Validate environment variables
 */
function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');
  
  const errors = [];
  const warnings = [];
  
  // Check required variables
  validators.required.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      errors.push(`❌ Missing required variable: ${varName}`);
    } else if (validators.validate[varName]) {
      const error = validators.validate[varName](value);
      if (error) {
        errors.push(`❌ Invalid ${varName}: ${error}`);
      }
    }
  });
  
  // Check recommended variables
  validators.recommended.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      warnings.push(`⚠️  Recommended variable not set: ${varName}`);
    } else if (validators.validate[varName]) {
      const error = validators.validate[varName](value);
      if (error) {
        warnings.push(`⚠️  ${varName}: ${error}`);
      }
    }
  });
  
  // Validate optional variables that are set
  Object.keys(validators.validate).forEach(varName => {
    if (!validators.required.includes(varName) && 
        !validators.recommended.includes(varName) && 
        process.env[varName]) {
      const error = validators.validate[varName](process.env[varName]);
      if (error) {
        warnings.push(`⚠️  ${varName}: ${error}`);
      }
    }
  });
  
  // Display results
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables validated successfully!\n');
    return true;
  }
  
  if (errors.length > 0) {
    console.error('❌ Environment Validation Errors:\n');
    errors.forEach(err => console.error(`   ${err}`));
    console.error('');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Environment Validation Warnings:\n');
    warnings.forEach(warn => console.warn(`   ${warn}`));
    console.warn('');
  }
  
  if (errors.length > 0) {
    console.error('❌ Cannot start server due to validation errors.');
    console.error('   Please check your .env file and set all required variables.\n');
    return false;
  }
  
  console.log('✅ Environment validation passed (with warnings)\n');
  return true;
}

/**
 * Display environment configuration
 */
function displayConfiguration() {
  console.log('⚙️  Configuration Summary:');
  console.log('   Environment:', process.env.NODE_ENV || 'development');
  console.log('   Port:', process.env.PORT || '5000');
  console.log('   MongoDB:', process.env.MONGODB_URI ? '✓ Configured' : '✗ Not configured');
  console.log('   JWT Secret:', process.env.JWT_SECRET ? '✓ Set' : '✗ Not set');
  console.log('   OpenAI API:', process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured');
  console.log('   Twilio SMS:', process.env.TWILIO_ACCOUNT_SID ? '✓ Configured' : '✗ Not configured');
  console.log('   Razorpay:', process.env.RAZORPAY_KEY_ID ? '✓ Configured' : '✗ Not configured');
  console.log('');
  
  // Feature flags
  console.log('🚀 Feature Flags:');
  console.log('   QR Payments:', process.env.ENABLE_QR_PAYMENTS !== 'false' ? '✓ Enabled' : '✗ Disabled');
  console.log('   Scheduled Payments:', process.env.ENABLE_SCHEDULED_PAYMENTS !== 'false' ? '✓ Enabled' : '✗ Disabled');
  console.log('   Savings Goals:', process.env.ENABLE_SAVINGS_GOALS !== 'false' ? '✓ Enabled' : '✗ Disabled');
  console.log('   Bill Reminders:', process.env.ENABLE_BILL_REMINDERS !== 'false' ? '✓ Enabled' : '✗ Disabled');
  console.log('');
  
  // Limits
  console.log('💰 Transaction Limits:');
  console.log('   Daily Transfer Limit: ₹' + (process.env.DAILY_TRANSFER_LIMIT || '50,000'));
  console.log('   Max Single Transfer: ₹' + (process.env.MAX_TRANSFER_AMOUNT || '25,000'));
  console.log('   Min Transfer Amount: ₹' + (process.env.MIN_TRANSFER_AMOUNT || '1'));
  console.log('');
}

module.exports = {
  validateEnvironment,
  displayConfiguration
};
