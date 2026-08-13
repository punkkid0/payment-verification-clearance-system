import api from '../services/api';
import { API_BASE_URL, assetUrl } from '../config';

export async function openSecureFile(path) {
  const fullUrl = assetUrl(path);
  const relativePath = fullUrl.replace(API_BASE_URL, '');
  const response = await api.get(relativePath, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(response.data);
  window.open(blobUrl, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}

export async function fetchSecureBlobUrl(path) {
  const fullUrl = assetUrl(path);
  const relativePath = fullUrl.replace(API_BASE_URL, '');
  const response = await api.get(relativePath, { responseType: 'blob' });
  return URL.createObjectURL(response.data);
}