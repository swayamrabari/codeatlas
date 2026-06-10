import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * JWT authentication middleware.
 * Extracts the token from the HttpOnly cookie, Authorization header,
 * or ?token= query param (for SSE). Checks cookies first.
 */
export async function authenticate(req, res, next) {
  try {
    let token = req.cookies?.token || null;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token && req.query.token) {
      // Support token via query param (needed for SSE / EventSource)
      token = req.query.token;
    }

    if (!token) {
      return res
        .status(401)
        .json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        code: 'ACCOUNT_BLOCKED',
        error: 'Your account is blocked. Please contact support.',
        blocked: true,
        blockReason: user.blockReason || null,
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    return res.status(500).json({ error: 'Authentication failed.' });
  }
}

/**
 * Admin-only authorization middleware.
 */
export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }

  return next();
}

/**
 * Non-admin-only authorization middleware.
 */
export function requireNonAdmin(req, res, next) {
  if (req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admins cannot upload projects.' });
  }

  return next();
}
