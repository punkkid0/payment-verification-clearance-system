// Clearance Controller
// Handles clearance request operations: submit, list, approve, reject

const pool = require('../config/database');
const path = require('path');
const fs = require('fs');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');
const { generateCertificate, getCertificateInfo } = require('../utils/certificateGenerator');
const { analyzeReceipt } = require('../utils/receiptVerifier');
const { getBaseUrl } = require('../config/app');
const { getExpectedFee } = require('../config/fees');
const { createFileDownloadToken, fileDownloadUrl } = require('../utils/downloadToken');
const { logAudit } = require('../utils/auditLog');

const CERT_DIR = path.join(__dirname, '../../uploads/certificates');

/**
 * POST /api/clearances/request
 * Student submits clearance request with receipt image
 */
exports.submitClearanceRequest = async (req, res) => {
  try {
    const studentId = req.user.userId;
    const { payment_id, receipt_amount, payment_reference } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Receipt image is required' });
    }

    if (!receipt_amount || parseFloat(receipt_amount) <= 0) {
      return res.status(400).json({ error: 'Receipt amount is required and must be positive' });
    }

    const paymentRefRaw = typeof payment_reference === 'string' ? payment_reference.trim() : '';
    if (!paymentRefRaw || paymentRefRaw.length < 5) {
      return res.status(400).json({ error: 'Official payment reference (RRR) is required' });
    }

    // Sanitize optional payment_id (avoid FK issues if user enters garbage)
    let paymentId = null;
    if (payment_id) {
      const parsed = parseInt(payment_id, 10);
      if (!isNaN(parsed) && parsed > 0) paymentId = parsed;
    }

    // Verify user is a student and get indigene status (used for exact fee amount)
    const studentCheck = await pool.query(
      `SELECT id, is_indigene FROM users WHERE id = $1 AND role = $2`,
      [studentId, 'student']
    );

    if (studentCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only students can submit clearance requests' });
    }

    const isIndigene = !!studentCheck.rows[0].is_indigene;
    const expectedFee = getExpectedFee(isIndigene);
    const declaredAmount = parseFloat(receipt_amount);
    if (Math.abs(declaredAmount - expectedFee) >= 1) {
      return res.status(400).json({
        error: `Receipt amount must be exactly ₦${expectedFee.toLocaleString()} for your indigene status`,
      });
    }

    // Check for existing pending request
    const existingRequest = await pool.query(
      `SELECT id FROM clearance_requests WHERE student_id = $1 AND status = $2`,
      [studentId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending clearance request. Please wait for admin review.'
      });
    }

    const receipt_image_path = `/uploads/receipts/${req.file.filename}`;
    const fullDiskPath = req.file.path;

    let autoVerification = { score: 50, decision: 'suspicious', reasons: ['Automatic analysis could not be completed.'], checks: {} };
    let fileHash = null;
    try {
      const analysis = await analyzeReceipt({
        filePath: fullDiskPath,
        declaredAmount: receipt_amount,
        studentId,
        paymentReference: paymentRefRaw,
        isIndigene,
      });
      fileHash = analysis.fileHash;
      autoVerification = analysis.result;
      console.log(`Auto verification for student ${studentId}: score=${autoVerification.score} decision=${autoVerification.decision} (indigene=${isIndigene})`);
    } catch (analysisErr) {
      console.error('Auto receipt verification error (non-fatal):', analysisErr.message);
    }

    const paymentRef = paymentRefRaw.substring(0, 100);

    const result = await pool.query(
      `INSERT INTO clearance_requests 
         (student_id, payment_id, receipt_image_path, status, 
          declared_amount, receipt_file_hash, payment_reference,
          auto_verification_score, auto_verification_result, auto_decision, auto_verified_at,
          created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', 
               $4, $5, $6,
               $7, $8, $9, CURRENT_TIMESTAMP,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, student_id, status, declared_amount, payment_reference, auto_verification_score, auto_decision, created_at`,
      [
        studentId, 
        paymentId, 
        receipt_image_path,
        declaredAmount,
        fileHash,
        paymentRef,
        autoVerification.score,
        autoVerification,
        autoVerification.decision
      ]
    );

    await logAudit({
      action: 'clearance_request_submitted',
      entityType: 'clearance_requests',
      entityId: result.rows[0].id,
      userId: studentId,
      newValues: { status: 'pending', auto_decision: autoVerification.decision },
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: 'Clearance request submitted successfully',
      request: result.rows[0],
      auto_verification: {
        score: autoVerification.score,
        decision: autoVerification.decision,
        reasons: autoVerification.reasons,
      },
      note: 'Your receipt has been automatically analyzed. Admin will perform final review.'
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => { if (err) console.error('File cleanup error:', err); });
    }
    console.error('Submit clearance request error:', error);
    res.status(500).json({ error: 'Failed to submit clearance request' });
  }
};

/**
 * GET /api/clearances/pending
 * Admin views all clearance requests (all statuses)
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        cr.id,
        cr.student_id,
        cr.payment_id,
        cr.receipt_image_path,
        cr.status,
        cr.declared_amount,
        cr.receipt_file_hash,
        cr.payment_reference,
        cr.auto_verification_score,
        cr.auto_decision,
        cr.auto_verification_result,
        cr.created_at,
        cr.reviewed_at,
        u.email          AS student_email,
        u.full_name      AS student_name,
        u.username       AS student_username,
        u.is_indigene    AS student_is_indigene
      FROM clearance_requests cr
      JOIN users u ON cr.student_id = u.id
      ORDER BY cr.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to fetch clearance requests' });
  }
};

/**
 * GET /api/clearances/requests/:id
 * Get specific clearance request
 */
exports.getClearanceRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        cr.id,
        cr.student_id,
        cr.payment_id,
        cr.receipt_image_path,
        cr.status,
        cr.reason_for_rejection,
        cr.declared_amount,
        cr.receipt_file_hash,
        cr.payment_reference,
        cr.auto_verification_score,
        cr.auto_decision,
        cr.auto_verification_result,
        cr.reviewed_by,
        cr.reviewed_at,
        cr.created_at,
        u.email          AS student_email,
        u.full_name      AS student_name,
        u.username       AS student_username,
        u.is_indigene    AS student_is_indigene
      FROM clearance_requests cr
      JOIN users u ON cr.student_id = u.id
      WHERE cr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clearance request not found' });
    }

    res.json({ request: result.rows[0] });
  } catch (error) {
    console.error('Get clearance request error:', error);
    res.status(500).json({ error: 'Failed to fetch clearance request' });
  }
};

/**
 * GET /api/clearances/my-requests
 * Student views their own clearance requests
 */
exports.getMyRequests = async (req, res) => {
  try {
    const studentId = req.user.userId;

    const result = await pool.query(
      `SELECT
        id,
        status,
        receipt_image_path,
        certificate_path,
        declared_amount,
        auto_verification_score,
        auto_decision,
        reason_for_rejection,
        reviewed_at,
        created_at
      FROM clearance_requests
      WHERE student_id = $1
      ORDER BY created_at DESC`,
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Failed to fetch your clearance requests' });
  }
};

/**
 * PATCH /api/clearances/requests/:id/approve
 * Admin approves clearance request
 */
exports.approveClearance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const admin_id = req.user.userId;

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT * FROM clearance_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clearance request not found' });
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot approve a ${request.status} request` });
    }

    const updateResult = await client.query(
      `UPDATE clearance_requests
       SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'pending'
       RETURNING id, status, reviewed_at`,
      [admin_id, id]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot approve a request that is no longer pending' });
    }

    const studentFeeResult = await client.query(
      `SELECT is_indigene FROM users WHERE id = $1`,
      [request.student_id]
    );
    const expectedAmount = getExpectedFee(!!studentFeeResult.rows[0]?.is_indigene);

    await client.query(
      `INSERT INTO clearances (student_id, status, total_owed, total_paid, cleared_date, cleared_by, clearance_request_id, notes)
       VALUES ($1, 'cleared', $2, $2, CURRENT_TIMESTAMP, $3, $4, $5)
       ON CONFLICT (student_id) DO UPDATE SET
         status = 'cleared',
         total_owed = EXCLUDED.total_owed,
         total_paid = EXCLUDED.total_paid,
         cleared_date = CURRENT_TIMESTAMP,
         cleared_by = EXCLUDED.cleared_by,
         clearance_request_id = EXCLUDED.clearance_request_id,
         updated_at = CURRENT_TIMESTAMP`,
      [request.student_id, expectedAmount, admin_id, id, 'Approved via clearance request']
    );

    await client.query('COMMIT');

    const studentResult = await pool.query(
      `SELECT id, username, email, full_name FROM users WHERE id = $1`,
      [request.student_id]
    );
    const student = studentResult.rows[0];
    const updatedReq = updateResult.rows[0];

    let certificateUrl = null;
    let certificatePath = null;
    try {
      const certInfo = await generateCertificate(student, { ...request, ...updatedReq });
      certificatePath = certInfo.filepath;

      await pool.query(
        `UPDATE clearance_requests SET certificate_path = $1 WHERE id = $2`,
        [certInfo.url, id]
      );

      const token = createFileDownloadToken({
        type: 'certificates',
        filename: certInfo.filename,
        userId: student.id,
        role: 'student',
      });
      certificateUrl = fileDownloadUrl(getBaseUrl(req), 'certificates', certInfo.filename, token);
      console.log(`✓ Certificate generated: ${certInfo.filename}`);
    } catch (certErr) {
      console.error('Certificate generation error:', certErr.message);
    }

    await logAudit({
      action: 'clearance_approved',
      entityType: 'clearance_requests',
      entityId: parseInt(id, 10),
      userId: admin_id,
      newValues: { status: 'approved', certificate_url: certificateUrl },
      ipAddress: req.ip,
    });

    sendApprovalEmail(student.email, student.full_name, id, certificateUrl, certificatePath)
      .catch(err => console.error('Email error:', err.message));

    res.json({
      message: 'Clearance request approved successfully',
      request: updatedReq,
      certificate_url: certificateUrl,
      note: 'Student has been cleared. Certificate generated and email sent.'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Approve clearance error:', error);
    res.status(500).json({ error: 'Failed to approve clearance request' });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/clearances/requests/:id/reject
 * Admin rejects clearance request
 */
exports.rejectClearance = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const admin_id = req.user.userId;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT * FROM clearance_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Clearance request not found' });
    }

    if (requestResult.rows[0].status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Cannot reject a ${requestResult.rows[0].status} request` });
    }

    const updateResult = await client.query(
      `UPDATE clearance_requests
       SET status = 'rejected', reason_for_rejection = $1,
           reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'pending'
       RETURNING id, status, reason_for_rejection, reviewed_at`,
      [reason, admin_id, id]
    );

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot reject a request that is no longer pending' });
    }

    await client.query('COMMIT');

    const studentResult = await pool.query(
      `SELECT email, full_name FROM users WHERE id = $1`,
      [requestResult.rows[0].student_id]
    );
    const student = studentResult.rows[0];

    if (student) {
      sendRejectionEmail(student.email, student.full_name, id, reason)
        .catch(err => console.error('Email error:', err.message));
    }

    await logAudit({
      action: 'clearance_rejected',
      entityType: 'clearance_requests',
      entityId: parseInt(id, 10),
      userId: admin_id,
      newValues: { status: 'rejected', reason },
      ipAddress: req.ip,
    });

    res.json({
      message: 'Clearance request rejected',
      request: updateResult.rows[0],
      note: 'Student has been notified via email'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reject clearance error:', error);
    res.status(500).json({ error: 'Failed to reject clearance request' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/clearances/certificate/:filename
 * Download a clearance certificate PDF (authenticated — use /api/files/certificates/:filename)
 * @deprecated Kept for backward compatibility; redirects to secure files route logic.
 */
exports.downloadCertificate = async (req, res) => {
  req.params.type = 'certificates';
  const filesController = require('./filesController');
  return filesController.serveFile(req, res);
};

/**
 * GET /api/clearances/requests/:id/details
 * Full details for admin review page
 */
exports.getClearanceDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        cr.id,
        cr.student_id,
        cr.payment_id,
        cr.receipt_image_path,
        cr.status,
        cr.reason_for_rejection,
        cr.declared_amount,
        cr.receipt_file_hash,
        cr.payment_reference,
        cr.auto_verification_score,
        cr.auto_decision,
        cr.auto_verification_result,
        cr.reviewed_by,
        cr.reviewed_at,
        cr.created_at,
        u.email          AS student_email,
        u.full_name      AS student_name,
        u.username       AS student_username,
        u.is_indigene    AS student_is_indigene
      FROM clearance_requests cr
      JOIN users u ON cr.student_id = u.id
      WHERE cr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clearance request not found' });
    }

    const request = result.rows[0];

    // Payment summary — return null if no payments linked (students table is separate)
    const payment_summary = {
      total: 0,
      method: null,
      latest_payment_date: null,
      note: 'Payment verified via uploaded receipt'
    };

    res.json({
      request,
      payment_summary,
      receipt_url: request.receipt_image_path,
      // Expose auto verification prominently for the admin review UI
      auto_verification: request.auto_verification_result || null
    });
  } catch (error) {
    console.error('Get clearance details error:', error);
    res.status(500).json({ error: 'Failed to fetch clearance details', details: error.message });
  }
};
