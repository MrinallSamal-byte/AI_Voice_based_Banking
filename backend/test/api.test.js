/**
 * API Test Suite for Voice Banking System
 * Run with: npm test or node test/api.test.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = null;

// Test user credentials
const testUser = {
  phone: '9876543210',
  pin: '1234'
};

// Helper function for API calls
async function apiCall(method, endpoint, data = null, useAuth = false) {
  const config = {
    method,
    url: `${API_BASE}${endpoint}`,
    headers: {}
  };

  if (useAuth && authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  if (data) {
    config.headers['Content-Type'] = 'application/json';
    config.data = data;
  }

  try {
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Test cases
const tests = {
  async testHealthCheck() {
    console.log('\n🔍 Testing health check...');
    try {
      const response = await axios.get('http://localhost:5000/health');
      if (response.data.status === 'OK') {
        console.log('✅ Health check passed');
        return true;
      }
    } catch (error) {
      console.log('❌ Health check failed - Is server running?');
    }
    return false;
  },

  async testLogin() {
    console.log('\n🔍 Testing login...');
    const result = await apiCall('POST', '/auth/login', testUser);
    
    if (result.success && result.data.data.token) {
      authToken = result.data.data.token;
      console.log('✅ Login successful');
      return true;
    }
    console.log('❌ Login failed');
    return false;
  },

  async testGetBalance() {
    console.log('\n🔍 Testing get balance...');
    const result = await apiCall('GET', '/banking/balance', null, true);
    
    if (result.success && result.data.data.balance !== undefined) {
      console.log('✅ Balance:', result.data.data.balance);
      return true;
    }
    console.log('❌ Get balance failed');
    return false;
  },

  async testAddBeneficiary() {
    console.log('\n🔍 Testing add beneficiary...');
    const result = await apiCall('POST', '/advanced/beneficiary/add', {
      name: 'Test User',
      phone: '9123456789',
      nickname: 'Friend'
    }, true);
    
    if (result.success) {
      console.log('✅ Beneficiary added');
      return true;
    }
    console.log('❌ Add beneficiary failed');
    return false;
  },

  async testCreateSavingsGoal() {
    console.log('\n🔍 Testing create savings goal...');
    const result = await apiCall('POST', '/advanced/savings-goal/create', {
      name: 'Emergency Fund',
      targetAmount: 10000,
      targetDate: '2024-12-31'
    }, true);
    
    if (result.success) {
      console.log('✅ Savings goal created');
      return true;
    }
    console.log('❌ Create savings goal failed');
    return false;
  },

  async testGenerateQRCode() {
    console.log('\n🔍 Testing QR code generation...');
    const result = await apiCall('POST', '/qrcode/generate', {
      amount: 100,
      note: 'Test payment'
    }, true);
    
    if (result.success && result.data.data.qrCode) {
      console.log('✅ QR code generated');
      return true;
    }
    console.log('❌ QR code generation failed');
    return false;
  }
};

// Run tests
async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     🧪 Voice Banking System - API Test Suite         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  
  const results = { passed: 0, failed: 0, total: 0 };
  
  for (const [name, test] of Object.entries(tests)) {
    results.total++;
    try {
      if (await test()) results.passed++;
      else results.failed++;
    } catch (error) {
      console.log(`❌ ${name}:`, error.message);
      results.failed++;
    }
  }
  
  console.log('\n' + '═'.repeat(56));
  console.log(`Tests: ${results.passed}/${results.total} passed`);
  console.log('═'.repeat(56) + '\n');
  
  return results.failed === 0;
}

if (require.main === module) {
  runTests().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runTests };
