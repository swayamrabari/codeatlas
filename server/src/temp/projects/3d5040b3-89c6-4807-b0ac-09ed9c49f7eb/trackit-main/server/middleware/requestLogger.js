const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom morgan format for production logging
const morganFormat = process.env.NODE_ENV === 'production'
  ? ':remote-addr :method :url :status :response-time ms - :res[content-length]'
  : 'dev';

// Custom token for user ID (if authenticated)
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Skip logging for health checks in production (to reduce noise)
const skipHealthCheck = (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.path === '/health') {
    return res.statusCode < 400; // Only log if there's an error
  }
  return false;
};

const requestLogger = morgan(morganFormat, {
  stream: logger.stream,
  skip: skipHealthCheck,
});

module.exports = requestLogger;








