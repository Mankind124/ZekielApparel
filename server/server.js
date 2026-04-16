/**
 * Zekiel Apparel – Admin Backend API
 * Stack: Express + JSON file store + JWT auth + Multer uploads
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT         = process.env.PORT || 3000;
const JWT_SECRET   = process.env.JWT_SECRET || 'change-me-in-production';
const DATA_DIR     = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR  = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const USERS_FILE   = path.join(DATA_DIR, 'users.json');

// Ensure storage directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
}

// Seed default content/user files if missing
async function seedIfMissing() {
  if (!fsSync.existsSync(CONTENT_FILE)) {
    const seed = await fs.readFile(path.join(__dirname, 'seed-content.json'), 'utf8');
    await fs.writeFile(CONTENT_FILE, seed);
  }
  if (!fsSync.existsSync(USERS_FILE)) {
    const defaultPass = process.env.ADMIN_PASSWORD || 'ChangeMe2026!';
    const defaultEmail = process.env.ADMIN_EMAIL || 'zekielapparel@gmail.com';
    const hash = await bcrypt.hash(defaultPass, 10);
    await fs.writeFile(USERS_FILE, JSON.stringify({ users: [{ email: defaultEmail, passwordHash: hash }] }, null, 2));
    console.log('\n==========================================');
    console.log(' Default admin seeded:');
    console.log(' Email:    ' + defaultEmail);
    console.log(' Password: ' + defaultPass);
    console.log(' Change it after first login!');
    console.log('==========================================\n');
  }
}

// ── Helpers ──────────────────────────────────────────────
async function readJSON(file) { return JSON.parse(await fs.readFile(file, 'utf8')); }
async function writeJSON(file, data) { await fs.writeFile(file, JSON.stringify(data, null, 2)); }

// ── App ──────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve admin SPA
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Serve uploaded images publicly
app.use('/uploads', express.static(UPLOADS_DIR, {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'public, max-age=86400'); }
}));

// ── Multer (file uploads) ────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-z0-9.\-_]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// ── Auth middleware ──────────────────────────────────────
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Routes ───────────────────────────────────────────────

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const db = await readJSON(USERS_FILE);
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Change password
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 chars' });
    const db = await readJSON(USERS_FILE);
    const user = db.users.find(u => u.email.toLowerCase() === req.user.email.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await writeJSON(USERS_FILE, db);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not change password' });
  }
});

// Get all content (PUBLIC)
app.get('/api/content', async (_, res) => {
  try {
    const data = await readJSON(CONTENT_FILE);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load content' });
  }
});

// Update entire content (ADMIN)
app.put('/api/content', requireAuth, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid body' });
    await writeJSON(CONTENT_FILE, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not save content' });
  }
});

// Update a single section (ADMIN)
app.patch('/api/content/:section', requireAuth, async (req, res) => {
  try {
    const section = req.params.section;
    const data = await readJSON(CONTENT_FILE);
    data[section] = req.body;
    await writeJSON(CONTENT_FILE, data);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not update section' });
  }
});

// Upload image (ADMIN)
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

// Delete uploaded image (ADMIN)
app.delete('/api/upload/:filename', requireAuth, async (req, res) => {
  try {
    const name = path.basename(req.params.filename); // prevent traversal
    const file = path.join(UPLOADS_DIR, name);
    if (!fsSync.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    await fs.unlink(file);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not delete file' });
  }
});

// List uploaded images (ADMIN)
app.get('/api/uploads', requireAuth, async (_, res) => {
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    const items = files.map(f => ({ filename: f, url: `/uploads/${f}` }));
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not list uploads' });
  }
});

// Root redirect
app.get('/', (_, res) => res.redirect('/admin/'));

// Catch-all 404 for API
app.use('/api/*', (_, res) => res.status(404).json({ error: 'Not found' }));

// ── Start ────────────────────────────────────────────────
seedIfMissing()
  .then(() => app.listen(PORT, () => console.log(`Zekiel Apparel API running on :${PORT}`)))
  .catch(err => { console.error('Startup failed:', err); process.exit(1); });
