const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error('Request error', {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: err.stack,
    ip: req.ip,
  });

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack,
  });
};

module.exports = errorHandler;