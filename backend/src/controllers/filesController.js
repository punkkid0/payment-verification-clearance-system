const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');

const ALLOWED_TYPES = {
  receipts: { dir: 'receipts', mime: /^image\// },
  avatars: { dir: 'avatars', mime: /^image\// },
  certificates: { dir: 'certificates', mime: /^application\/pdf$/ },
};

function isValidFilename(filename) {
  return filename && !filename.includes('..') && !filename.includes('/') && !filename.includes('\\');
}

async function canAccessReceipt(user, filename) {
  if (user.role === 'admin') return true;
  const result = await pool.query(
    `SELECT student_id FROM clearance_requests
     WHERE receipt_image_path LIKE $1`,
    [`%/receipts/${filename}`]
  );
  return result.rows.some((r) => r.student_id === user.userId);
}

async function canAccessAvatar(user, filename) {
  if (user.role === 'admin') return true;
  const result = await pool.query(
    `SELECT id FROM users WHERE id = $1 AND avatar_url LIKE $2`,
    [user.userId, `%/avatars/${filename}`]
  );
  return result.rows.length > 0;
}

async function canAccessCertificate(user, filename) {
  if (user.role === 'admin') return true;
  const result = await pool.query(
    `SELECT student_id FROM clearance_requests
     WHERE certificate_path LIKE $1 AND status = 'approved'`,
    [`%/certificates/${filename}`]
  );
  return result.rows.some((r) => r.student_id === user.userId);
}

exports.serveFile = async (req, res) => {
  try {
    const { type, filename } = req.params;
    const config = ALLOWED_TYPES[type];

    if (!config || !isValidFilename(filename)) {
      return res.status(400).json({ error: 'Invalid file request' });
    }

    const user = req.user;
    let allowed = !!req.signedFileAccess;

    if (!allowed) {
      if (type === 'receipts') allowed = await canAccessReceipt(user, filename);
      else if (type === 'avatars') allowed = await canAccessAvatar(user, filename);
      else if (type === 'certificates') allowed = await canAccessCertificate(user, filename);
    }

    if (!allowed) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const filepath = path.join(UPLOAD_ROOT, config.dir, filename);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (type === 'certificates') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    } else {
      const ext = path.extname(filename).toLowerCase();
      const mimeMap = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
      };
      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    }

    const stream = fs.createReadStream(filepath);
    stream.pipe(res);
    stream.on('error', () => res.status(500).json({ error: 'Failed to stream file' }));
  } catch (error) {
    console.error('Serve file error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
};