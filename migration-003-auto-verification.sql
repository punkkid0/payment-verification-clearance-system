-- Migration 003: Add automatic fake receipt detection / verification fields
-- This enables the system to automatically analyze uploaded receipts for signs of being fake
-- (duplicate images, implausible amounts, etc.) as per project requirement for automated validation.

ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS declared_amount DECIMAL(12, 2);

ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS receipt_file_hash VARCHAR(128);

ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS auto_verification_score INTEGER DEFAULT 50;

ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS auto_verification_result JSONB;

ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS auto_decision VARCHAR(20);  -- 'authentic' | 'suspicious' | 'likely_fake'

-- Helpful index for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_clearance_requests_file_hash 
  ON clearance_requests(receipt_file_hash);

-- Optional: track when auto verification happened
ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS auto_verified_at TIMESTAMP;

-- New: support for official payment platform reference (RRR, Paystack ref, etc.)
-- This enables stronger automatic "not fake" validation when the student provides
-- the real transaction reference from the approved payment gateway.
ALTER TABLE clearance_requests 
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_clearance_requests_payment_reference 
  ON clearance_requests(payment_reference);

COMMENT ON COLUMN clearance_requests.declared_amount IS 'Amount the student claims on the uploaded receipt (for auto cross-check)';
COMMENT ON COLUMN clearance_requests.receipt_file_hash IS 'SHA-256 hash of the uploaded receipt file bytes (for duplicate/fake image detection)';
COMMENT ON COLUMN clearance_requests.auto_verification_score IS '0-100 automated authenticity score computed on submit';
COMMENT ON COLUMN clearance_requests.auto_verification_result IS 'Detailed JSON result from automatic fake-detection checks (reasons, subscores)';
COMMENT ON COLUMN clearance_requests.auto_decision IS 'High-level automatic classification of the receipt';
COMMENT ON COLUMN clearance_requests.payment_reference IS 'Official transaction reference from payment platform (e.g. Remita RRR, Paystack ref) for stronger auto-verification against recorded payments';

GRANT ALL PRIVILEGES ON clearance_requests TO postgres;
