import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { clearanceService } from './services/api';
import AdminReviewClearance from './AdminReviewClearance';

const AdminDashboard = () => {
  const { id: routeId } = useParams();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(routeId ? parseInt(routeId, 10) : null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    if (routeId) {
      setSelectedId(parseInt(routeId, 10));
    }
  }, [routeId]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await clearanceService.getPending();
      setRequests(res.data || []);
      setLastRefresh(new Date());
      setError('');
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load clearance requests. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getFiltered = () => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === filter);
  };

  const stats = {
    total:    requests.length,
    pending:  requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const filtered = getFiltered();

  // If viewing a specific request
  if (selectedId !== null) {
    return (
      <div className="animate-fadeIn">
        <button
          className="btn btn-ghost btn-sm mb-6"
          onClick={() => { setSelectedId(null); fetchRequests(); }}
          id="back-to-dashboard-btn"
        >
          ← Back to Dashboard
        </button>
        <AdminReviewClearance
          requestId={selectedId}
          onClose={() => { setSelectedId(null); fetchRequests(); }}
        />
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header flex items-center justify-between" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">📋 Clearance Dashboard</h1>
          <p className="page-subtitle">
            Review and approve student clearance requests
            {lastRefresh && (
              <span style={{ marginLeft: '8px', opacity: 0.6, fontSize: '12px' }}>
                · Updated {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          id="refresh-btn"
          className="btn btn-ghost btn-sm"
          onClick={fetchRequests}
          disabled={loading}
        >
          {loading ? <div className="spinner spinner-sm" /> : '🔄'} Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error mb-6">
          <span>⚠️</span><span>{error}</span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid-4 mb-8" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { key: 'all', label: 'Total',    count: stats.total,    color: 'var(--accent-light)',  icon: '📊' },
          { key: 'pending', label: 'Pending',  count: stats.pending,  color: 'var(--warning)',   icon: '⏳' },
          { key: 'approved', label: 'Approved', count: stats.approved, color: 'var(--success)',   icon: '✅' },
          { key: 'rejected', label: 'Rejected', count: stats.rejected, color: 'var(--danger)',    icon: '❌' },
        ].map(({ key, label, count, color, icon }) => (
          <div
            key={key}
            id={`filter-${key}`}
            className={`stat-card${filter === key ? ` active active-${key}` : ''}`}
            onClick={() => setFilter(key)}
          >
            <div style={{ fontSize: '20px', marginBottom: '8px' }}>{icon}</div>
            <div className="stat-value" style={{ color }}>{count}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Requests List */}
      <div className="card">
        <div className="card-header">
          <div className="section-title" style={{ marginBottom: 0 }}>
            {filter === 'all' ? 'All Requests' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Requests`}
            {filtered.length > 0 && (
              <span style={{ marginLeft: '10px', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
                ({filtered.length})
              </span>
            )}
          </div>
          {stats.pending > 0 && (
            <span className="badge badge-pending animate-pulse">
              {stats.pending} Awaiting Review
            </span>
          )}
        </div>

        {loading && requests.length === 0 ? (
          <div className="loading-screen" style={{ minHeight: '200px' }}>
            <div className="spinner" />
            <p style={{ color: 'var(--text-muted)' }}>Loading requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {filter === 'pending' ? '🎉' : '📭'}
            </div>
            <div className="empty-state-title">
              {filter === 'pending' ? 'All caught up!' : 'No requests here'}
            </div>
            <p style={{ fontSize: '13px' }}>
              {filter === 'pending'
                ? 'No pending requests to review right now.'
                : `No ${filter} requests to display.`}
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Request ID</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Auto Check</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => setSelectedId(req.id)}
                    id={`request-row-${req.id}`}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0
                        }}>
                          {(req.student_name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>
                            {req.student_name || `Student #${req.student_id}`}
                          </div>
                          {req.student_username && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              @{req.student_username}
                            </div>
                          )}
                          {req.student_email && (
                            <div style={{ fontSize: '11px', color: 'var(--accent-light)', marginTop: '1px' }}>
                              {req.student_email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      #{req.id}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                      {new Date(req.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge badge-${req.status}`}>
                        {req.status === 'pending'
                          ? 'Pending Review'
                          : req.status === 'approved'
                          ? 'Approved'
                          : 'Rejected'}
                      </span>
                    </td>
                    <td>
                      {req.auto_verification_score != null ? (
                        <span
                          title={`Auto score: ${req.auto_verification_score} — ${req.auto_decision || ''}`}
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                            background: req.auto_decision === 'authentic' ? 'rgba(16,185,129,0.15)' : 
                                        req.auto_decision === 'likely_fake' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            color: req.auto_decision === 'authentic' ? 'var(--success)' : 
                                   req.auto_decision === 'likely_fake' ? 'var(--danger)' : '#d97706'
                          }}
                        >
                          {req.auto_verification_score} {req.auto_decision === 'authentic' ? '✓' : req.auto_decision === 'likely_fake' ? '✗' : '⚠'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${req.status === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(req.id); }}
                        id={`review-btn-${req.id}`}
                      >
                        {req.status === 'pending' ? 'Review →' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
