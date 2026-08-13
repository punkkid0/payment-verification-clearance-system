const express = require('express');
const router  = express.Router();
const studentController = require('../controllers/studentController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateProfileSchema, updateIndigeneSchema } = require('../validation/schemas');

/**
 * @swagger
 * tags:
 *   name: Students
 *   description: Student management operations
 */

/**
 * @swagger
 * /api/students/my-info:
 *   get:
 *     summary: Get logged-in student's info with payment summary
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student info retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/my-info', authMiddleware, studentController.getMyInfo);

/**
 * @swagger
 * /api/students/my-profile:
 *   put:
 *     summary: Update logged-in student's profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/my-profile', authMiddleware, validate(updateProfileSchema), studentController.updateProfile);

/**
 * @swagger
 * /api/students/my-avatar:
 *   post:
 *     summary: Upload student avatar
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.post(
  '/my-avatar',
  authMiddleware,
  studentController.uploadAvatarMiddleware,
  studentController.handleAvatarUpload
);

/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: List all students (Admin only)
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of students
 */
router.get('/', authMiddleware, requireAdmin, studentController.listStudents);

/**
 * @swagger
 * /api/students/{id}/indigene:
 *   patch:
 *     summary: Update student indigene status (Admin only)
 *     tags: [Students]
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
 *               is_indigene:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch('/:id/indigene', authMiddleware, requireAdmin, validate(updateIndigeneSchema), studentController.updateStudentIndigene);

/**
 * @swagger
 * /api/students/{id}/payments:
 *   get:
 *     summary: Get a student's payment history (Admin only)
 *     tags: [Students]
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
 *         description: Payment history retrieved
 */
router.get('/:id/payments', authMiddleware, requireAdmin, studentController.getStudentPayments);

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Get student details (Admin only)
 *     tags: [Students]
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
 *         description: Student details retrieved
 */
router.get('/:id', authMiddleware, requireAdmin, studentController.getStudent);

module.exports = router;