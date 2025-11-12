const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { users } = require('./auth');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// In-memory storage for advanced features
const beneficiaries = new Map();
const scheduledPayments = new Map();
const transactionDisputes = new Map();
const savingsGoals = new Map();
const balanceAlerts = new Map();
const billReminders = new Map();

/**
 * BENEFICIARY MANAGEMENT
 */

// Add beneficiary
router.post('/beneficiary/add', authenticateToken, (req, res) => {
  try {
    const { name, phone, nickname, accountNumber } = req.body;
    const userId = req.user.id;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Name and phone are required'
      });
    }

    const beneficiaryId = `BEN${Date.now()}`;
    const beneficiary = {
      id: beneficiaryId,
      userId,
      name,
      phone,
      nickname: nickname || name,
      accountNumber,
      addedAt: new Date(),
      isFavorite: false,
      transactionCount: 0
    };

    if (!beneficiaries.has(userId)) {
      beneficiaries.set(userId, []);
    }

    beneficiaries.get(userId).push(beneficiary);

    res.json({
      success: true,
      message: 'Beneficiary added successfully',
      data: { beneficiary }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all beneficiaries
router.get('/beneficiary/list', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userBeneficiaries = beneficiaries.get(userId) || [];

    res.json({
      success: true,
      data: {
        beneficiaries: userBeneficiaries,
        count: userBeneficiaries.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete beneficiary
router.delete('/beneficiary/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const beneficiaryId = req.params.id;
    const userBeneficiaries = beneficiaries.get(userId) || [];

    const index = userBeneficiaries.findIndex(b => b.id === beneficiaryId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Beneficiary not found'
      });
    }

    userBeneficiaries.splice(index, 1);
    beneficiaries.set(userId, userBeneficiaries);

    res.json({
      success: true,
      message: 'Beneficiary deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * SCHEDULED PAYMENTS
 */

// Create scheduled payment
router.post('/scheduled-payment/create', authenticateToken, (req, res) => {
  try {
    const { recipientPhone, amount, frequency, startDate, endDate, description } = req.body;
    const userId = req.user.id;

    if (!recipientPhone || !amount || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone, amount, frequency, and start date are required'
      });
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid frequency. Use: daily, weekly, monthly, quarterly, or yearly'
      });
    }

    const scheduleId = `SCH${Date.now()}`;
    const schedule = {
      id: scheduleId,
      userId,
      recipientPhone,
      amount,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      description: description || 'Scheduled payment',
      status: 'active',
      nextPaymentDate: new Date(startDate),
      totalExecutions: 0,
      createdAt: new Date()
    };

    if (!scheduledPayments.has(userId)) {
      scheduledPayments.set(userId, []);
    }

    scheduledPayments.get(userId).push(schedule);

    res.json({
      success: true,
      message: 'Scheduled payment created successfully',
      data: { schedule }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scheduled payments
router.get('/scheduled-payment/list', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userSchedules = scheduledPayments.get(userId) || [];

    res.json({
      success: true,
      data: {
        schedules: userSchedules,
        count: userSchedules.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel scheduled payment
router.delete('/scheduled-payment/:id', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const scheduleId = req.params.id;
    const userSchedules = scheduledPayments.get(userId) || [];

    const schedule = userSchedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: 'Scheduled payment not found'
      });
    }

    schedule.status = 'cancelled';

    res.json({
      success: true,
      message: 'Scheduled payment cancelled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TRANSACTION DISPUTES
 */

// Raise dispute
router.post('/dispute/raise', authenticateToken, (req, res) => {
  try {
    const { transactionId, reason, description } = req.body;
    const userId = req.user.id;

    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and reason are required'
      });
    }

    const disputeId = `DIS${Date.now()}`;
    const dispute = {
      id: disputeId,
      userId,
      transactionId,
      reason,
      description: description || '',
      status: 'pending',
      raisedAt: new Date(),
      resolvedAt: null,
      resolution: null
    };

    if (!transactionDisputes.has(userId)) {
      transactionDisputes.set(userId, []);
    }

    transactionDisputes.get(userId).push(dispute);

    res.json({
      success: true,
      message: 'Dispute raised successfully. We will investigate within 24 hours.',
      data: { dispute }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user disputes
router.get('/dispute/list', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userDisputes = transactionDisputes.get(userId) || [];

    res.json({
      success: true,
      data: {
        disputes: userDisputes,
        count: userDisputes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * SAVINGS GOALS
 */

// Create savings goal
router.post('/savings-goal/create', authenticateToken, (req, res) => {
  try {
    const { name, targetAmount, targetDate, description } = req.body;
    const userId = req.user.id;

    if (!name || !targetAmount || !targetDate) {
      return res.status(400).json({
        success: false,
        error: 'Name, target amount, and target date are required'
      });
    }

    const goalId = `GOAL${Date.now()}`;
    const goal = {
      id: goalId,
      userId,
      name,
      targetAmount,
      currentAmount: 0,
      targetDate: new Date(targetDate),
      description: description || '',
      status: 'active',
      createdAt: new Date()
    };

    if (!savingsGoals.has(userId)) {
      savingsGoals.set(userId, []);
    }

    savingsGoals.get(userId).push(goal);

    res.json({
      success: true,
      message: 'Savings goal created successfully',
      data: { goal }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Add money to savings goal
router.post('/savings-goal/:id/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    const { amount, pin } = req.body;

    if (!amount || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Amount and PIN are required'
      });
    }

    const user = users.get(req.user.phone);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify PIN
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, user.pin);

    if (!isValidPin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid PIN'
      });
    }

    if (user.balance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    const userGoals = savingsGoals.get(userId) || [];
    const goal = userGoals.find(g => g.id === goalId);

    if (!goal) {
      return res.status(404).json({
        success: false,
        error: 'Savings goal not found'
      });
    }

    // Deduct from user balance
    user.balance -= amount;
    users.set(user.phone, user);

    // Add to goal
    goal.currentAmount += amount;
    
    // Check if goal achieved
    if (goal.currentAmount >= goal.targetAmount) {
      goal.status = 'completed';
    }

    res.json({
      success: true,
      message: `₹${amount} added to ${goal.name}`,
      data: {
        goal,
        newBalance: user.balance,
        progress: Math.round((goal.currentAmount / goal.targetAmount) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get savings goals
router.get('/savings-goal/list', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userGoals = savingsGoals.get(userId) || [];

    res.json({
      success: true,
      data: {
        goals: userGoals,
        count: userGoals.length,
        totalSaved: userGoals.reduce((sum, g) => sum + g.currentAmount, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * BALANCE ALERTS
 */

// Set balance alert
router.post('/alert/balance/set', authenticateToken, (req, res) => {
  try {
    const { threshold, alertType } = req.body;
    const userId = req.user.id;

    if (!threshold || !alertType) {
      return res.status(400).json({
        success: false,
        error: 'Threshold and alert type are required'
      });
    }

    const validTypes = ['low', 'high', 'daily'];
    if (!validTypes.includes(alertType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid alert type. Use: low, high, or daily'
      });
    }

    const alert = {
      userId,
      threshold,
      alertType,
      enabled: true,
      createdAt: new Date()
    };

    balanceAlerts.set(userId, alert);

    res.json({
      success: true,
      message: 'Balance alert configured successfully',
      data: { alert }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get balance alert settings
router.get('/alert/balance', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const alert = balanceAlerts.get(userId);

    res.json({
      success: true,
      data: { alert: alert || null }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * BILL REMINDERS
 */

// Add bill reminder
router.post('/reminder/bill/add', authenticateToken, (req, res) => {
  try {
    const { billerName, amount, dueDate, category, recurring } = req.body;
    const userId = req.user.id;

    if (!billerName || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Biller name, amount, and due date are required'
      });
    }

    const reminderId = `REM${Date.now()}`;
    const reminder = {
      id: reminderId,
      userId,
      billerName,
      amount,
      dueDate: new Date(dueDate),
      category: category || 'utility',
      recurring: recurring || false,
      status: 'pending',
      paid: false,
      createdAt: new Date()
    };

    if (!billReminders.has(userId)) {
      billReminders.set(userId, []);
    }

    billReminders.get(userId).push(reminder);

    res.json({
      success: true,
      message: 'Bill reminder added successfully',
      data: { reminder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get bill reminders
router.get('/reminder/bill/list', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const userReminders = billReminders.get(userId) || [];

    // Sort by due date
    const sortedReminders = userReminders.sort((a, b) => 
      new Date(a.dueDate) - new Date(b.dueDate)
    );

    // Get upcoming reminders (within 7 days)
    const today = new Date();
    const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingReminders = sortedReminders.filter(r => 
      new Date(r.dueDate) >= today && new Date(r.dueDate) <= sevenDaysLater && !r.paid
    );

    res.json({
      success: true,
      data: {
        reminders: sortedReminders,
        upcoming: upcomingReminders,
        count: sortedReminders.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Mark bill as paid
router.put('/reminder/bill/:id/paid', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const reminderId = req.params.id;
    const userReminders = billReminders.get(userId) || [];

    const reminder = userReminders.find(r => r.id === reminderId);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Bill reminder not found'
      });
    }

    reminder.paid = true;
    reminder.status = 'completed';
    reminder.paidAt = new Date();

    res.json({
      success: true,
      message: 'Bill marked as paid',
      data: { reminder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * MINI STATEMENT
 */

// Get mini statement (last 5 transactions)
router.get('/statement/mini', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.phone);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Mock mini statement (in production, fetch from transactions)
    const miniStatement = {
      accountNumber: user.accountNumber,
      name: user.name,
      balance: user.balance,
      currency: 'INR',
      lastFiveTransactions: [
        { date: new Date(), type: 'credit', amount: 500, description: 'Received from Ramesh' },
        { date: new Date(Date.now() - 86400000), type: 'debit', amount: 300, description: 'Mobile recharge' },
        { date: new Date(Date.now() - 172800000), type: 'debit', amount: 1000, description: 'Sent to Suresh' },
        { date: new Date(Date.now() - 259200000), type: 'credit', amount: 2000, description: 'Salary credit' },
        { date: new Date(Date.now() - 345600000), type: 'debit', amount: 150, description: 'Bill payment' }
      ],
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: miniStatement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * TRANSACTION ANALYTICS
 */

// Get transaction analytics
router.get('/analytics/transactions', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const user = users.get(req.user.phone);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Mock analytics (in production, calculate from real transactions)
    const analytics = {
      period: 'last_30_days',
      totalSpent: 5250,
      totalReceived: 8500,
      netChange: 3250,
      transactionCount: 45,
      averageTransaction: 305,
      categoryBreakdown: {
        transfers: { count: 15, amount: 3500 },
        recharge: { count: 8, amount: 1200 },
        bills: { count: 5, amount: 550 },
        others: { count: 17, amount: 0 }
      },
      topRecipients: [
        { name: 'Ramesh Kumar', count: 8, amount: 2400 },
        { name: 'Suresh Patel', count: 5, amount: 1500 }
      ],
      monthlyTrend: [
        { month: 'Jan', spent: 4200, received: 8000 },
        { month: 'Feb', spent: 5250, received: 8500 }
      ]
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
