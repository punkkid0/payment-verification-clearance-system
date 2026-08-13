const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const filesController = require('../controllers/filesController');
const { authMiddleware } = require('../middleware/auth');

function authOrSignedFileToken(req, res, next) {
  const signed = req.query.token;
  if (signed) {
    try {
      const payload = jwt.verify(signed, process.env.JWT_SECRET);
      if (
        payload.purpose !== 'file' ||
        payload.type !== req.params.type ||
        payload.filename !== req.params.filename
      ) {
        return res.status(403).json({ error: 'Invalid download token' });
      }
      req.user = { userId: payload.userId, role: payload.role || 'student' };
      req.signedFileAccess = true;
      return next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Download link expired' });
      }
      return res.status(401).json({ error: 'Invalid download link' });
    }
  }
  return authMiddleware(req, res, next);
}

/**
 * @swagger
 * /api/files/{type}/{filename}:
 *   get:
 *     summary: Download a receipt, avatar, or certificate
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [receipts, avatars, certificates]
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: token
 *         schema:
 *           type: string
 *         description: Optional signed download token (used in approval emails)
 *     responses:
 *       200:
 *         description: File stream
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Not allowed to access this file
 */
router.get('/:type/:filename', authOrSignedFileToken, filesController.serveFile);

module.exports = router;