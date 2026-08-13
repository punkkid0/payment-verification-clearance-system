import React, { useState, useEffect } from 'react';

/**
 * PWA Install Prompt
 * Shows a sleek banner when the browser's "beforeinstallprompt" event fires,
 * inviting the user to install ClearanceHub as an app.
 */
const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner]         = useState(false);
  const [installed, setInstalled]           = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || installed) return null;

  return (
    <div
      id="pwa-install-banner"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        maxWidth: '420px',
        width: 'calc(100% - 32px)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        animation: 'slideUp 0.4s ease both',
      }}
    >
      {/* Icon */}
      <div style={{
        width: '46px', height: '46px', borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px', flexShrink: 0,
      }}>
        🎓
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
          Install ClearanceHub
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Add to your home screen for quick access — works offline!
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleInstall}
          style={{ fontSize: '13px', padding: '6px 14px', whiteSpace: 'nowrap' }}
          id="install-app-btn"
        >
          Install
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={handleDismiss}
          style={{ fontSize: '11px', padding: '4px 8px', opacity: 0.7 }}
          id="dismiss-install-btn"
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
