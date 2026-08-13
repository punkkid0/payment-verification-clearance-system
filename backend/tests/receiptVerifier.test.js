const fs = require('fs');
const path = require('path');
const os = require('os');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
}));

const pool = require('../src/config/database');
const { analyzeReceipt, computeFileHash } = require('../src/utils/receiptVerifier');
const { FEE_AMOUNTS } = require('../src/config/fees');

describe('receiptVerifier', () => {
  let tempFile;

  beforeEach(() => {
    jest.clearAllMocks();
    tempFile = path.join(os.tmpdir(), `receipt-test-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, 'test receipt content');
  });

  afterEach(() => {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  test('computeFileHash returns consistent SHA-256', () => {
    const hash1 = computeFileHash(tempFile);
    const hash2 = computeFileHash(tempFile);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  test('authentic when RRR matches ledger with correct indigene amount', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, amount: FEE_AMOUNTS.indigene, payment_date: new Date(), status: 'successful' }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const { result } = await analyzeReceipt({
      filePath: tempFile,
      declaredAmount: FEE_AMOUNTS.indigene,
      studentId: 3,
      paymentReference: 'RRR-TEST-001',
      isIndigene: true,
    });

    expect(result.decision).toBe('authentic');
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  test('likely_fake when RRR not found in ledger', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const { result } = await analyzeReceipt({
      filePath: tempFile,
      declaredAmount: FEE_AMOUNTS.nonIndigene,
      studentId: 4,
      paymentReference: 'RRR-MISSING',
      isIndigene: false,
    });

    expect(result.decision).toBe('likely_fake');
    expect(result.score).toBeLessThan(30);
  });

  test('penalizes duplicate receipt used by another student', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 99, status: 'approved', student_id: 999, created_at: new Date() }],
    });

    const { result } = await analyzeReceipt({
      filePath: tempFile,
      declaredAmount: FEE_AMOUNTS.indigene,
      studentId: 3,
      paymentReference: '',
      isIndigene: true,
    });

    expect(result.checks.duplicateHash).toBe(true);
    expect(result.score).toBeLessThanOrEqual(25);
  });
});