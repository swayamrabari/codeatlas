import mongoose from 'mongoose';

/**
 * Connect to MongoDB
 * Uses MONGODB_URI from environment, defaults to local codeatlas DB
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codeatlas';

  try {
    const conn = await mongoose.connect(uri);
    console.log(`🗄️  MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
}
