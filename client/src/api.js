export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

async function request(path, { method = 'GET', body, form } = {}) {
  const opts = { method, credentials: 'include', headers: {} };
  if (form) opts.body = form; // browser sets the multipart boundary
  else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(`${API_BASE}/api${path}`, opts); } catch { throw new ApiError('Cannot reach the server', 0); }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, form) => request(p, { method: 'POST', form }),
};
