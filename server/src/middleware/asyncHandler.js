/**
 * Async handler wrapper — catches errors from async route handlers
 * and forwards them to Express's global error handler via next().
 * Eliminates the need for try-catch in every controller.
 *
 * Usage: router.get('/route', asyncHandler(myController));
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
