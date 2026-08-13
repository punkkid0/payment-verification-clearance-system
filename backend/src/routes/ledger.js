const express = require('express');
const router = express.Router();
const ledgerController = require('../controllers/ledgerController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { recordLedgerPaymentSchema } = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Ledger
 *   description: Official school fee ledger operations
 */

/**
 * @swagger
 * /api/ledger:
 *   post:
 *     summary: Record an official ledger payment (Admin only)
 *     tags: [Ledger]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rrr:
 *                 type: string
 *               student_id:
 *                 type: integer
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Ledger payment recorded
 */
router.post(
  '/',
  authMiddleware,
  requireAdmin,
  validate(recordLedgerPaymentSchema),
  ledgerController.recordLedgerPayment
);

/**
 * @swagger
 * /api/ledger:
 *   get:
 *     summary: List all official ledger payments (Admin only)
 *     tags: [Ledger]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of ledger payments
 */
router.get('/', authMiddleware, requireAdmin, ledgerController.listLedgerPayments);

/**
 * @swagger
 * /api/ledger/{id}:
 *   get:
 *     summary: Get specific ledger payment (Admin only)
 *     tags: [Ledger]
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
 *         description: Ledger payment details
 */
router.get('/:id', authMiddleware, requireAdmin, ledgerController.getLedgerPayment);

module.exports = router;