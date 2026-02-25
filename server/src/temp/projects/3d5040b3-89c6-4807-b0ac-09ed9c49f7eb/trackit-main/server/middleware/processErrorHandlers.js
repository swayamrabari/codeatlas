const logger = require('../utils/logger');

const setupProcessErrorHandlers = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1); // Exit the process to avoid undefined state
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection', {
      message: err?.message || 'Unknown error',
      stack: err?.stack,
      error: err,
    });
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
  });
};

module.exports = setupProcessErrorHandlers;
