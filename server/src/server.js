import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.route.js';
import { requestLogger } from './middleware/requestLogger.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { logEmailProviderStatus } from './services/email.service.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './src/temp';
const SELF_PING_URL =
  process.env.SELF_PING_URL || 'https://codeatlas-zhkg.onrender.com/health';
const SELF_PING_INTERVAL_MS =
  Number(process.env.SELF_PING_INTERVAL_MS) || 600000;

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  'http://localhost:5173,https://codeatlas-seven.vercel.app'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

let server;

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});

const shutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully`);

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

    logger.info('HTTP server and MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

app.use(requestLogger);
app.use(helmet());

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api', (req, res) => {
  res.send('Server is running');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api', apiRoutes);
app.use(errorHandler);

connectDB()
  .then(() => {
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info('Server running on port ' + PORT);
      logger.info('Upload directory set to ' + UPLOAD_DIR);
      logEmailProviderStatus();
    });

    server.keepAliveTimeout = 300000;
    server.headersTimeout = 310000;

    if (SELF_PING_URL) {
      const interval = setInterval(async () => {
        try {
          await fetch(SELF_PING_URL);
        } catch (error) {
          logger.warn('Self-ping failed', error);
        }
      }, SELF_PING_INTERVAL_MS);

      interval.unref();
    }
  })
  .catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
