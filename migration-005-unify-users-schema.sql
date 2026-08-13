-- Migration 005: Unify student identity on users table
-- Payments and clearances now reference users(id) where role = 'student'

-- Repoint payments FK from students → users (if payments table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_student_id_fkey;
    ALTER TABLE payments
      ADD CONSTRAINT payments_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Repoint clearances FK from students → users (if clearances table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clearances') THEN
    ALTER TABLE clearances DROP CONSTRAINT IF EXISTS clearances_student_id_fkey;
    ALTER TABLE clearances
      ADD CONSTRAINT clearances_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Repoint student_fees FK from students → users (if student_fees table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_fees') THEN
    ALTER TABLE student_fees DROP CONSTRAINT IF EXISTS student_fees_student_id_fkey;
    ALTER TABLE student_fees
      ADD CONSTRAINT student_fees_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Remap leftover clearance_requests.student_id values from students → users when both exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clearance_requests') THEN
    UPDATE clearance_requests cr
    SET student_id = u.id
    FROM students s
    JOIN users u ON lower(u.email) = lower(s.email)
    WHERE cr.student_id = s.id
      AND cr.student_id IS DISTINCT FROM u.id;
  END IF;
EXCEPTION
  WHEN undefined_column THEN
    NULL;
END $$;

-- Repoint clearance_requests FKs from students → users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clearance_requests') THEN
    ALTER TABLE clearance_requests DROP CONSTRAINT IF EXISTS clearance_requests_student_id_fkey;
    ALTER TABLE clearance_requests
      ADD CONSTRAINT clearance_requests_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;

    ALTER TABLE clearance_requests DROP CONSTRAINT IF EXISTS clearance_requests_payment_id_fkey;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
      UPDATE clearance_requests cr
      SET payment_id = NULL
      WHERE cr.payment_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.id = cr.payment_id);

      ALTER TABLE clearance_requests
        ADD CONSTRAINT clearance_requests_payment_id_fkey
        FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Remove demo RRRs that migration 004 used to attach to hard-coded user ids 3/4
DELETE FROM school_fee_payments
WHERE rrr IN ('RRR-IND-001234567890', 'RRR-NON-009876543210');

-- Track who recorded ledger payments
ALTER TABLE school_fee_payments
  ADD COLUMN IF NOT EXISTS recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON TABLE users IS 'All accounts: admins and students (role column). Students use this table as their identity.';