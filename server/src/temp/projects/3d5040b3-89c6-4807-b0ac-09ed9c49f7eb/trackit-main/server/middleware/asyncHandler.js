/**
 * Async handler wrapper to catch errors in async route handlers
 * Prevents unhandled promise rejections in Express routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

