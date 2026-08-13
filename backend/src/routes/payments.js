const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recordPaymentSchema } = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Legacy / manual payment operations
 */

/**
 * @swagger
 * /api/payments:
 *   post:
 *     summary: Record a new payment manually (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *               payment_method:
 *                 type: string
 *               payment_reference:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment recorded
 */
router.post('/', authMiddleware, requireAdmin, validate(recordPaymentSchema), paymentController.recordPayment);

/**
 * @swagger
 * /api/payments:
 *   get:
 *     summary: List all payments (Admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of payments
 */
router.get('/', authMiddleware, requireAdmin, paymentController.listPayments);

/**
 * @swagger
 * /api/payments/student/{id}:
 *   get:
 *     summary: Get a specific student's payments (Admin only)
 *     tags: [Payments]
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
 *         description: Student payments retrieved
 */
router.get('/student/:id', authMiddleware, requireAdmin, paymentController.getStudentPayments);

/**
 * @swagger
 * /api/payments/{id}:
 *   get:
 *     summary: Get a specific payment details (Admin only)
 *     tags: [Payments]
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
 *         description: Payment details retrieved
 */
router.get('/:id', authMiddleware, requireAdmin, paymentController.getPayment);

module.exports = router;