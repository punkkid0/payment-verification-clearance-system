// Scores a receipt against school_fee_payments (RRR + expected indigene/non-indigene fee).

const crypto = require('crypto');
const fs = require('fs');
const pool = require('../config/database');
const { getExpectedFee } = require('../config/fees');

/**
 * Compute SHA-256 hash of a file on disk.
 * Used for exact duplicate detection (common way fakes are reused across students).
 */
function computeFileHash(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Score interpretation: >= 75 authentic, 45-74 suspicious, < 45 likely_fake.
 */
async function analyzeReceipt({ filePath, declaredAmount, studentId, paymentReference, isIndigene }) {
  const reasons = [];
  let score = 40;
  const checks = {
    duplicateHash: false,
    amountPositive: false,
    amountPlausible: false,
    studentFeeMatch: null,
    paymentReferenceMatch: null,
    officialLedgerMatch: null,
  };

  const expectedAmount = getExpectedFee(!!isIndigene);
  const declared = parseFloat(declaredAmount) || 0;
  let fileHash = null;

  // === 1. OFFICIAL LEDGER CHECK (highest priority - this is what makes the app "know" it's real) ===
  if (paymentReference && paymentReference.trim()) {
    const rrr = paymentReference.trim();

    try {
      const ledgerRes = await pool.query(
        `SELECT id, amount, payment_date, status
         FROM school_fee_payments
         WHERE rrr = $1 
           AND student_id = $2
         LIMIT 1`,
        [rrr, studentId]
      );

      if (ledgerRes.rows.length > 0) {
        const ledger = ledgerRes.rows[0];
        checks.officialLedgerMatch = {
          ledgerId: ledger.id,
          recordedAmount: parseFloat(ledger.amount),
          paymentDate: ledger.payment_date,
          status: ledger.status,
        };

        const amountMatchesExpected = Math.abs(parseFloat(ledger.amount) - expectedAmount) < 1;
        const declaredMatches = Math.abs(declared - expectedAmount) < 1;

        if (amountMatchesExpected && declaredMatches) {
          reasons.push(`✅ VERIFIED REAL: Exact RRR match found in the official school fees payment ledger for the correct amount (₦${expectedAmount.toLocaleString()}).`);
          score = 98;
          checks.paymentReferenceMatch = { verified: true, source: 'school_fee_payments' };
        } else {
          reasons.push(`⚠ RRR "${rrr}" exists in the official ledger, but amount does not match the required fee for your indigene status (expected ₦${expectedAmount.toLocaleString()}).`);
          score = 20;
        }
      } else {
        reasons.push(`❌ No matching official payment record found for RRR "${rrr}" in the school fees ledger. Cannot auto-verify as genuine.`);
        score = 10;
      }
    } catch (e) {
      console.warn('Official ledger check failed:', e.message);
      reasons.push('Temporary error querying the official payment ledger.');
    }
  } else {
    reasons.push('No RRR/official payment reference provided. Cannot check against the school payment ledger.');
    score = 25;
  }

  // === 2. Exact amount validation against student's category (no guesswork) ===
  if (declared > 0) {
    checks.amountPositive = true;
    if (Math.abs(declared - expectedAmount) < 1) {
      checks.amountPlausible = true;
      // Do not boost score if ledger lookup already failed (score <= 20)
      if (score > 20 && score < 80) score = Math.max(score, 70);
      reasons.push(`Declared amount (₦${declared.toLocaleString()}) exactly matches the required school fee for your category.`);
    } else {
      reasons.push(`❌ Amount mismatch: You declared ₦${declared.toLocaleString()} but the correct fee for your indigene status is ₦${expectedAmount.toLocaleString()}.`);
      score = Math.min(score, 15);
    }
  } else {
    reasons.push('Receipt amount is missing or zero.');
    score = 5;
  }

  // === 3. Duplicate image detection (secondary anti-fraud) ===
  try {
    fileHash = computeFileHash(filePath);
    const dupResult = await pool.query(
      `SELECT id, status, student_id, created_at 
       FROM clearance_requests 
       WHERE receipt_file_hash = $1 
       ORDER BY created_at DESC 
       LIMIT 3`,
      [fileHash]
    );

    if (dupResult.rows.length > 0) {
      checks.duplicateHash = true;
      const previous = dupResult.rows[0];
      const isSameStudent = previous.student_id === studentId;

      if (isSameStudent) {
        reasons.push('This exact receipt image was already submitted by you previously.');
        score -= 10;
      } else {
        reasons.push(`This exact receipt image was previously used by another student (request #${previous.id}). Strong indicator of a fake/reused receipt.`);
        score = Math.min(score, 10);
      }
    } else {
      reasons.push('No previous use of this exact receipt image found.');
      if (score > 30) score += 5;
    }
  } catch (e) {
    console.warn('Duplicate image check failed:', e.message);
  }

  // Final clamp + decision
  score = Math.max(0, Math.min(100, Math.round(score)));

  let decision = 'suspicious';
  if (score >= 85) decision = 'authentic';
  else if (score < 30) decision = 'likely_fake';

  // Hard rule: if we have a ledger match at 98, keep it high even if other minor issues
  if (checks.officialLedgerMatch && score >= 85) {
    decision = 'authentic';
  }

  const result = {
    score,
    decision,
    reasons,
    checks,
    expectedAmount,
    isIndigene: !!isIndigene,
    analyzedAt: new Date().toISOString(),
  };

  return { fileHash, result };
}

module.exports = {
  analyzeReceipt,
  computeFileHash,
};
