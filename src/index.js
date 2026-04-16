/**
 * Zekiel Apparel — Cloudflare Worker with Static Assets
 *
 * - Static files (HTML, CSS, JS, images, admin SPA) served automatically
 *   by the [assets] binding from the /public folder.
 * - This Worker handles only /api/* (backend) and /uploads/* (R2 images).
 *
 * Expected bindings:
 *   ZEKIEL_KV — KV namespace (content + admin user)
 *   ZEKIEL_R2 — R2 bucket (uploaded images)
 * Expected env vars:
 *   JWT_SECRET (secret), ADMIN_EMAIL, ADMIN_PASSWORD (secret, only for first run)
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import jwt from '@tsndr/cloudflare-worker-jwt';
import seedContent from './seed.js';

const app = new Hono();
app.use('*', cors());

/* ── Crypto helpers (Web Crypto, no deps) ─────── */

function bytesToHex(bytes) {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
function bytesToBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function hashPassword(password, salt = null) {
  const saltStr = salt || bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hashBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(saltStr), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return `${saltStr}:${bytesToBase64(new Uint8Array(hashBits))}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt] = stored.split(':');
  const recomputed = await hashPassword(password, salt);
  if (recomputed.length !== stored.length) return false;
  let diff = 0;
  for (let i = 0; i < recomputed.length; i++) {
    diff |= recomputed.charCodeAt(i) ^ stored.charCodeAt(i);
  }
  return diff === 0;
}

/* ── Seed (first run) ─────────────────────────── */

async function ensureSeeded(env) {
  const haveContent = await env.ZEKIEL_KV.get('content');
  if (!haveContent) {
    await env.ZEKIEL_KV.put('content', JSON.stringify(seedContent));
  }
  const haveUser = await env.ZEKIEL_KV.get('user:admin');
  if (!haveUser) {
    const email = env.ADMIN_EMAIL || 'zekielapparel@gmail.com';
    const password = env.ADMIN_PASSWORD || 'ChangeMe2026!';
    const passwordHash = await hashPassword(password);
    await env.ZEKIEL_KV.put('user:admin', JSON.stringify({ email, passwordHash }));
  }
}

/* ── Auth middleware ──────────────────────────── */

async function requireAuth(c) {
  const h = c.req.header('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const secret = c.env.JWT_SECRET || 'dev-secret-change-me';
  try {
    const valid = await jwt.verify(token, secret);
    if (!valid) return null;
    const { payload } = jwt.decode(token);
    return payload;
  } catch {
    return null;
  }
}

function unauthorized(c) {
  return c.json({ error: 'Missing or invalid token' }, 401);
}

/* ── API: Health ──────────────────────────────── */

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

/* ── API: Auth ────────────────────────────────── */

app.post('/api/auth/login', async (c) => {
  await ensureSeeded(c.env);
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Bad request' }, 400); }
  const { email, password } = body || {};
  if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
  const userStr = await c.env.ZEKIEL_KV.get('user:admin');
  if (!userStr) return c.json({ error: 'Invalid credentials' }, 401);
  const user = JSON.parse(userStr);
  if (user.email.toLowerCase() !== email.toLowerCase()) return c.json({ error: 'Invalid credentials' }, 401);
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return c.json({ error: 'Invalid credentials' }, 401);
  const secret = c.env.JWT_SECRET || 'dev-secret-change-me';
  const token = await jwt.sign(
    { email: user.email, exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600 },
    secret
  );
  return c.json({ token, email: user.email });
});

app.post('/api/auth/change-password', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Bad request' }, 400); }
  const { currentPassword, newPassword } = body || {};
  if (!currentPassword || !newPassword) return c.json({ error: 'Both passwords required' }, 400);
  if (newPassword.length < 8) return c.json({ error: 'New password must be at least 8 chars' }, 400);
  const userStr = await c.env.ZEKIEL_KV.get('user:admin');
  if (!userStr) return c.json({ error: 'User not found' }, 404);
  const user = JSON.parse(userStr);
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return c.json({ error: 'Current password is incorrect' }, 401);
  user.passwordHash = await hashPassword(newPassword);
  await c.env.ZEKIEL_KV.put('user:admin', JSON.stringify(user));
  return c.json({ ok: true });
});

/* ── API: Content ─────────────────────────────── */

app.get('/api/content', async (c) => {
  await ensureSeeded(c.env);
  const str = await c.env.ZEKIEL_KV.get('content');
  return c.json(str ? JSON.parse(str) : {});
});

app.put('/api/content', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Bad request' }, 400); }
  if (!body || typeof body !== 'object') return c.json({ error: 'Invalid body' }, 400);
  await c.env.ZEKIEL_KV.put('content', JSON.stringify(body));
  return c.json({ ok: true });
});

app.patch('/api/content/:section', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  const section = c.req.param('section');
  const str = await c.env.ZEKIEL_KV.get('content');
  const content = str ? JSON.parse(str) : {};
  content[section] = await c.req.json();
  await c.env.ZEKIEL_KV.put('content', JSON.stringify(content));
  return c.json({ ok: true });
});

/* ── API: Uploads (admin management) ──────────── */

app.post('/api/upload', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  const formData = await c.req.formData();
  const file = formData.get('file');
  if (!file || typeof file === 'string') return c.json({ error: 'No file provided' }, 400);
  if (!/^image\//.test(file.type)) return c.json({ error: 'Only image files are allowed' }, 400);
  if (file.size > 10 * 1024 * 1024) return c.json({ error: 'File too large (10MB max)' }, 400);
  const safe = file.name.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
  const key = `${Date.now()}-${safe}`;
  await c.env.ZEKIEL_R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });
  return c.json({ url: `/uploads/${key}`, filename: key });
});

app.delete('/api/upload/:filename', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  await c.env.ZEKIEL_R2.delete(c.req.param('filename'));
  return c.json({ ok: true });
});

app.get('/api/uploads', async (c) => {
  const auth = await requireAuth(c);
  if (!auth) return unauthorized(c);
  const listed = await c.env.ZEKIEL_R2.list({ limit: 1000 });
  const items = listed.objects.map(o => ({ filename: o.key, url: `/uploads/${o.key}` }));
  return c.json({ items });
});

/* ── Public: serve uploaded images from R2 ────── */

app.get('/uploads/:key', async (c) => {
  const obj = await c.env.ZEKIEL_R2.get(c.req.param('key'));
  if (!obj) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(obj.body, { headers });
});

/* ── 404 for unhandled /api/* paths ───────────── */

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

export default app;
