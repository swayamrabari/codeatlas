const protect = require('./protect');

const admin = async (req, res, next) => {
  // First check if user is authenticated
  await protect(req, res, () => {
    // Then check if user is admin
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
  });
};

module.exports = admin;

