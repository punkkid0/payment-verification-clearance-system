const jwt = require('jsonwebtoken');

function createFileDownloadToken({ type, filename, userId, role, expiresIn = '7d' }) {
  return jwt.sign(
    { purpose: 'file', type, filename, userId, role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

function fileDownloadUrl(baseUrl, type, filename, token) {
  const encodedName = encodeURIComponent(filename);
  const encodedToken = encodeURIComponent(token);
  return `${baseUrl}/api/files/${type}/${encodedName}?token=${encodedToken}`;
}

module.exports = { createFileDownloadToken, fileDownloadUrl };
