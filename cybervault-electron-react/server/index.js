import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import {
  initMySqlSchema,
  findUserByEmail,
  upsertUser,
  createLoginEvent,
  replaceUserFiles,
  getInsights,
  findAdminByUsername,
  createAdminUser,
  registerDevice,
  findDeviceByToken,
  getChangesSince,
  pool,
} from './mysql.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const port = Number(process.env.API_PORT || 3000);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', async (req, res) => {
  res.json({ ok: true, mode: 'mysql' });
});

app.get('/api/users/:email', async (req, res) => {
  try {
    const email = String(req.params.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });
    const user = await findUserByEmail(email);
    return res.json(user || null);
  } catch (error) {
    return res.status(500).json({ error: 'user_lookup_failed', detail: String(error?.message || error) });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });
    const saved = await upsertUser({ ...body, email });
    return res.json(saved);
  } catch (error) {
    return res.status(500).json({ error: 'user_upsert_failed', detail: String(error?.message || error) });
  }
});

app.post('/api/logins', async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });
    await createLoginEvent({
      email,
      method: body.method || 'password',
      success: body.success !== false,
      loggedInAt: body.loggedInAt || new Date().toISOString(),
    });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'login_record_failed', detail: String(error?.message || error) });
  }
});

app.post('/api/files/replace', async (req, res) => {
  try {
    const body = req.body || {};
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email_required' });
    await replaceUserFiles(email, Array.isArray(body.files) ? body.files : []);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'file_sync_failed', detail: String(error?.message || error) });
  }
});

function requireAdmin(req, res, next) {
  try {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing_token' });
    const secret = process.env.ADMIN_JWT_SECRET || 'dev-admin-secret';
    const payload = jwt.verify(token, secret);
    if (payload?.role === 'admin') {
      req.admin = payload;
      return next();
    }
    return res.status(403).json({ error: 'forbidden' });
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token', detail: String(err?.message || err) });
  }
}

app.post('/api/admin/register', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_and_password_required' });
    // allow initial registration only if no admin exists
    const existing = await findAdminByUsername(username);
    if (existing) return res.status(400).json({ error: 'admin_exists' });
    const hash = await bcrypt.hash(String(password), 10);
    await createAdminUser({ username, passwordHash: hash });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'admin_register_failed', detail: String(error?.message || error) });
  }
});

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username_and_password_required' });
    const admin = await findAdminByUsername(String(username).trim());
    if (!admin) return res.status(401).json({ error: 'invalid_credentials' });
    const ok = await bcrypt.compare(String(password), admin.password_hash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const secret = process.env.ADMIN_JWT_SECRET || 'dev-admin-secret';
    const token = jwt.sign({ username: admin.username, role: 'admin' }, secret, { expiresIn: '12h' });
    return res.json({ token });
  } catch (error) {
    return res.status(500).json({ error: 'admin_login_failed', detail: String(error?.message || error) });
  }
});

app.get('/api/insights', requireAdmin, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 200);
    const insights = await getInsights(Number.isFinite(limit) ? limit : 200);
    return res.json(insights);
  } catch (error) {
    return res.status(500).json({ error: 'insights_failed', detail: String(error?.message || error) });
  }
});

// Device registration - returns device token
app.post('/api/devices/register', async (req, res) => {
  try {
    const { deviceId, userEmail, name } = req.body || {};
    if (!deviceId) return res.status(400).json({ error: 'device_id_required' });
    // generate token
    const { randomBytes } = await import('node:crypto');
    const token = randomBytes(32).toString('hex');
    const saved = await registerDevice({ deviceId: String(deviceId), userEmail: userEmail ? String(userEmail).trim().toLowerCase() : null, name: name ? String(name) : null, token });
    return res.json({ device: { deviceId: saved.device_id, token: saved.token } });
  } catch (error) {
    console.error('device_register_failed', error);
    return res.status(500).json({ error: 'device_register_failed', detail: String(error?.message || error), stack: String(error?.stack || '') });
  }
});

// Simple device auth helper
async function requireDeviceToken(req, res, next) {
  try {
    const token = String(req.headers['x-device-token'] || req.body?.token || '');
    if (!token) return res.status(401).json({ error: 'missing_device_token' });
    const device = await findDeviceByToken(token);
    if (!device) return res.status(401).json({ error: 'invalid_device_token' });
    req.device = device;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'device_auth_failed', detail: String(err?.message || err) });
  }
}

// Commit local changes from device (simple schema)
app.post('/api/sync/commit', requireDeviceToken, async (req, res) => {
  try {
    const body = req.body || {};
    const changes = Array.isArray(body.changes) ? body.changes : [];
    const now = new Date().toISOString();
    // Process simple file changes
    for (const ch of changes) {
      if (ch.type === 'file') {
        const email = String(ch.email || req.device.user_email || '').trim().toLowerCase();
        if (!email) continue;
        if (ch.action === 'add' && ch.file) {
          // insert file record
          await replaceUserFiles(email, Array.isArray(ch.file) ? ch.file : [ch.file]);
        } else if (ch.action === 'delete' && ch.file) {
          // mark file as deleted by dataId or name
          const dataId = ch.file.dataId || null;
          const fileName = ch.file.name || null;
          if (dataId) await pool.query('UPDATE file_records SET deleted = 1, deleted_at = ? WHERE data_id = ? AND user_email = ?', [now, dataId, email]);
          else if (fileName) await pool.query('UPDATE file_records SET deleted = 1, deleted_at = ? WHERE file_name = ? AND user_email = ?', [now, fileName, email]);
        }
      }
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'sync_commit_failed', detail: String(error?.message || error) });
  }
});

// Return server changes since timestamp
app.get('/api/sync/changes', requireDeviceToken, async (req, res) => {
  try {
    const since = String(req.query.since || new Date(0).toISOString());
    const limit = Number(req.query.limit || 200);
    const changes = await getChangesSince(since, limit);
    return res.json(changes);
  } catch (error) {
    return res.status(500).json({ error: 'sync_changes_failed', detail: String(error?.message || error) });
  }
});

async function start() {
  try {
    await initMySqlSchema();
    app.listen(port, () => {
      console.log(`CyberVault MySQL API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize MySQL schema:', error);
    process.exit(1);
  }
}

start();
