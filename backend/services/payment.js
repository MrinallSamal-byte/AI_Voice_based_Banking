const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  constructor() {
    // Razorpay Configuration
    this.razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    this.razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
    this.razorpayBaseUrl = 'https://api.razorpay.com/v1';

    // UPI Configuration
    this.upiVPA = process.env.UPI_VPA;
    this.merchantName = process.env.UPI_MERCHANT_NAME || 'Voice Banking';
    this.merchantCode = process.env.UPI_MERCHANT_CODE;

    // Transaction limits
    this.minAmount = parseInt(process.env.MIN_TRANSACTION_AMOUNT) || 1;
    this.maxAmount = parseInt(process.env.MAX_TRANSACTION_AMOUNT) || 50000;
    this.dailyLimit = parseInt(process.env.DAILY_TRANSACTION_LIMIT) || 100000;
  }

  /**
   * Create UPI payment request
   */
  async createUPIPayment(options) {
    try {
      const {
        amount,
        senderVPA,
        recipientVPA,
        description = 'Voice Banking Transfer',
        reference
      } = options;

      // Validate amount
      this.validateAmount(amount);

      const paymentData = {
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        method: 'upi',
        vpa: recipientVPA,
        description: description,
        notes: {
          sender_vpa: senderVPA,
          transaction_type: 'p2p',
          reference: reference || uuidv4()
        }
      };

      // In production, call actual UPI API
      if (this.razorpayKeyId && this.razorpaySecret) {
        return await this.razorpayUPITransfer(paymentData);
      }

      // Mock response for demo
      return this.mockUPITransfer(paymentData);
    } catch (error) {
      console.error('UPI payment error:', error);
      throw error;
    }
  }

  /**
   * Process UPI transfer via Razorpay
   */
  async razorpayUPITransfer(paymentData) {
    try {
      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');

      const response = await axios.post(
        `${this.razorpayBaseUrl}/payments`,
        paymentData,
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.id,
        status: response.data.status,
        amount: response.data.amount / 100,
        vpa: response.data.vpa,
        description: response.data.description,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Razorpay UPI transfer failed: ${error.message}`);
    }
  }

  /**
   * Mock UPI transfer for demo
   */
  mockUPITransfer(paymentData) {
    return {
      success: true,
      transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
      utrNumber: `UTR${Date.now()}`,
      status: 'success',
      amount: paymentData.amount / 100,
      vpa: paymentData.vpa,
      description: paymentData.description,
      timestamp: new Date(),
      mode: 'UPI'
    };
  }

  /**
   * Mobile/DTH recharge
   */
  async mobileRecharge(options) {
    try {
      const {
        mobileNumber,
        operator,
        amount,
        circle = 'National'
      } = options;

      this.validateAmount(amount);
      this.validateMobileNumber(mobileNumber);

      const rechargeData = {
        number: mobileNumber,
        operator: operator,
        amount: amount,
        circle: circle,
        transactionId: `RECH${Date.now()}`
      };

      // In production, integrate with recharge API (Paytm, Razorpay, etc.)
      return this.mockRecharge(rechargeData);
    } catch (error) {
      console.error('Recharge error:', error);
      throw error;
    }
  }

  /**
   * Mock recharge for demo
   */
  mockRecharge(rechargeData) {
    return {
      success: true,
      transactionId: rechargeData.transactionId,
      operatorRef: `OP${Date.now()}`,
      number: rechargeData.number,
      operator: rechargeData.operator,
      amount: rechargeData.amount,
      status: 'success',
      timestamp: new Date()
    };
  }

  /**
   * Bill payment (electricity, water, gas, etc.)
   */
  async billPayment(options) {
    try {
      const {
        billType,
        providerId,
        consumerNumber,
        amount,
        billerId
      } = options;

      this.validateAmount(amount);

      const billData = {
        type: billType,
        providerId: providerId,
        consumerNumber: consumerNumber,
        amount: amount,
        billerId: billerId,
        transactionId: `BILL${Date.now()}`
      };

      // In production, integrate with BBPS (Bharat Bill Payment System)
      return this.mockBillPayment(billData);
    } catch (error) {
      console.error('Bill payment error:', error);
      throw error;
    }
  }

  /**
   * Mock bill payment for demo
   */
  mockBillPayment(billData) {
    return {
      success: true,
      transactionId: billData.transactionId,
      billerId: billData.billerId,
      consumerNumber: billData.consumerNumber,
      amount: billData.amount,
      status: 'success',
      timestamp: new Date()
    };
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(transactionId) {
    try {
      // In production, query actual payment gateway
      if (this.razorpayKeyId && transactionId.startsWith('pay_')) {
        return await this.checkRazorpayStatus(transactionId);
      }

      // Mock status check
      return {
        transactionId: transactionId,
        status: 'success',
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Status check error:', error);
      throw error;
    }
  }

  /**
   * Check Razorpay transaction status
   */
  async checkRazorpayStatus(paymentId) {
    try {
      const auth = Buffer.from(`${this.razorpayKeyId}:${this.razorpaySecret}`).toString('base64');

      const response = await axios.get(
        `${this.razorpayBaseUrl}/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      return {
        transactionId: response.data.id,
        status: response.data.status,
        amount: response.data.amount / 100,
        method: response.data.method,
        timestamp: new Date(response.data.created_at * 1000)
      };
    } catch (error) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Get mobile operators
   */
  getMobileOperators() {
    return [
      { id: 'airtel', name: 'Airtel' },
      { id: 'jio', name: 'Jio' },
      { id: 'vi', name: 'Vi (Vodafone Idea)' },
      { id: 'bsnl', name: 'BSNL' },
      { id: 'mtnl', name: 'MTNL' }
    ];
  }

  /**
   * Get DTH operators
   */
  getDTHOperators() {
    return [
      { id: 'tatasky', name: 'Tata Play' },
      { id: 'airtel_dth', name: 'Airtel Digital TV' },
      { id: 'dish_tv', name: 'Dish TV' },
      { id: 'sun_direct', name: 'Sun Direct' },
      { id: 'd2h', name: 'D2H' }
    ];
  }

  /**
   * Get bill payment categories
   */
  getBillCategories() {
    return [
      { id: 'electricity', name: 'Electricity' },
      { id: 'water', name: 'Water' },
      { id: 'gas', name: 'Gas' },
      { id: 'broadband', name: 'Broadband' },
      { id: 'landline', name: 'Landline' },
      { id: 'insurance', name: 'Insurance' }
    ];
  }

  /**
   * Validate amount
   */
  validateAmount(amount) {
    if (!amount || isNaN(amount)) {
      throw new Error('Invalid amount');
    }

    if (amount < this.minAmount) {
      throw new Error(`Minimum amount is ₹${this.minAmount}`);
    }

    if (amount > this.maxAmount) {
      throw new Error(`Maximum amount is ₹${this.maxAmount}`);
    }

    return true;
  }

  /**
   * Validate mobile number
   */
  validateMobileNumber(number) {
    const mobileRegex = /^[6-9]\d{9}$/;
    
    if (!mobileRegex.test(number)) {
      throw new Error('Invalid mobile number format');
    }

    return true;
  }

  /**
   * Validate UPI VPA
   */
  validateUPIVPA(vpa) {
    const vpaRegex = /^[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+$/;
    
    if (!vpaRegex.test(vpa)) {
      throw new Error('Invalid UPI VPA format');
    }

    return true;
  }

  /**
   * Generate UPI QR code data
   */
  generateUPIQR(options) {
    const {
      vpa,
      name,
      amount,
      transactionId,
      note
    } = options;

    // UPI QR code format
    const qrData = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(name)}&am=${amount}&tr=${transactionId}&tn=${encodeURIComponent(note || 'Payment')}`;

    return {
      qrData: qrData,
      vpa: vpa,
      amount: amount,
      transactionId: transactionId
    };
  }

  /**
   * Calculate transaction fee
   */
  calculateFee(amount, transactionType) {
    // Most UPI transactions are free in India
    const fees = {
      'upi': 0,
      'transfer': 0,
      'recharge': 0,
      'bill_payment': 0
    };

    return fees[transactionType] || 0;
  }

  /**
   * Check daily transaction limit
   */
  async checkDailyLimit(userId, todayTotal, newAmount) {
    const projectedTotal = todayTotal + newAmount;

    if (projectedTotal > this.dailyLimit) {
      return {
        allowed: false,
        remaining: this.dailyLimit - todayTotal,
        limit: this.dailyLimit
      };
    }

    return {
      allowed: true,
      remaining: this.dailyLimit - projectedTotal,
      limit: this.dailyLimit
    };
  }
}

module.exports = new PaymentService();
