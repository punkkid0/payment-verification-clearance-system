// Clearance Routes
const express = require('express');
const router = express.Router();
const clearanceController = require('../controllers/clearanceController');
const { authMiddleware, requireAdmin, requireStudent } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const validate = require('../middleware/validate');
const { rejectClearanceSchema } = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Clearances
 *   description: Clearance request operations
 */

/**
 * @swagger
 * /api/clearances/request:
 *   post:
 *     summary: Submit a clearance request (Student only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receipt:
 *                 type: string
 *                 format: binary
 *               payment_id:
 *                 type: string
 *               receipt_amount:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request submitted
 */
// ── Student routes ─────────────────────────────────────────────

// Submit a clearance request with receipt image
router.post(
  '/request',
  authMiddleware,
  requireStudent,
  upload.single('receipt'),
  handleMulterError,
  clearanceController.submitClearanceRequest
);

/**
 * @swagger
 * /api/clearances/my-requests:
 *   get:
 *     summary: View own clearance requests (Student only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of own requests
 */
// View own requests
router.get('/my-requests', authMiddleware, requireStudent, clearanceController.getMyRequests);

/**
 * @swagger
 * /api/clearances/pending:
 *   get:
 *     summary: List all pending clearance requests (Admin only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending requests
 */
// ── Admin routes ───────────────────────────────────────────────

// List all clearance requests
router.get('/pending', authMiddleware, requireAdmin, clearanceController.getPendingRequests);

/**
 * @swagger
 * /api/clearances/requests/{id}:
 *   get:
 *     summary: Get single clearance request (Admin only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clearance request retrieved
 */
// Get single request
router.get('/requests/:id', authMiddleware, requireAdmin, clearanceController.getClearanceRequest);

/**
 * @swagger
 * /api/clearances/requests/{id}/details:
 *   get:
 *     summary: Get full details with payment summary (Admin only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Clearance request details retrieved
 */
// Get full details (with payment summary)
router.get('/requests/:id/details', authMiddleware, requireAdmin, clearanceController.getClearanceDetails);

/**
 * @swagger
 * /api/clearances/requests/{id}/approve:
 *   patch:
 *     summary: Approve a clearance request (Admin only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verification_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request approved
 */
// Approve / Reject
router.patch('/requests/:id/approve', authMiddleware, requireAdmin, clearanceController.approveClearance);

/**
 * @swagger
 * /api/clearances/requests/{id}/reject:
 *   patch:
 *     summary: Reject a clearance request (Admin only)
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Request rejected
 */
router.patch('/requests/:id/reject', authMiddleware, requireAdmin, validate(rejectClearanceSchema), clearanceController.rejectClearance);

/**
 * @swagger
 * /api/clearances/certificate/{filename}:
 *   get:
 *     summary: Download clearance certificate
 *     tags: [Clearances]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Certificate file stream
 */
// Certificate download (authenticated)
router.get('/certificate/:filename', authMiddleware, clearanceController.downloadCertificate);

module.exports = router;
