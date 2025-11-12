const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/voice_banking',
        options
      );

      console.log('✅ MongoDB connected successfully');
      console.log(`📦 Database: ${this.connection.connection.name}`);
      console.log(`🌐 Host: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        console.log('👋 MongoDB disconnected gracefully');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if database is connected
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  getStatus() {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    return states[mongoose.connection.readyState];
  }

  /**
   * Drop database (for testing only)
   */
  async dropDatabase() {
    if (process.env.NODE_ENV !== 'production') {
      await mongoose.connection.dropDatabase();
      console.log('🗑️  Database dropped');
    } else {
      throw new Error('Cannot drop database in production');
    }
  }

  /**
   * Clear all collections (for testing only)
   */
  async clearCollections() {
    if (process.env.NODE_ENV !== 'production') {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
      console.log('🧹 All collections cleared');
    }
  }
}

module.exports = new Database();
