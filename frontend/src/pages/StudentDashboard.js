import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { studentService, clearanceService } from '../services/api';

import { openSecureFile } from '../utils/secureFile';


const StudentDashboard = ({ user }) => {
  const [studentInfo, setStudentInfo] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentInfo();
    fetchRequests();
  }, []);

  // Fetch student profile info independently
  const fetchStudentInfo = async () => {
    try {
      const res = await studentService.getMyInfo();
      setStudentInfo(res.data);
    } catch (err) {
      console.error('Student info error:', err);
      // Non-critical: just show profile from cached user object
    }
  };

  // Fetch clearance requests independently
  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await clearanceService.getMyRequests();
      setRequests(res.data || []);
    } catch (err) {
      console.error('Clearance requests error:', err);
      setError('Failed to load clearance history. Please refresh.');
    } finally {
      setLoadingRequests(false);
    }
  };

  const getLatestRequest = () => {
    if (!requests.length) return null;
    return [...requests].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    )[0];
  };

  const getClearanceBanner = (latestReq) => {
    if (!latestReq) return null;
    switch (latestReq.status) {
      case 'approved':
        return {
          icon: '✅',
          title: 'Clearance Approved!',
          text: `Your clearance was approved on ${new Date(latestReq.reviewed_at).toLocaleDateString()}.`,
          cls: 'card card-success',
          color: 'var(--success)',
          badge: <span className="badge badge-approved">Cleared</span>,
          extra: latestReq.certificate_path ? (
            <button
              type="button"
              onClick={() => openSecureFile(latestReq.certificate_path)}
              className="btn btn-success btn-sm"
              id="download-cert-banner-btn"
            >
              ⬇️ Download Certificate
            </button>
          ) : null,
        };
      case 'rejected':
        return {
          icon: '❌',
          title: 'Clearance Rejected',
          text: latestReq.reason_for_rejection || 'Please review the rejection reason and resubmit.',
          cls: 'card card-danger',
          color: 'var(--danger)',
          badge: <span className="badge badge-rejected">Rejected</span>,
        };
      case 'pending':
        return {
          icon: '⏳',
          title: 'Under Review',
          text: 'Your clearance request is being reviewed by admin. Check back soon.',
          cls: 'card card-warning',
          color: 'var(--warning)',
          badge: <span className="badge badge-pending">Pending</span>,
        };
      default:
        return null;
    }
  };

  const latestReq = getLatestRequest();
  const banner = getClearanceBanner(latestReq);

  // Derive profile: prefer backend data, fall back to cached user prop
  const profile = studentInfo || user;

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          👋 Welcome back, {profile?.full_name?.split(' ')[0] || profile?.username}!
        </h1>
        <p className="page-subtitle">Here's an overview of your clearance status.</p>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* Clearance Status Banner */}
      {banner ? (
        <div className={`clearance-status-banner ${banner.cls} animate-slideUp`}>
          <span className="clearance-status-icon">{banner.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '16px', color: banner.color, marginBottom: '4px' }}>
              {banner.title}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{banner.text}</div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {banner.extra}
            {banner.badge}
          </div>
        </div>
      ) : (
        !loadingRequests && (
          <div className="clearance-status-banner card-glass animate-slideUp">
            <span className="clearance-status-icon">📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                No clearance request yet
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Submit a clearance request to get started.
              </div>
            </div>
            <Link to="/student/clearance" className="btn btn-primary btn-sm">
              Request Now →
            </Link>
          </div>
        )
      )}

      {/* Profile + Clearance Stats Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {/* Student Profile Card */}
        <div className="card animate-slideUp" style={{ animationDelay: '0.05s' }}>
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>🎓 Student Profile</div>
            <span className="badge badge-student">Student</span>
          </div>

          <div className="info-row">
            <span className="info-label">Full Name</span>
            <span className="info-value">{profile?.full_name || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Username</span>
            <span className="info-value">@{profile?.username || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{profile?.email || '—'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Since</span>
            <span className="info-value">
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </span>
          </div>

          <div style={{ marginTop: 'var(--space-5)' }}>
            <Link to="/student/clearance" className="btn btn-primary btn-block" id="go-to-clearance-btn">
              📄 Submit Clearance Request
            </Link>
          </div>
        </div>

        {/* Clearance Stats Card */}
        <div className="card animate-slideUp" style={{ animationDelay: '0.1s' }}>
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>📊 Clearance Summary</div>
          </div>

          {loadingRequests ? (
            <div className="loading-screen" style={{ minHeight: '120px' }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <div className="info-row">
                <span className="info-label">Total Requests</span>
                <span className="info-value" style={{ fontWeight: 700 }}>{requests.length}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Pending</span>
                <span className="info-value" style={{ color: 'var(--warning)' }}>
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Approved</span>
                <span className="info-value" style={{ color: 'var(--success)' }}>
                  {requests.filter(r => r.status === 'approved').length}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Rejected</span>
                <span className="info-value" style={{ color: 'var(--danger)' }}>
                  {requests.filter(r => r.status === 'rejected').length}
                </span>
              </div>

              {latestReq && (
                <div className="info-row" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                  <span className="info-label">Last Submitted</span>
                  <span className="info-value" style={{ fontSize: '12px' }}>
                    {new Date(latestReq.created_at).toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clearance Request History Table */}
      <div className="card animate-slideUp" style={{ animationDelay: '0.15s' }}>
        <div className="card-header">
          <div className="section-title" style={{ marginBottom: 0 }}>📜 Clearance Request History</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={fetchRequests}
              disabled={loadingRequests}
            >
              {loadingRequests ? <div className="spinner spinner-sm" /> : '🔄'} Refresh
            </button>
            {requests.length > 0 && (
              <Link to="/student/clearance" className="btn btn-ghost btn-sm">View All →</Link>
            )}
          </div>
        </div>

        {loadingRequests ? (
          <div className="loading-screen" style={{ minHeight: '120px' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)' }}>Loading requests…</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No requests yet</div>
            <p style={{ fontSize: '13px' }}>
              <Link to="/student/clearance">Submit your first clearance request</Link>
            </p>
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
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id}>
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
                          id={`download-cert-${req.id}`}
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

            {/* Rejection reasons */}
            {requests.some(r => r.status === 'rejected' && r.reason_for_rejection) && (
              <div style={{ padding: 'var(--space-4)' }}>
                {requests
                  .filter(r => r.status === 'rejected' && r.reason_for_rejection)
                  .map(req => (
                    <div key={req.id} className="alert alert-error" style={{ marginBottom: '8px' }}>
                      <span>❌</span>
                      <div>
                        <strong>Request #{req.id} rejected:</strong> {req.reason_for_rejection}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
