const pool = require('../config/database');

async function logAudit({
  action,
  entityType = null,
  entityId = null,
  userId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
}) {
  try {
    await pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, user_id, old_values, new_values, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        action,
        entityType,
        entityId,
        userId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { logAudit };