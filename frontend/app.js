// Voice Banking - Frontend JavaScript
// Complete voice interaction handler

class VoiceBankingApp {
  constructor() {
    this.API_BASE = 'http://localhost:5000/api';
    this.currentUser = null;
    this.token = null;
    this.language = 'hi-IN';
    this.isRecording = false;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.sessionId = null;
    
    this.init();
  }

  init() {
    // Load saved data
    this.loadFromStorage();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Check authentication
    if (this.token) {
      this.showBankingScreen();
      this.loadUserData();
    } else {
      this.showLoginScreen();
    }
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Voice login button
    const voiceLoginBtn = document.getElementById('voiceLoginBtn');
    if (voiceLoginBtn) {
      voiceLoginBtn.addEventListener('click', () => this.handleVoiceLogin());
    }

    // Language selector
    const languageSelect = document.getElementById('languageSelect');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.language = e.target.value;
        localStorage.setItem('language', this.language);
        this.updateUILanguage();
      });
    }

    // Main voice button
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
    }

    // Refresh balance
    const refreshBalanceBtn = document.getElementById('refreshBalanceBtn');
    if (refreshBalanceBtn) {
      refreshBalanceBtn.addEventListener('click', () => this.loadBalance());
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  // Authentication Methods
  async handleLogin(e) {
    e.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const pin = document.getElementById('loginPin').value;

    try {
      this.showLoading('Logging in...');

      const response = await fetch(`${this.API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone, pin })
      });

      const data = await response.json();

      if (data.success) {
        this.token = data.data.token;
        this.currentUser = data.data.user;
        this.language = data.data.user.language || 'hi-IN';
        
        this.saveToStorage();
        this.showBankingScreen();
        this.loadUserData();
        this.showSuccess('Login successful!');
      } else {
        this.showError(data.error || 'Login failed');
      }
    } catch (error) {
      this.showError('Connection error. Please try again.');
      console.error('Login error:', error);
    } finally {
      this.hideLoading();
    }
  }

  async handleVoiceLogin() {
    this.showInfo('Voice login feature coming soon!');
  }

  handleLogout() {
    this.token = null;
    this.currentUser = null;
    localStorage.clear();
    this.showLoginScreen();
    this.showSuccess('Logged out successfully');
  }

  // Voice Recording Methods
  async toggleVoiceRecording() {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }

  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.processVoiceCommand(audioBlob);
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      
      // Update UI
      this.updateVoiceUI('recording');
      this.updateVoiceStatus('Listening... Speak now');

    } catch (error) {
      this.showError('Microphone access denied. Please allow microphone access.');
      console.error('Recording error:', error);
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      
      // Update UI
      this.updateVoiceUI('processing');
      this.updateVoiceStatus('Processing...');
    }
  }

  async processVoiceCommand(audioBlob) {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice-command.wav');
      formData.append('language', this.language);
      formData.append('sessionId', this.sessionId || this.generateSessionId());

      const response = await fetch(`${this.API_BASE}/voice/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Display transcription
        this.updateVoiceTranscript(data.data.transcription);
        
        // Display response
        this.updateVoiceStatus(data.data.response);
        
        // Play audio response if available
        if (data.data.audioResponse) {
          await this.playAudioResponse(data.data.audioResponse);
        }

        // Refresh data if needed
        if (data.data.intent === 'balance_inquiry' || 
            data.data.intent === 'transfer_money') {
          await this.loadBalance();
          await this.loadTransactions();
        }
      } else {
        this.updateVoiceStatus('Sorry, I couldn\'t understand. Please try again.');
      }
    } catch (error) {
      this.showError('Failed to process voice command');
      console.error('Voice processing error:', error);
    } finally {
      this.updateVoiceUI('idle');
    }
  }

  async playAudioResponse(audioData) {
    try {
      const audio = new Audio(audioData);
      await audio.play();
    } catch (error) {
      console.error('Audio playback error:', error);
    }
  }

  // Data Loading Methods
  async loadUserData() {
    await Promise.all([
      this.loadBalance(),
      this.loadTransactions(),
      this.loadContacts()
    ]);
  }

  async loadBalance() {
    try {
      const response = await fetch(`${this.API_BASE}/banking/balance`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.updateBalanceDisplay(data.data.balance);
        document.getElementById('userName').textContent = `Welcome, ${data.data.name}`;
        document.getElementById('accountNumber').textContent = data.data.accountNumber;
      }
    } catch (error) {
      console.error('Balance load error:', error);
    }
  }

  async loadTransactions() {
    try {
      const response = await fetch(`${this.API_BASE}/banking/transactions?limit=10`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.displayTransactions(data.data.transactions);
      }
    } catch (error) {
      console.error('Transactions load error:', error);
    }
  }

  async loadContacts() {
    // Load saved contacts
  }

  // UI Update Methods
  updateBalanceDisplay(balance) {
    const balanceElement = document.getElementById('balanceAmount');
    if (balanceElement) {
      balanceElement.textContent = `₹${balance.toLocaleString('en-IN')}`;
      
      // Animate balance update
      balanceElement.style.transform = 'scale(1.1)';
      setTimeout(() => {
        balanceElement.style.transform = 'scale(1)';
      }, 200);
    }
  }

  displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;

    if (transactions.length === 0) {
      container.innerHTML = '<p class="no-data">No transactions yet</p>';
      return;
    }

    container.innerHTML = transactions.map(txn => `
      <div class="transaction-item ${txn.type}">
        <div class="transaction-icon">
          ${txn.type === 'credit' ? '↓' : '↑'}
        </div>
        <div class="transaction-details">
          <div class="transaction-description">${txn.description}</div>
          <div class="transaction-date">${new Date(txn.timestamp).toLocaleDateString()}</div>
        </div>
        <div class="transaction-amount ${txn.type}">
          ${txn.type === 'credit' ? '+' : '-'}₹${txn.amount.toLocaleString('en-IN')}
        </div>
      </div>
    `).join('');
  }

  updateVoiceUI(state) {
    const voiceVisual = document.getElementById('voiceVisual');
    const voiceBtn = document.getElementById('voiceBtn');
    
    if (!voiceVisual || !voiceBtn) return;

    // Remove all state classes
    voiceVisual.classList.remove('recording', 'processing', 'idle');
    
    // Add current state
    voiceVisual.classList.add(state);

    // Update button
    if (state === 'recording') {
      voiceBtn.classList.add('recording');
    } else {
      voiceBtn.classList.remove('recording');
    }
  }

  updateVoiceStatus(message) {
    const statusElement = document.getElementById('voiceStatus');
    if (statusElement) {
      statusElement.textContent = message;
    }
  }

  updateVoiceTranscript(text) {
    const transcriptElement = document.getElementById('voiceTranscript');
    if (transcriptElement) {
      transcriptElement.textContent = `You said: "${text}"`;
      transcriptElement.style.display = 'block';
    }
  }

  updateUILanguage() {
    // Update UI text based on selected language
    const languageTexts = {
      'hi-IN': {
        welcome: 'स्वागत है',
        balance: 'कुल राशि',
        tapToSpeak: 'माइक पर टैप करें और बोलें'
      },
      'or-IN': {
        welcome: 'ସ୍ୱାଗତ',
        balance: 'ମୋଟ ରାଶି',
        tapToSpeak: 'ମାଇକ୍ ଟ୍ୟାପ୍ କରନ୍ତୁ ଏବଂ କୁହନ୍ତୁ'
      },
      'en-IN': {
        welcome: 'Welcome',
        balance: 'Total Balance',
        tapToSpeak: 'Tap microphone and speak'
      }
    };

    const texts = languageTexts[this.language] || languageTexts['en-IN'];
    
    // Update elements
    const voiceStatus = document.getElementById('voiceStatus');
    if (voiceStatus && !this.isRecording) {
      voiceStatus.textContent = texts.tapToSpeak;
    }
  }

  // Screen Navigation
  showLoginScreen() {
    this.hideAllScreens();
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.classList.add('active');
    }
  }

  showBankingScreen() {
    this.hideAllScreens();
    const bankingScreen = document.getElementById('bankingScreen');
    if (bankingScreen) {
      bankingScreen.classList.add('active');
    }
  }

  hideAllScreens() {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
  }

  // Notifications
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  showLoading(message) {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.querySelector('p').textContent = message;
      loadingScreen.style.display = 'flex';
    }
  }

  hideLoading() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
  }

  // Storage Methods
  saveToStorage() {
    localStorage.setItem('token', this.token);
    localStorage.setItem('user', JSON.stringify(this.currentUser));
    localStorage.setItem('language', this.language);
  }

  loadFromStorage() {
    this.token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (user) {
      this.currentUser = JSON.parse(user);
    }
    this.language = localStorage.getItem('language') || 'hi-IN';
  }

  // Utility Methods
  generateSessionId() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this.sessionId;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.voiceBankingApp = new VoiceBankingApp();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .notification.show {
    transform: translateX(0);
  }

  .notification.success {
    background: #4CAF50;
  }

  .notification.error {
    background: #f44336;
  }

  .notification.info {
    background: #2196F3;
  }

  .voice-visual.recording .pulse {
    animation: pulse 1s ease-out infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
