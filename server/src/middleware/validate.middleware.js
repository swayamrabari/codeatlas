import mongoose from 'mongoose';

/**
 * Middleware factory: validates that a given route param is a valid MongoDB ObjectId.
 * Returns 400 Bad Request with a clear message if invalid.
 *
 * Usage: router.get('/project/:id', validateObjectId('id'), handler)
 */
export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${paramName}: "${value}" is not a valid ID`,
      });
    }

    next();
  };
}
