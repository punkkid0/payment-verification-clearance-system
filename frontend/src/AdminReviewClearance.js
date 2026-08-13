import React, { useState, useEffect, useCallback } from 'react';
import { clearanceService, studentAdminService, getApiError } from './services/api';
import { getExpectedFee } from './config';
import SecureImage from './components/SecureImage';
import { openSecureFile } from './utils/secureFile';

const AdminReviewClearance = ({ requestId, onClose }) => {
  const [request, setRequest] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [action, setAction] = useState(null); // null | 'approve' | 'reject'
  const [rejectionReason, setRejectionReason] = useState('');
  const [updatingIndigene, setUpdatingIndigene] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await clearanceService.getRequestDetails(requestId);
      setRequest(res.data.request);
      setPayment(res.data.payment_summary);
      setError('');
    } catch (err) {
      console.error('Error fetching request details:', err);
      setError('Failed to load request details.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetails();
  }, [requestId, fetchDetails]);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError('');
      await clearanceService.approve(requestId);
      setSuccess('✅ Clearance approved successfully!');
      setAction(null);
      setTimeout(fetchDetails, 800);
    } catch (err) {
      setError(getApiError(err, 'Failed to approve clearance.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      setError('Rejection reason must be at least 5 characters.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      await clearanceService.reject(requestId, reason);
      setSuccess('Request rejected. Student has been notified.');
      setAction(null);
      setRejectionReason('');
      setTimeout(fetchDetails, 800);
    } catch (err) {
      setError(getApiError(err, 'Failed to reject clearance.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '300px' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)' }}>Loading request details…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="alert alert-error">
        <span>⚠️</span>
        <span>Request not found or failed to load.</span>
      </div>
    );
  }

  const isPending = request.status === 'pending';

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <h1 className="page-title">🔍 Review Clearance Request</h1>
          <p className="page-subtitle">
            Request #{request.id} · Submitted {new Date(request.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`badge badge-${request.status}`} style={{ fontSize: '13px', padding: '6px 14px' }}>
          {request.status === 'pending' ? 'Pending Review' : request.status === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error mb-4 animate-slideDown">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success mb-4 animate-slideDown">
          <span>✅</span><span>{success}</span>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid-2 mb-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Student Info */}
        <div className="card">
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>👤 Student Information</div>
          </div>
          <div className="info-row">
            <span className="info-label">Student ID</span>
            <span className="info-value">{request.student_id}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Name</span>
            <span className="info-value">{request.student_name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Username</span>
            <span className="info-value">{request.student_username ? `@${request.student_username}` : '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{request.student_email || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Indigene Status</span>
            <span className="info-value" style={{ fontWeight: 600, color: request.student_is_indigene ? 'var(--success)' : '#d97706' }}>
              {request.student_is_indigene ? 'Indigene' : 'Non-indigene'} (₦{getExpectedFee(!!request.student_is_indigene).toLocaleString()})
            </span>
          </div>
          <div className="info-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
            <span className="info-label">Admin: Set Indigene Status</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`btn btn-sm ${request.student_is_indigene ? 'btn-primary' : 'btn-ghost'}`}
                disabled={updatingIndigene || request.student_is_indigene}
                onClick={async () => {
                  try {
                    setUpdatingIndigene(true);
                    await studentAdminService.updateIndigene(request.student_id, true);
                    setRequest((r) => ({ ...r, student_is_indigene: true }));
                  } catch (err) {
                    setError(getApiError(err, 'Failed to update indigene status.'));
                  } finally {
                    setUpdatingIndigene(false);
                  }
                }}
              >
                Set Indigene
              </button>
              <button
                className={`btn btn-sm ${!request.student_is_indigene ? 'btn-primary' : 'btn-ghost'}`}
                disabled={updatingIndigene || !request.student_is_indigene}
                onClick={async () => {
                  try {
                    setUpdatingIndigene(true);
                    await studentAdminService.updateIndigene(request.student_id, false);
                    setRequest((r) => ({ ...r, student_is_indigene: false }));
                  } catch (err) {
                    setError(getApiError(err, 'Failed to update indigene status.'));
                  } finally {
                    setUpdatingIndigene(false);
                  }
                }}
              >
                Set Non-indigene
              </button>
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">Request ID</span>
            <span className="info-value" style={{ fontFamily: 'monospace' }}>#{request.id}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="card">
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>💳 Payment Information</div>
            {payment && (
              <span className={`badge ${payment.total > 0 ? 'badge-approved' : 'badge-rejected'}`}>
                {payment.total > 0 ? 'Payment Found' : 'No Payment'}
              </span>
            )}
          </div>
          {payment ? (
            <>
              <div className="info-row">
                <span className="info-label">Payment ID</span>
                <span className="info-value" style={{ fontFamily: 'monospace' }}>{request.payment_id || '—'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Total Paid</span>
                <span className="info-value" style={{ color: 'var(--success)' }}>
                  ₦{Number(payment.total || 0).toLocaleString()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Method</span>
                <span className="info-value">{payment.method || 'Not specified'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Latest Payment</span>
                <span className="info-value">
                  {payment.latest_payment_date
                    ? new Date(payment.latest_payment_date).toLocaleDateString()
                    : 'No payment found'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: '14px' }}>
              No linked payment record found.
            </div>
          )}
        </div>
      </div>

      {/* Receipt Image */}
      {request.receipt_image_path && (
        <div className="card mb-6" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>🧾 Uploaded Receipt</div>
          </div>
          <div className="receipt-viewer">
            <SecureImage
              src={request.receipt_image_path}
              alt="Payment receipt"
            />
            <div className="receipt-viewer-footer">
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Uploaded by student
              </span>
              <button
                type="button"
                onClick={() => openSecureFile(request.receipt_image_path)}
                className="btn btn-ghost btn-sm"
              >
                Open Full Size ↗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTOMATIC FAKE/RECEIPT VERIFICATION (new admin setting) */}
      {(request.auto_verification_score != null || request.auto_decision) && (
        <div className="card mb-6" style={{ 
          marginBottom: '24px', 
          borderLeft: request.auto_decision === 'authentic' ? '4px solid var(--success)' : 
                      request.auto_decision === 'likely_fake' ? '4px solid var(--danger)' : '4px solid #f59e0b'
        }}>
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>🤖 Automatic Verification</div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>System auto-analysis on upload</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>
              {request.auto_verification_score ?? '—'}
              <span style={{ fontSize: '16px', fontWeight: 400, color: 'var(--text-muted)' }}>/100</span>
            </div>
            <span className={`badge badge-${
              request.auto_decision === 'authentic' ? 'approved' : 
              request.auto_decision === 'likely_fake' ? 'rejected' : 'pending'
            }`} style={{ fontSize: '13px', padding: '6px 12px' }}>
              {request.auto_decision === 'authentic' && '✓ Likely Authentic'}
              {request.auto_decision === 'likely_fake' && '✗ Likely Fake'}
              {request.auto_decision === 'suspicious' && '⚠ Suspicious / Needs Review'}
              {!['authentic','likely_fake','suspicious'].includes(request.auto_decision) && (request.auto_decision || 'Pending analysis')}
            </span>
            {request.declared_amount != null && (
              <span style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Declared on receipt: <strong>₦{Number(request.declared_amount).toLocaleString()}</strong>
              </span>
            )}
          </div>

          {request.payment_reference && (
            <div style={{ marginBottom: '10px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Submitted with official reference: </span>
              <code style={{ background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>{request.payment_reference}</code>
            </div>
          )}

          {request.auto_verification_result?.reasons && request.auto_verification_result.reasons.length > 0 && (
            <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '8px', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>AUTO ANALYSIS REASONS</div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.5 }}>
                {request.auto_verification_result.reasons.map((r, i) => (
                  <li key={i} style={{ color: 'var(--text-primary)' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            The app automatically checks for duplicate images, amount plausibility, and consistency with student records to detect fake or manipulated receipts.
          </div>
        </div>
      )}

      {/* Rejection details (if already rejected) */}
      {request.status === 'rejected' && request.reason_for_rejection && (
        <div className="card card-danger mb-6" style={{ marginBottom: '24px' }}>
          <div className="section-title" style={{ color: 'var(--danger)', marginBottom: '8px' }}>
            ❌ Rejection Reason
          </div>
          <p style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }}>
            {request.reason_for_rejection}
          </p>
          {request.reviewed_at && (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Reviewed on {new Date(request.reviewed_at).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* Approved banner */}
      {request.status === 'approved' && (
        <div className="card card-success mb-6" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '28px' }}>✅</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                This clearance has been approved
              </div>
              {request.reviewed_at && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Approved on {new Date(request.reviewed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Decision Panel (pending only) */}
      {isPending && (
        <div className="card" style={{ borderColor: 'var(--border-light)' }}>
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>⚖️ Make a Decision</div>
          </div>
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '16px' }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {action === null && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                id="approve-btn"
                className="btn btn-success"
                onClick={() => setAction('approve')}
              >
                ✓ Approve Clearance
              </button>
              <button
                type="button"
                id="reject-btn"
                className="btn btn-danger"
                onClick={() => setAction('reject')}
              >
                ✗ Reject Request
              </button>
            </div>
          )}

          {action === 'approve' && (
            <div className="animate-slideDown" style={{ animation: 'slideDown 0.2s ease' }}>
              <div className="alert alert-info mb-4" style={{ marginBottom: '16px' }}>
                <span>ℹ️</span>
                <span>This will mark the student as cleared. The student will be notified.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  id="confirm-approve-btn"
                  className="btn btn-success"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  {submitting ? <><div className="spinner spinner-sm" /> Processing…</> : '✓ Confirm Approval'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setAction(null)} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {action === 'reject' && (
            <div className="animate-slideDown" style={{ animation: 'slideDown 0.2s ease' }}>
              <div className="form-group mb-4" style={{ marginBottom: '16px' }}>
                <label className="form-label" htmlFor="rejection-reason">
                  Reason for Rejection *
                </label>
                <textarea
                  id="rejection-reason"
                  className="form-textarea"
                  placeholder="Explain clearly why this request is being rejected (at least 5 characters)…"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  disabled={submitting}
                />
                <span className="form-hint">Minimum 5 characters. This is sent to the student.</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  id="confirm-reject-btn"
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={submitting || rejectionReason.trim().length < 5}
                >
                  {submitting ? <><div className="spinner spinner-sm" /> Processing…</> : '✗ Confirm Rejection'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setAction(null); setRejectionReason(''); }}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReviewClearance;
