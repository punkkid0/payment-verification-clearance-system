-- Database Schema for Payment Verification & Clearance System
-- Unified model: users table holds both admins and students (role column)

CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE clearance_status AS ENUM ('pending', 'cleared', 'partial');

-- All accounts (admins + students)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'student',
  is_active BOOLEAN DEFAULT TRUE,
  is_indigene BOOLEAN DEFAULT FALSE,
  avatar_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN users.is_indigene IS 'Admin-set: TRUE = indigene (₦75,600), FALSE = non-indigene (₦81,500)';
COMMENT ON COLUMN users.role IS 'admin or student';

-- Fee structure (optional legacy tracking)
CREATE TABLE fees (
  id SERIAL PRIMARY KEY,
  fee_name VARCHAR(100) NOT NULL,
  fee_type VARCHAR(50),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  applicable_classes VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fee_id INTEGER NOT NULL REFERENCES fees(id),
  amount_owed DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manual payment records (admin-recorded)
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  payment_id VARCHAR(100) UNIQUE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  status payment_status DEFAULT 'completed',
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_details (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payments(id),
  student_fee_id INTEGER NOT NULL REFERENCES student_fees(id),
  amount_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student-initiated clearance workflow
CREATE TABLE clearance_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_id INTEGER,
  receipt_image_path VARCHAR(255) NOT NULL,
  certificate_path VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  reason_for_rejection TEXT,
  declared_amount DECIMAL(12, 2),
  receipt_file_hash VARCHAR(128),
  payment_reference VARCHAR(100),
  auto_verification_score INTEGER DEFAULT 50,
  auto_verification_result JSONB,
  auto_decision VARCHAR(20),
  auto_verified_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_unique_pending_request
  ON clearance_requests (student_id, status) WHERE status = 'pending';

-- Official school fee ledger (source of truth for auto-verification)
CREATE TABLE school_fee_payments (
  id SERIAL PRIMARY KEY,
  rrr VARCHAR(50) UNIQUE NOT NULL,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) DEFAULT 'online',
  status VARCHAR(20) DEFAULT 'successful',
  notes TEXT,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clearance records (synced on admin approval)
CREATE TABLE clearances (
  id SERIAL PRIMARY KEY,
  student_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status clearance_status DEFAULT 'pending',
  total_owed DECIMAL(10, 2),
  total_paid DECIMAL(10, 2),
  cleared_date TIMESTAMP,
  cleared_by INTEGER REFERENCES users(id),
  clearance_request_id INTEGER REFERENCES clearance_requests(id),
  certificate_path VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  user_id INTEGER REFERENCES users(id),
  old_values TEXT,
  new_values TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_clearance_requests_student_id ON clearance_requests(student_id);
CREATE INDEX idx_clearance_requests_status ON clearance_requests(status);
CREATE INDEX idx_clearance_requests_file_hash ON clearance_requests(receipt_file_hash);
CREATE INDEX idx_school_fee_payments_rrr ON school_fee_payments(rrr);
CREATE INDEX idx_school_fee_payments_student ON school_fee_payments(student_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;