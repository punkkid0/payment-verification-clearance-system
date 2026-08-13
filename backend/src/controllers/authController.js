// Auth Controller
// Handles user authentication: register, login, logout, token verification

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { logAudit } = require('../utils/auditLog');

/**
 * POST /api/auth/register
 * Register a new student account (admin accounts are seed-only)
 */
exports.registerStudent = async (req, res) => {
  try {
    const { email, password, full_name, username } = req.body;

    const finalUsername = username || email.split('@')[0];
    const finalRole = 'student';

    const existingEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingEmail.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const existingUsername = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [finalUsername]
    );
    if (existingUsername.rows.length > 0) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, full_name, role`,
      [finalUsername, email, password_hash, full_name, finalRole, true]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit({
      action: 'user_registered',
      entityType: 'users',
      entityId: user.id,
      userId: user.id,
      newValues: { email: user.email, role: user.role },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 * Login user (student or admin) — accepts username OR email
 */
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const identifier = username || email;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }

    const userResult = await pool.query(
      `SELECT * FROM users 
       WHERE (username = $1 OR email = $1) AND is_active = true`,
      [identifier]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAudit({
      action: 'user_login',
      entityType: 'users',
      entityId: user.id,
      userId: user.id,
      ipAddress: req.ip,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.logout = (req, res) => {
  res.json({ message: 'Logout successful' });
};

exports.verifyToken = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, avatar_url, is_indigene FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    res.json({
      message: 'Token is valid',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT id, username, email, full_name, role, is_active, avatar_url, is_indigene, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
};