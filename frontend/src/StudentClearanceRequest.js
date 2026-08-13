import React, { useState, useEffect, useRef } from 'react';
import { clearanceService, studentService, getApiError } from './services/api';
import { getExpectedFee } from './config';
import { openSecureFile } from './utils/secureFile';

// Step definitions
const STEPS = ['Upload Receipt', 'Review Details', 'Submit', 'Await Decision'];

const StudentClearanceRequest = () => {
  const [formData, setFormData] = useState({
    receipt: null,
    paymentId: '',
    receiptAmount: '',
    paymentReference: '',   // Official platform ref (RRR, Paystack txn ID, etc.) - strongly recommended for faster auto-verification
  });
  const [profile, setProfile] = useState(null);
  const [expectedFee, setExpectedFee] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [step, setStep] = useState(0); // 0 = upload, 1 = details, 2 = submit, 3 = done
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRequests();
    fetchProfileForFee();
  }, []);

  const fetchProfileForFee = async () => {
    try {
      const res = await studentService.getMyInfo();
      const p = res.data;
      setProfile(p);
      const fee = getExpectedFee(!!p.is_indigene);
      setExpectedFee(fee);
      // Pre-fill the correct amount if empty
      setFormData(prev => {
        if (!prev.receiptAmount) {
          return { ...prev, receiptAmount: fee.toString() };
        }
        return prev;
      });
    } catch (e) {
      // non-fatal for now
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await clearanceService.getMyRequests();
      setRequests(res.data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  // ── File handling ──────────────────────────────────────────
  const processFile = (file) => {
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Only image files are allowed (JPEG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }
    setFormData((prev) => ({ ...prev, receipt: file }));
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
    setStep(1);
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (step < 2 && formData.receipt) setStep(2);
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({ ...prev, receipt: null }));
    setPreviewUrl('');
    setStep(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.receipt) { setError('Please select a receipt image.'); return; }
    if (!formData.receiptAmount || parseFloat(formData.receiptAmount) <= 0) {
      setError('Please enter a valid receipt amount.');
      return;
    }
    // Enforce exact fee match based on profile (no guesswork)
    if (expectedFee && parseFloat(formData.receiptAmount) !== expectedFee) {
      setError(`Amount must be exactly ₦${expectedFee.toLocaleString()} for your indigene status.`);
      return;
    }
    if (!formData.paymentReference || !formData.paymentReference.trim()) {
      setError('Please enter your official RRR / payment reference. This is required for automatic verification against the school payment records.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();
      data.append('receipt', formData.receipt);
      data.append('receipt_amount', formData.receiptAmount);
      data.append('payment_reference', formData.paymentReference.trim());
      const parsedPaymentId = parseInt(formData.paymentId, 10);
      if (!Number.isNaN(parsedPaymentId) && parsedPaymentId > 0) {
        data.append('payment_id', String(parsedPaymentId));
      }

      await clearanceService.submitRequest(data);

      setSuccess('🎉 Clearance request submitted! Admin will review it shortly. (Auto fake-detection analysis has been performed.)');
      setFormData({ receipt: null, paymentId: '', receiptAmount: '', paymentReference: '' });
      setPreviewUrl('');
      setStep(3);
      fetchRequests();
    } catch (err) {
      setError(getApiError(err, 'Failed to submit request. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleNewRequest = () => {
    setStep(0);
    setSuccess('');
    setError('');
    setFormData({ receipt: null, paymentId: '', receiptAmount: '', paymentReference: '' });
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Derive active step
  const activeStep = formData.receipt
    ? formData.receiptAmount
      ? loading ? 2 : step >= 3 ? 3 : 2
      : 1
    : 0;

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">📄 Request Clearance Certificate</h1>
        <p className="page-subtitle">
          Upload your payment receipt to begin the clearance process
        </p>
      </div>

      {/* Step Indicator */}
      <div className="steps mb-8" style={{ marginBottom: '32px' }}>
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`step ${i < activeStep ? 'completed' : i === activeStep ? 'active' : ''}`}
          >
            <div className="step-circle">
              {i < activeStep ? '✓' : i + 1}
            </div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error mb-6" style={{ marginBottom: '24px' }}>
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-6 animate-slideUp" style={{ marginBottom: '24px' }}>
          <span>✅</span><span>{success}</span>
        </div>
      )}

      {step === 3 ? (
        /* ── SUCCESS STATE ── */
        <div className="card text-center animate-slideUp" style={{ textAlign: 'center', padding: '48px' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px', color: 'var(--success)' }}>
            Request Submitted!
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
            Your clearance request is now under admin review. You'll see the status update below.
          </p>
          <button
            id="new-request-btn"
            className="btn btn-ghost"
            onClick={handleNewRequest}
          >
            Submit Another Request
          </button>
        </div>
      ) : (
        /* ── FORM ── */
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: Form */}
          <form id="clearance-form" onSubmit={handleSubmit}>
            {/* Drop Zone */}
            <div className="card mb-6" style={{ marginBottom: '20px' }}>
              <div className="section-title">📎 Receipt Image</div>

              {!previewUrl ? (
                <div
                  className={`dropzone${dragOver ? ' drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  id="dropzone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div className="dropzone-icon">🖼️</div>
                  <div className="dropzone-text">Drop receipt here or click to browse</div>
                  <div className="dropzone-hint">JPEG, PNG, GIF, WebP · Max 5MB</div>
                </div>
              ) : (
                <div className="animate-fadeIn">
                  <div className="receipt-viewer" style={{ marginBottom: '12px' }}>
                    <img src={previewUrl} alt="Receipt preview" />
                    <div className="receipt-viewer-footer">
                      <span style={{ fontSize: '13px', color: 'var(--success)' }}>
                        ✓ {formData.receipt?.name}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleRemoveFile}
                        id="remove-file-btn"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Details */}
            <div className="card mb-6" style={{ marginBottom: '20px' }}>
              <div className="section-title">💳 Payment Details</div>

              {/* Expected fee (driven by your profile indigene status) */}
              {expectedFee && (
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '10px 14px', 
                  borderRadius: '8px', 
                  marginBottom: '12px',
                  fontSize: '13px'
                }}>
                  <strong>Your required school fee (based on your profile):</strong> ₦{expectedFee.toLocaleString()}<br />
                  <span style={{ color: 'var(--text-muted)' }}>This value is determined by whether you are an indigene of the state or not (set in your Profile).</span>
                </div>
              )}

              <div className="form-group mb-4" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="receiptAmount">
                  Amount Paid (₦) *
                </label>
                <input
                  id="receiptAmount"
                  type="number"
                  name="receiptAmount"
                  className="form-input"
                  placeholder={expectedFee ? expectedFee.toString() : "75600 or 81500"}
                  step="1"
                  min="0"
                  value={formData.receiptAmount}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                />
                <span className="form-hint">Must exactly match the required fee for your indigene status above.</span>
              </div>

              {/* RRR / Official Reference - now critical for automatic verification against the school ledger */}
              <div className="form-group mb-4" style={{ marginBottom: '16px', border: '2px solid var(--accent)', padding: '12px', borderRadius: '8px' }}>
                <label className="form-label" htmlFor="paymentReference" style={{ color: 'var(--accent)' }}>
                  Official Payment Reference (RRR / Remita / Paystack Reference) *
                </label>
                <input
                  id="paymentReference"
                  type="text"
                  name="paymentReference"
                  className="form-input"
                  placeholder="e.g. 123456789012345 or your Paystack transaction reference"
                  value={formData.paymentReference}
                  onChange={handleInputChange}
                  disabled={loading}
                  required
                />
                <span className="form-hint" style={{ color: 'var(--text-primary)' }}>
                  <strong>Required for automatic verification.</strong> The system will look up this RRR in the official school fees payment records. If it matches your student record + the correct amount for your indigene status, your submission can be automatically treated as genuine.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="paymentId">
                  Payment ID / Reference (Optional)
                </label>
                <input
                  id="paymentId"
                  type="text"
                  name="paymentId"
                  className="form-input"
                  placeholder="e.g. PAY-2024-001 or bank reference"
                  value={formData.paymentId}
                  onChange={handleInputChange}
                  disabled={loading}
                />
                <span className="form-hint">If you have a payment reference number, enter it here</span>
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                <span>⚠️</span><span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="submit-clearance-btn"
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner spinner-sm" /> Submitting…</>
              ) : (
                '📤 Submit Clearance Request'
              )}
            </button>
          </form>

          {/* Right: How it Works */}
          <div>
            <div className="card mb-6" style={{ marginBottom: '20px' }}>
              <div className="section-title">ℹ️ How It Works</div>
              {[
                { step: '1', icon: '🖼️', title: 'Upload Receipt', desc: 'Take a clear photo of your bank or payment receipt' },
                { step: '2', icon: '💳', title: 'Enter Amount', desc: 'Type the exact amount from your receipt' },
                { step: '3', icon: '📤', title: 'Submit Request', desc: 'Submit for admin review (usually 1–2 hours)' },
                { step: '4', icon: '🎓', title: 'Get Cleared', desc: 'Once approved, download your clearance certificate' },
              ].map(({ step, icon, title, desc }) => (
                <div
                  key={step}
                  style={{
                    display: 'flex', gap: '14px', alignItems: 'flex-start',
                    padding: '12px 0', borderBottom: step !== '4' ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--bg-surface-3)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '16px',
                    flexShrink: 0
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="card card-warning">
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--warning)' }}>⚠️ Important:</strong> Make sure your receipt image is
                clear and legible. Blurry or incomplete receipts may be rejected.
                If rejected, you can submit a new request.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Request History ── */}
      <div className="card mt-8 animate-slideUp" style={{ marginTop: '32px', animationDelay: '0.1s' }}>
        <div className="card-header">
          <div className="section-title" style={{ marginBottom: 0 }}>📜 Your Request History</div>
          <button className="btn btn-ghost btn-sm" onClick={fetchRequests} disabled={requestsLoading}>
            {requestsLoading ? <div className="spinner spinner-sm" /> : '🔄'} Refresh
          </button>
        </div>

        {requestsLoading ? (
          <div className="loading-screen" style={{ minHeight: '120px' }}>
            <div className="spinner" />
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No requests yet</div>
            <p style={{ fontSize: '13px' }}>Submit your first clearance request above.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Reviewed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} style={{ cursor: 'default' }}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>#{req.id}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status}`}>
                        {req.status === 'pending'
                          ? 'Pending Review'
                          : req.status === 'approved'
                          ? 'Approved ✓'
                          : 'Rejected ✗'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      {req.certificate_path ? (
                        <button
                          type="button"
                          onClick={() => openSecureFile(req.certificate_path)}
                          className="btn btn-success btn-sm"
                          id={`cert-dl-${req.id}`}
                        >
                          ⬇️ Certificate
                        </button>
                      ) : req.receipt_image_path ? (
                        <button
                          type="button"
                          onClick={() => openSecureFile(req.receipt_image_path)}
                          className="btn btn-ghost btn-sm"
                        >
                          Receipt ↗
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejection reason display */}
        {requests.some((r) => r.status === 'rejected' && r.reason_for_rejection) && (
          <div style={{ marginTop: '16px' }}>
            {requests.filter((r) => r.status === 'rejected' && r.reason_for_rejection).map((req) => (
              <div key={req.id} className="alert alert-error mt-3" style={{ marginTop: '12px' }}>
                <span>❌</span>
                <div>
                  <strong>Request #{req.id} rejection reason:</strong>{' '}
                  {req.reason_for_rejection}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentClearanceRequest;
