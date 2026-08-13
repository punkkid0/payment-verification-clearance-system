-- Migration 004: Indigene status + Official School Fee Payments Ledger
-- This implements the client's requirement for exact fee amounts based on indigene status
-- and a trusted "school account" payments table that the app checks against using RRR.

-- 1. Add indigene status to users (students declare this in their profile)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_indigene BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN users.is_indigene IS 'TRUE = indigene of the state (pays lower fee), FALSE = non-indigene (pays higher fee)';

-- 2. Create the official "school fees paid to school account" ledger.
-- In a real system this would be populated by the payment gateway (Remita/Paystack webhooks)
-- or by the bursary when they confirm bulk payments.
CREATE TABLE IF NOT EXISTS school_fee_payments (
  id SERIAL PRIMARY KEY,
  rrr VARCHAR(50) UNIQUE NOT NULL,                    -- Remita Retrieval Reference or equivalent
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) DEFAULT 'online',
  status VARCHAR(20) DEFAULT 'successful',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_fee_payments_rrr ON school_fee_payments(rrr);
CREATE INDEX IF NOT EXISTS idx_school_fee_payments_student ON school_fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_school_fee_payments_amount ON school_fee_payments(amount);

COMMENT ON TABLE school_fee_payments IS 'Official record of school fees successfully paid into the school account. This is the source of truth for automatic verification.';
COMMENT ON COLUMN school_fee_payments.rrr IS 'The unique reference the student receives from the payment platform (e.g. Remita RRR).';

-- Demo ledger rows live in seed-admin-user.sql (after users exist).

GRANT ALL PRIVILEGES ON school_fee_payments TO postgres;

-- Note on fees (as per client):
-- Indigene of the state (is_indigene = true):  ₦75,600
-- Non-indigene (is_indigene = false):         ₦81,500
-- The backend will enforce the exact amount match against this ledger + the student's declared status.