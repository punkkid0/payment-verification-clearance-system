import React, { useState, useEffect } from 'react';
import { ledgerService, studentService, getApiError } from './services/api';
import { FEE_AMOUNTS, getExpectedFee } from './config';

const PAYMENT_METHODS = ['remita', 'paystack', 'bank_transfer', 'cash', 'other'];

const AdminLedger = () => {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    rrr: '',
    student_id: '',
    amount: FEE_AMOUNTS.nonIndigene,
    payment_method: 'remita',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ledgerRes, studentsRes] = await Promise.all([
        ledgerService.list(),
        studentService.getAll(),
      ]);
      setPayments(ledgerRes.data || []);
      setStudents(studentsRes.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load ledger data.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (studentId) => {
    const student = students.find((s) => s.id === parseInt(studentId, 10));
    setForm((prev) => ({
      ...prev,
      student_id: studentId,
      amount: student ? getExpectedFee(!!student.is_indigene) : prev.amount,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await ledgerService.record({
        ...form,
        student_id: parseInt(form.student_id, 10),
        amount: parseFloat(form.amount),
      });
      setSuccess('✅ Ledger payment recorded successfully.');
      setForm({
        rrr: '',
        student_id: '',
        amount: FEE_AMOUNTS.nonIndigene,
        payment_method: 'remita',
        notes: '',
      });
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(getApiError(err, 'Failed to record payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.rrr?.toLowerCase().includes(q) ||
      p.student_name?.toLowerCase().includes(q) ||
      p.student_email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="animate-fadeIn">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">🏦 Official Payment Ledger</h1>
          <p className="page-subtitle">Record school fee payments into the trusted ledger used for auto-verification</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Record Payment'}
        </button>
      </div>

      {error && <div className="alert alert-error mb-4"><span>⚠️</span><span>{error}</span></div>}
      {success && <div className="alert alert-success mb-4"><span>✅</span><span>{success}</span></div>}

      {showForm && (
        <div className="card mb-6">
          <div className="card-header">
            <div className="section-title" style={{ marginBottom: 0 }}>Record New Ledger Payment</div>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: 'var(--space-4)' }}>
            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">RRR / Payment Reference *</label>
                <input
                  className="form-input"
                  value={form.rrr}
                  onChange={(e) => setForm({ ...form, rrr: e.target.value })}
                  placeholder="e.g. RRR-IND-001234567890"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Student *</label>
                <select
                  className="form-input"
                  value={form.student_id}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  required
                >
                  <option value="">Select student…</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} (@{s.username}) — {s.is_indigene ? 'Indigene' : 'Non-indigene'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₦) *</label>
                <select
                  className="form-input"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  required
                >
                  <option value={FEE_AMOUNTS.indigene}>₦{FEE_AMOUNTS.indigene.toLocaleString()} (Indigene)</option>
                  <option value={FEE_AMOUNTS.nonIndigene}>₦{FEE_AMOUNTS.nonIndigene.toLocaleString()} (Non-indigene)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-input"
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Notes (optional)</label>
              <input
                className="form-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Session, batch reference, etc."
              />
            </div>
            <button type="submit" className="btn btn-primary mt-4" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record to Ledger'}
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Ledger Entries ({filtered.length})</div>
          <input
            className="form-input"
            style={{ maxWidth: '260px' }}
            placeholder="Search RRR, name, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '200px' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No ledger entries</div>
            <p style={{ fontSize: '13px' }}>Record a payment to enable auto-verification for students.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>RRR</th>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{p.rrr}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.student_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.student_email}</div>
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>₦{Number(p.amount).toLocaleString()}</td>
                    <td>{p.payment_method}</td>
                    <td style={{ fontSize: '13px' }}>{new Date(p.payment_date || p.created_at).toLocaleString()}</td>
                    <td><span className="badge badge-approved">{p.status}</span></td>
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

export default AdminLedger;