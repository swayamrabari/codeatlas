import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (or ?token= query param for SSE),
 * verifies it, and attaches the user to req.user.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token) {
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
