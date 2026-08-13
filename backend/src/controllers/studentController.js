// Student Controller
// Handles student-related operations: view info, update profile, upload avatar, etc.

const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getExpectedFee } = require('../config/fees');
const { logAudit } = require('../utils/auditLog');

// ── Avatar upload config ───────────────────────────────────────
const AVATAR_DIR = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATAR_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user.userId}-${Date.now()}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits:  { fileSize: 3 * 1024 * 1024 }, // 3 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
}).single('avatar');

exports.uploadAvatarMiddleware = uploadAvatar;


/**
 * GET /api/students/my-info
 * Get current student's profile from the users table
 */
exports.getMyInfo = async (req, res) => {
  try {
    const userId = req.user.userId;

    const userResult = await pool.query(
      `SELECT id, username, email, full_name, role, avatar_url, is_indigene, created_at
       FROM users WHERE id = $1 AND role = $2`,
      [userId, 'student']
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const user = userResult.rows[0];

    const clearanceResult = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending')  AS pending_count,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
        MAX(created_at) AS last_request_date
       FROM clearance_requests
       WHERE student_id = $1`,
      [userId]
    );

    res.json({
      ...user,
      student_id: user.username,
      is_indigene: !!user.is_indigene,
      expected_school_fee: getExpectedFee(!!user.is_indigene),
      clearance_summary: clearanceResult.rows[0] || null,
      payment_summary: null
    });
  } catch (error) {
    console.error('Get student info error:', error);
    res.status(500).json({ error: 'Failed to fetch student info', details: error.message });
  }
};

/**
 * PUT /api/students/my-profile
 * Update current student's name and/or email, and optionally change password
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { full_name, email, current_password, new_password } = req.body;

    // Fetch current record
    const existing = await pool.query(
      'SELECT id, email, password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = existing.rows[0];

    // If changing email, ensure it isn't taken
    if (email && email !== current.email) {
      const taken = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, userId]
      );
      if (taken.rows.length > 0) {
        return res.status(409).json({ error: 'Email is already in use by another account' });
      }
    }

    // Password change (optional)
    let newHash = null;
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to set a new password' });
      }
      const valid = await bcrypt.compare(current_password, current.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      newHash = await bcrypt.hash(new_password, 10);
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let idx = 1;

    if (full_name !== undefined) { updates.push(`full_name = $${idx++}`); params.push(full_name); }
    if (email     !== undefined) { updates.push(`email = $${idx++}`);     params.push(email); }
    if (newHash)                 { updates.push(`password_hash = $${idx++}`); params.push(newHash); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, username, email, full_name, avatar_url, role, is_indigene, created_at, updated_at`,
      params
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...result.rows[0],
        is_indigene: !!result.rows[0].is_indigene,
        expected_school_fee: getExpectedFee(!!result.rows[0].is_indigene)
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
};

/**
 * POST /api/students/my-avatar
 * Upload or replace the student's profile picture
 */
exports.handleAvatarUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId   = req.user.userId;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    // Delete old avatar if it exists
    const old = await pool.query('SELECT avatar_url FROM users WHERE id = $1', [userId]);
    if (old.rows[0]?.avatar_url) {
      const oldPath = path.join(__dirname, '../..', old.rows[0].avatar_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const result = await pool.query(
      `UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, full_name, avatar_url, role`,
      [avatarUrl, userId]
    );

    res.json({
      message: 'Avatar updated successfully',
      avatar_url: avatarUrl,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload avatar', details: error.message });
  }
};

/**
 * GET /api/students/:id
 * Get specific student's information (admin only)
 */
exports.getStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, username, email, full_name, role, is_indigene, is_active, avatar_url, created_at
       FROM users WHERE id = $1 AND role = 'student'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = result.rows[0];
    res.json({
      ...student,
      student_id: student.username,
      expected_school_fee: getExpectedFee(!!student.is_indigene),
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
};

exports.listStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, is_indigene, is_active, created_at
       FROM users WHERE role = 'student' AND is_active = true
       ORDER BY created_at DESC`
    );

    res.json(result.rows.map((s) => ({
      ...s,
      student_id: s.username,
      expected_school_fee: getExpectedFee(!!s.is_indigene),
    })));
  } catch (error) {
    console.error('List students error:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

exports.updateStudentIndigene = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_indigene } = req.body;
    const adminId = req.user.userId;

    const existing = await pool.query(
      `SELECT id, is_indigene, full_name FROM users WHERE id = $1 AND role = 'student'`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const result = await pool.query(
      `UPDATE users SET is_indigene = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, email, full_name, is_indigene`,
      [is_indigene, id]
    );

    await logAudit({
      action: 'indigene_status_updated',
      entityType: 'users',
      entityId: parseInt(id, 10),
      userId: adminId,
      oldValues: { is_indigene: existing.rows[0].is_indigene },
      newValues: { is_indigene },
      ipAddress: req.ip,
    });

    res.json({
      message: 'Indigene status updated',
      student: {
        ...result.rows[0],
        expected_school_fee: getExpectedFee(!!result.rows[0].is_indigene),
      },
    });
  } catch (error) {
    console.error('Update indigene error:', error);
    res.status(500).json({ error: 'Failed to update indigene status' });
  }
};

exports.getStudentPayments = async (req, res) => {
  try {
    const { id } = req.params;

    const studentCheck = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'student'`,
      [id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const result = await pool.query(
      `SELECT p.id, p.payment_id, p.amount, p.payment_date, p.payment_method,
              p.payment_reference, p.status, p.notes, u.full_name AS recorded_by_name
       FROM payments p
       LEFT JOIN users u ON p.recorded_by = u.id
       WHERE p.student_id = $1
       ORDER BY p.payment_date DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get student payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};
