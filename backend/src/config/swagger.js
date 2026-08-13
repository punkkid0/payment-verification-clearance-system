const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'UNICROSS Payment Verification & Clearance API',
      version: '1.0.0',
      description: [
        'Interactive API for the UNICROSS school-fee clearance system.',
        '',
        '**How to try it**',
        '1. Call `POST /api/auth/login` with a demo account from the README.',
        '2. Click **Authorize** and paste the token as `Bearer <jwt>`.',
        '3. Use the student or admin endpoints below.',
        '',
        'Students submit a receipt + RRR. Admins record official ledger payments and approve or reject clearance.',
      ].join('\n'),
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Local development' },
    ],
    tags: [
      { name: 'Auth', description: 'Register, login, and session' },
      { name: 'Students', description: 'Student profile and admin student list' },
      { name: 'Payments', description: 'Manual payment records' },
      { name: 'Clearances', description: 'Clearance requests, review, certificates' },
      { name: 'Ledger', description: 'Official school-fee payments (source of truth)' },
      { name: 'Files', description: 'Authenticated receipts, avatars, and certificates' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [path.join(__dirname, '../routes/*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJSDoc(options);
