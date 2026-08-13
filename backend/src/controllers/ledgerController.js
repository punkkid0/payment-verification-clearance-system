const pool = require('../config/database');
const { getExpectedFee } = require('../config/fees');
const { logAudit } = require('../utils/auditLog');

exports.recordLedgerPayment = async (req, res) => {
  try {
    const { rrr, student_id, amount, payment_method, notes } = req.body;
    const adminId = req.user.userId;

    const studentResult = await pool.query(
      `SELECT id, full_name, email, is_indigene FROM users WHERE id = $1 AND role = 'student'`,
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = studentResult.rows[0];
    const expectedFee = getExpectedFee(!!student.is_indigene);

    if (Math.abs(amount - expectedFee) >= 1) {
      return res.status(400).json({
        error: `Amount must match student's fee category (₦${expectedFee.toLocaleString()})`,
        expected_amount: expectedFee,
        student_is_indigene: !!student.is_indigene,
      });
    }

    const existing = await pool.query(
      'SELECT id FROM school_fee_payments WHERE rrr = $1',
      [rrr]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'RRR already exists in the official ledger' });
    }

    const result = await pool.query(
      `INSERT INTO school_fee_payments (rrr, student_id, amount, payment_method, notes, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, rrr, student_id, amount, payment_date, payment_method, status, notes, created_at`,
      [rrr, student_id, amount, payment_method, notes || null, adminId]
    );

    await logAudit({
      action: 'ledger_payment_recorded',
      entityType: 'school_fee_payments',
      entityId: result.rows[0].id,
      userId: adminId,
      newValues: result.rows[0],
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Official ledger payment recorded successfully',
      payment: {
        ...result.rows[0],
        student_name: student.full_name,
        student_email: student.email,
      },
    });
  } catch (error) {
    console.error('Record ledger payment error:', error);
    res.status(500).json({ error: 'Failed to record ledger payment' });
  }
};

exports.listLedgerPayments = async (req, res) => {
  try {
    const { student_id, search } = req.query;
    let query = `
      SELECT
        sfp.id, sfp.rrr, sfp.student_id, sfp.amount,
        sfp.payment_date, sfp.payment_method, sfp.status, sfp.notes, sfp.created_at,
        u.full_name AS student_name, u.email AS student_email, u.username AS student_username,
        u.is_indigene AS student_is_indigene
      FROM school_fee_payments sfp
      JOIN users u ON sfp.student_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (student_id) {
      params.push(student_id);
      query += ` AND sfp.student_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (sfp.rrr ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    query += ' ORDER BY sfp.created_at DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('List ledger payments error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger payments' });
  }
};

exports.getLedgerPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
        sfp.*, u.full_name AS student_name, u.email AS student_email,
        u.username AS student_username, u.is_indigene AS student_is_indigene
       FROM school_fee_payments sfp
       JOIN users u ON sfp.student_id = u.id
       WHERE sfp.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger payment not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get ledger payment error:', error);
    res.status(500).json({ error: 'Failed to fetch ledger payment' });
  }
};