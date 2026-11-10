import { createHash, randomUUID } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const id = () => randomUUID();
export const hash = value => createHash('sha256').update(value).digest('hex');
export const now = () => new Date().toISOString();
export const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
});
export async function body(request) {
  const text = await request.text();
  if (Buffer.byteLength(text) > 32_768) throw new HttpError(413, 'Request too large');
  try { const data = JSON.parse(text || '{}'); if (!data || typeof data !== 'object' || Array.isArray(data)) throw 0; return data; }
  catch { throw new HttpError(400, 'Expected a JSON object'); }
}
export function text(value, max = 200) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
export function safeUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') ? u.href : null; }
  catch { return null; }
}
export function host(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } }
export function number(value, min, max, fallback) { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }
export function cookies(request) { return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(x => { const i = x.indexOf('='); return i < 0 ? [] : [x.slice(0, i).trim(), decodeURIComponent(x.slice(i + 1))]; }).filter(x => x.length)); }
export function cookie(name, value, maxAge = 3600) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
export const config = () => ({
  auth: process.env.AUTH_MODE || 'local', storage: process.env.STORAGE || 'local',
  origin: process.env.APP_ORIGIN || 'http://localhost:3000',
  demo: !process.env.SERPER_API_KEY,
});
export function appendCookies(response, values) { for (const c of values) response.headers.append('set-cookie', c); return response; }
