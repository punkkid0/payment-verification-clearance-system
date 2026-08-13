// Payment Controller
// Handles payment-related operations: record, view, verify payments

const pool = require('../config/database');
const { logAudit } = require('../utils/auditLog');

async function verifyStudentUser(studentId) {
  const result = await pool.query(
    `SELECT id, full_name, email, username FROM users WHERE id = $1 AND role = 'student'`,
    [studentId]
  );
  return result.rows[0] || null;
}

exports.recordPayment = async (req, res) => {
  try {
    const { student_id, amount, payment_method, payment_reference, notes } = req.body;
    const admin_id = req.user.userId;

    const student = await verifyStudentUser(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const payment_id = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await pool.query(
      `INSERT INTO payments (payment_id, student_id, amount, payment_method, payment_reference, status, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, payment_id, student_id, amount, payment_date, payment_method, status`,
      [payment_id, student_id, amount, payment_method, payment_reference || null, 'completed', notes || null, admin_id]
    );

    await pool.query(
      `UPDATE student_fees
       SET amount_paid = amount_paid + $1,
           status = CASE WHEN (amount_paid + $1) >= amount_owed THEN 'paid' ELSE 'partial' END
       WHERE id = (
         SELECT id FROM student_fees
         WHERE student_id = $2 AND status IN ('pending', 'partial')
         ORDER BY due_date NULLS LAST, id
         LIMIT 1
       )`,
      [amount, student_id]
    );

    await logAudit({
      action: 'payment_recorded',
      entityType: 'payments',
      entityId: result.rows[0].id,
      userId: admin_id,
      newValues: result.rows[0],
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.rows[0],
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

exports.getStudentPayments = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.id, p.payment_id, p.amount, p.payment_date, p.payment_method,
              p.payment_reference, p.status, p.notes, u.full_name as recorded_by
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

exports.getPayment = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.full_name AS student_name, u.email AS student_email,
              u.username AS student_username, r.full_name as recorded_by
       FROM payments p
       JOIN users u ON p.student_id = u.id
       LEFT JOIN users r ON p.recorded_by = r.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

exports.listPayments = async (req, res) => {
  try {
    const { student_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT p.id, p.payment_id, p.amount, p.payment_date, p.payment_method, p.status,
             u.id AS student_id, u.username AS student_username,
             u.full_name AS student_name, u.email AS student_email
      FROM payments p
      JOIN users u ON p.student_id = u.id
      WHERE u.role = 'student'
    `;

    const params = [];

    if (student_id) {
      params.push(student_id);
      query += ` AND u.id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    if (start_date) {
      params.push(start_date);
      query += ` AND p.payment_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND p.payment_date <= $${params.length}`;
    }

    query += ' ORDER BY p.payment_date DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('List payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};