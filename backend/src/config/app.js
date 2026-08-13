// Application-level configuration

function getBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  if (req) {
    const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
  }
  return 'http://localhost:5000';
}

function getCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:5000';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

module.exports = {
  getBaseUrl,
  getCorsOrigins,
};