// Authentication Middleware
// Verifies JWT tokens and enforces role-based access control

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token
 * Extracts user info from token and attaches to req.user
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to enforce admin-only routes
 * Must be used after authMiddleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to enforce student-only routes
 * Must be used after authMiddleware
 */
const requireStudent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access required' });
  }

  next();
};

/**
 * Middleware to allow both admin and student
 * Must be used after authMiddleware
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  next();
};

module.exports = {
  authMiddleware,
  requireAdmin,
  requireStudent,
  requireAuth
};
