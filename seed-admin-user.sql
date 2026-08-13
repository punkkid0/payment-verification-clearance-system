-- Seed an initial ADMIN user so you can log in immediately
-- Default credentials:
--   username: admin
--   password: admin123
--   email:    admin@school.edu
--
-- IMPORTANT: After first login, change the password in the UI (StudentProfile or via /me)

INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
  'admin',
  'admin@school.edu',
  '$2a$10$nEf0jSbIPe8xqh71kGYwA.2a2zt2Y2pyBRHoIo4CCerqNoYv2C9gG',
  'System Administrator',
  'admin',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Optional: also seed a test student (username: student1, password: student123)
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES (
  'student1',
  'student1@school.edu',
  '$2a$10$aEPYnvNN0b1SrZjfepqLde.Lg42GoYynHC3E9yocVo3vd8U8pGeGS',
  'Test Student',
  'student',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

UPDATE users SET is_indigene = TRUE WHERE username = 'student1';

INSERT INTO school_fee_payments (rrr, student_id, amount, payment_method, notes)
SELECT 'RRR-STUDENT1-001234567890', id, 75600, 'remita', 'Demo official payment for student1'
FROM users
WHERE username = 'student1'
ON CONFLICT (rrr) DO NOTHING;
