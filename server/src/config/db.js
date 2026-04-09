import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB
 * Uses MONGODB_URI from environment, defaults to local codeatlas DB
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codeatlas';

  try {
    const conn = await mongoose.connect(uri);
    if (conn?.connection?.host) {
      logger.info('MongoDB connected', { host: conn.connection.host });
    } else {
      logger.info('MongoDB connected');
    }
  } catch (err) {
    logger.error('MongoDB connection error', err.message);
    process.exit(1);
  }
}
