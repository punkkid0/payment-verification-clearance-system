import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { API_BASE_URL, assetUrl } from '../config';

const SecureImage = ({ src, alt = '', className = '', style = {} }) => {
  const [blobUrl, setBlobUrl] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!src) {
      setLoading(false);
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(false);
        const fullUrl = assetUrl(src);
        const relativePath = fullUrl.replace(API_BASE_URL, '');
        const response = await api.get(relativePath, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (loading) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '13px' }}>
        Loading…
      </div>
    );
  }

  if (error || !blobUrl) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-elevated)', color: 'var(--text-muted)', fontSize: '13px' }}>
        Unable to load image
      </div>
    );
  }

  return <img src={blobUrl} alt={alt} className={className} style={style} />;
};

export default SecureImage;