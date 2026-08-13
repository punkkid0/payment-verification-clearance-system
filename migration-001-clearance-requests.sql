-- Migration: Add clearance_requests table for student-initiated clearance workflow
-- This table tracks clearance requests submitted by students with uploaded receipt images

CREATE TABLE IF NOT EXISTS clearance_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  payment_id INTEGER,
  receipt_image_path VARCHAR(255) NOT NULL,
  certificate_path VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  reason_for_rejection TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Partial unique index: only one pending request per student (this is the correct way)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
ON clearance_requests (student_id, status) 
WHERE status = 'pending';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clearance_requests_student_id ON clearance_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_status ON clearance_requests(status);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_created_at ON clearance_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_reviewed_by ON clearance_requests(reviewed_by);

-- Update clearances table to include reference to clearance_request
ALTER TABLE clearances ADD COLUMN IF NOT EXISTS clearance_request_id INTEGER REFERENCES clearance_requests(id);

GRANT ALL PRIVILEGES ON clearance_requests TO postgres;
