import React, { useState, useEffect, useRef } from 'react';
import { studentService, getApiError } from '../services/api';

import { getExpectedFee } from '../config';
import { fetchSecureBlobUrl } from '../utils/secureFile';

const StudentProfile = ({ user, onUserUpdate }) => {
  // ── State ──────────────────────────────────────────────────────
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);

  // Info form
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');

  const [infoMsg, setInfoMsg]   = useState({ type: '', text: '' });
  const [savingInfo, setSavingInfo] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg]         = useState({ type: '', text: '' });
  const [savingPw, setSavingPw]   = useState(false);
  const [showPw, setShowPw]       = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });
  const [avatarDrag, setAvatarDrag] = useState(false);
  const avatarInputRef = useRef(null);

  // ── Load profile ───────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await studentService.getMyInfo();
      const data = res.data;
      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      if (data.avatar_url) {
        try {
          const blobUrl = await fetchSecureBlobUrl(data.avatar_url);
          setAvatarPreview(blobUrl);
        } catch {
          setAvatarPreview(null);
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Info update ────────────────────────────────────────────────
  const handleInfoSubmit = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg({ type: '', text: '' });
    try {
      const res = await studentService.updateProfile({ full_name: fullName, email });
      setInfoMsg({ type: 'success', text: '✅ Profile updated successfully!' });
      setProfile(prev => ({ ...prev, ...res.data.user }));
      if (onUserUpdate) onUserUpdate(res.data.user);
    } catch (err) {
      setInfoMsg({ type: 'error', text: getApiError(err, 'Failed to update profile.') });
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Password change ────────────────────────────────────────────
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    if (!/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw)) {
      setPwMsg({ type: 'error', text: 'Password must contain at least one letter and one number.' });
      return;
    }
    setSavingPw(true);
    try {
      await studentService.updateProfile({ current_password: currentPw, new_password: newPw });
      setPwMsg({ type: 'success', text: '✅ Password changed successfully!' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ type: 'error', text: getApiError(err, 'Failed to change password.') });
    } finally {
      setSavingPw(false);
    }
  };

  // ── Avatar upload ──────────────────────────────────────────────
  const handleAvatarFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Image must be under 3 MB.' });
      return;
    }

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setUploadingAvatar(true);
    setAvatarMsg({ type: '', text: '' });

    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await studentService.uploadAvatar(fd);
      setAvatarMsg({ type: 'success', text: '✅ Profile picture updated!' });
      setProfile(prev => ({ ...prev, avatar_url: res.data.avatar_url }));
      const blobUrl = await fetchSecureBlobUrl(res.data.avatar_url);
      setAvatarPreview(blobUrl);
      if (onUserUpdate) onUserUpdate(res.data.user);
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.response?.data?.error || 'Upload failed.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">👤 My Profile</h1>
        <p className="page-subtitle">Manage your personal information and account settings.</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>

        {/* ── Left column: Avatar + basic info ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Avatar card */}
          <div className="card animate-slideUp" style={{ textAlign: 'center' }}>
            <div className="section-title">📸 Profile Picture</div>

            {/* Avatar circle */}
            <div
              style={{ position: 'relative', display: 'inline-block', marginBottom: 'var(--space-5)' }}
              onDragOver={(e) => { e.preventDefault(); setAvatarDrag(true); }}
              onDragLeave={() => setAvatarDrag(false)}
              onDrop={(e) => {
                e.preventDefault(); setAvatarDrag(false);
                handleAvatarFile(e.dataTransfer.files[0]);
              }}
            >
              <div style={{
                width: '120px', height: '120px', borderRadius: '50%',
                margin: '0 auto',
                border: `3px solid ${avatarDrag ? 'var(--accent)' : 'var(--border)'}`,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'border-color 0.2s ease',
                boxShadow: avatarDrag ? 'var(--shadow-accent)' : 'var(--shadow-md)',
              }}
                onClick={() => avatarInputRef.current?.click()}
                title="Click or drag to change photo"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '40px', fontWeight: 700, color: '#fff' }}>
                    {getInitials(profile?.full_name || profile?.username)}
                  </span>
                )}
              </div>

              {/* Upload spinner overlay */}
              {uploadingAvatar && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
                </div>
              )}

              {/* Camera badge */}
              <div style={{
                position: 'absolute', bottom: '4px', right: '4px',
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--accent)', border: '2px solid var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', cursor: 'pointer',
              }}
                onClick={() => avatarInputRef.current?.click()}
              >
                📷
              </div>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleAvatarFile(e.target.files[0])}
              id="avatar-file-input"
            />

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Click the photo or drag & drop to change it<br />JPEG, PNG, WebP · Max 3MB
            </p>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              id="change-photo-btn"
            >
              {uploadingAvatar ? <><div className="spinner spinner-sm" /> Uploading…</> : '📷 Change Photo'}
            </button>

            {avatarMsg.text && (
              <div className={`alert alert-${avatarMsg.type === 'success' ? 'success' : 'error'}`}
                style={{ marginTop: 'var(--space-4)', textAlign: 'left' }}>
                <span>{avatarMsg.text}</span>
              </div>
            )}
          </div>

          {/* Read-only account info */}
          <div className="card animate-slideUp" style={{ animationDelay: '0.05s' }}>
            <div className="section-title">🪪 Account Info</div>
            <div className="info-row">
              <span className="info-label">Username</span>
              <span className="info-value" style={{ fontFamily: 'monospace' }}>@{profile?.username}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Role</span>
              <span className="info-value">🎓 Student</span>
            </div>
            <div className="info-row">
              <span className="info-label">Member Since</span>
              <span className="info-value">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric'
                }) : '—'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
              Username cannot be changed.
            </p>
          </div>
        </div>

        {/* ── Right column: Edit info + Change password ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Edit name & email */}
          <div className="card animate-slideUp" style={{ animationDelay: '0.08s' }}>
            <div className="section-title">✏️ Edit Personal Info</div>
            <form onSubmit={handleInfoSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-fullname">Full Name</label>
                <input
                  id="edit-fullname"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label" htmlFor="edit-email">Email Address</label>
                <input
                  id="edit-email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label">Indigene Status</label>
                <div style={{
                  padding: '12px 16px', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}>
                  <span style={{ fontWeight: 600, color: profile?.is_indigene ? 'var(--success)' : '#d97706' }}>
                    {profile?.is_indigene ? 'Indigene of the State' : 'Non-indigene'}
                  </span>
                  <span style={{ marginLeft: '8px', color: 'var(--text-muted)' }}>
                    — Expected fee: ₦{getExpectedFee(!!profile?.is_indigene).toLocaleString()}
                  </span>
                </div>
                <span className="form-hint">
                  Indigene status is set by the school admin and cannot be changed here. Contact the bursary if incorrect.
                </span>
              </div>

              {infoMsg.text && (
                <div className={`alert alert-${infoMsg.type === 'success' ? 'success' : 'error'}`}
                  style={{ margin: 'var(--space-4) 0' }}>
                  <span>{infoMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={savingInfo}
                style={{ marginTop: 'var(--space-5)' }}
                id="save-info-btn"
              >
                {savingInfo ? <><div className="spinner spinner-sm" style={{ marginRight: '8px' }} /> Saving…</> : '💾 Save Changes'}
              </button>
            </form>
          </div>

          {/* Change password */}
          <div className="card animate-slideUp" style={{ animationDelay: '0.12s' }}>
            <div className="section-title">🔒 Change Password</div>
            <form onSubmit={handlePwSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="current-pw">Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="current-pw"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label" htmlFor="new-pw">New Password</label>
                <input
                  id="new-pw"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 8 characters, with a letter and a number"
                  required
                  minLength={8}
                />
              </div>

              <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
                <label className="form-label" htmlFor="confirm-pw">Confirm New Password</label>
                <input
                  id="confirm-pw"
                  type={showPw ? 'text' : 'password'}
                  className="form-input"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Repeat new password"
                  required
                />
              </div>

              {/* Show/hide toggle */}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowPw(v => !v)}
                style={{ marginTop: 'var(--space-2)' }}
              >
                {showPw ? '🙈 Hide passwords' : '👁️ Show passwords'}
              </button>

              {/* Password strength indicator */}
              {newPw && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Password strength:
                  </div>
                  <div style={{
                    height: '4px', borderRadius: '2px', background: 'var(--border)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: '2px', transition: 'width 0.3s, background 0.3s',
                      width: newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw)
                        ? '25%' : newPw.length < 10 ? '60%' : '100%',
                      background: newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw)
                        ? 'var(--danger)' : newPw.length < 10 ? 'var(--warning)' : 'var(--success)',
                    }} />
                  </div>
                  <div style={{
                    fontSize: '11px', marginTop: '4px',
                    color: newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw)
                      ? 'var(--danger)' : newPw.length < 10 ? 'var(--warning)' : 'var(--success)',
                  }}>
                    {newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw)
                      ? 'Weak' : newPw.length < 10 ? 'Fair' : 'Strong'}
                  </div>
                </div>
              )}

              {pwMsg.text && (
                <div className={`alert alert-${pwMsg.type === 'success' ? 'success' : 'error'}`}
                  style={{ margin: 'var(--space-4) 0' }}>
                  <span>{pwMsg.text}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={savingPw || !currentPw || !newPw || !confirmPw}
                style={{ marginTop: 'var(--space-5)' }}
                id="change-pw-btn"
              >
                {savingPw ? <><div className="spinner spinner-sm" style={{ marginRight: '8px' }} /> Updating…</> : '🔒 Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
