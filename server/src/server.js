import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import uploadRoutes from './routes/upload.route.js';
import projectRoutes from './routes/project.route.js';
import authRoutes from './routes/auth.route.js';

const app = express();
const PORT = process.env.PORT || 5000;
let server;

// https://codeatlas-seven.vercel.app add this too

const allowedOrigins =
  'http://localhost:5173, https://codeatlas-seven.vercel.app'
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

const shutdown = async (signal) => {
  console.log(`\\n${signal} received. Shutting down gracefully...`);

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
    }

    console.log('✅ HTTP server and MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()}`);
  console.log(`   ${req.method} ${req.url}`);
  console.log(`   Content-Type: ${req.headers['content-type']}`);
  next();
});

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (before auth-protected routes)
app.get('/api', (req, res) => {
  res.send('Server is running');
});

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// API routes
app.use('/api', authRoutes);
app.use('/api', uploadRoutes);
app.use('/api', projectRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large. Max request body size is 2MB.',
    });
  }

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'CORS origin not allowed',
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((item) => item.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details,
    });
  }

  console.error('❌ Server error:', err.message);
  console.error('   Stack:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Connect to MongoDB then start server
connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(
      `📁 Upload directory: ${process.env.UPLOAD_DIR || './src/temp'}`,
    );
  });

  server.keepAliveTimeout = 300000;
  server.headersTimeout = 310000;
});

// self ping to prevent idle timeout
const SELF_PING_URL = 'https://codeatlas-zhkg.onrender.com/health';
setInterval(
  async () => {
    try {
      await fetch(SELF_PING_URL);
    } catch (error) {
      console.error('❌ Self-ping failed:', error);
    }
  },
  10 * 60 * 1000,
); // every 10 minutes
