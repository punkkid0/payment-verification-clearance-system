// Centralized config for API, assets, and fee amounts

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const ASSET_BASE_URL =
  process.env.REACT_APP_ASSET_URL ||
  (process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'http://localhost:5000');

export const FEE_AMOUNTS = {
  indigene: 75600,
  nonIndigene: 81500,
};

export function getExpectedFee(isIndigene) {
  return isIndigene ? FEE_AMOUNTS.indigene : FEE_AMOUNTS.nonIndigene;
}

export const assetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const match = path.match(/\/uploads\/(receipts|avatars|certificates)\/(.+)/);
  if (match) {
    return `${API_BASE_URL}/files/${match[1]}/${match[2]}`;
  }

  return `${ASSET_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

export default {
  API_BASE_URL,
  ASSET_BASE_URL,
  FEE_AMOUNTS,
  getExpectedFee,
  assetUrl,
};