import path from 'path';
import fs from 'fs/promises';
import sqlite3 from 'sqlite3';

let db = null;

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function openDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(filePath, (err) => {
      if (err) reject(err);
      else resolve(instance);
    });
  });
}

function safeJsonParse(value, fallback = null) {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeUserRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    salt: row.salt,
    neuralPin: row.neural_pin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    faceDescriptor: safeJsonParse(row.face_descriptor, null),
    irisTemplate: safeJsonParse(row.iris_template, null),
    fingerprintEnabled: Boolean(row.fingerprint_enabled),
  };
}

export async function initCyberVaultDb(userDataPath) {
  if (db) return;
  await fs.mkdir(userDataPath, { recursive: true });
  const dbPath = path.join(userDataPath, 'cybervault.db');
  db = await openDatabase(dbPath);

  await run('PRAGMA journal_mode = WAL');
  await run('PRAGMA foreign_keys = ON');

  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      neural_pin TEXT,
      face_descriptor TEXT,
      iris_template TEXT,
      fingerprint_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS login_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      login_method TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      logged_in_at TEXT NOT NULL,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS file_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      data_id TEXT,
      file_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      checksum TEXT,
      stored_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT NULL,
      deleted_by TEXT NULL,
      FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    )
  `);

  await run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await run('CREATE INDEX IF NOT EXISTS idx_login_events_user_time ON login_events(user_email, logged_in_at DESC)');
  await run('CREATE INDEX IF NOT EXISTS idx_file_records_user ON file_records(user_email)');
}

export const UserModel = {
  async findByEmail(email) {
    const row = await get('SELECT * FROM users WHERE email = ?', [email]);
    return normalizeUserRow(row);
  },

  async upsert(user) {
    const now = new Date().toISOString();
    await run(
      `
      INSERT INTO users (
        username, email, password_hash, salt, neural_pin,
        face_descriptor, iris_template, fingerprint_enabled,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        username=excluded.username,
        password_hash=excluded.password_hash,
        salt=excluded.salt,
        neural_pin=excluded.neural_pin,
        face_descriptor=excluded.face_descriptor,
        iris_template=excluded.iris_template,
        fingerprint_enabled=excluded.fingerprint_enabled,
        updated_at=excluded.updated_at
      `,
      [
        user.username || '',
        user.email,
        user.passwordHash || '',
        user.salt || '',
        user.neuralPin || '',
        JSON.stringify(user.faceDescriptor ?? null),
        JSON.stringify(user.irisTemplate ?? null),
        user.fingerprintEnabled ? 1 : 0,
        user.createdAt || now,
        now,
      ],
    );

    return this.findByEmail(user.email);
  },

  async listWithStats(limit = 200) {
    const rows = await all(
      `
      SELECT
        u.id,
        u.username,
        u.email,
        u.created_at,
        MAX(le.logged_in_at) AS last_login,
        COUNT(DISTINCT fr.id) AS file_count
      FROM users u
      LEFT JOIN login_events le ON le.user_email = u.email
      LEFT JOIN file_records fr ON fr.user_email = u.email
      GROUP BY u.id, u.username, u.email, u.created_at
      ORDER BY u.created_at DESC
      LIMIT ?
      `,
      [limit],
    );

    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: row.created_at,
      lastLogin: row.last_login || null,
      fileCount: Number(row.file_count || 0),
    }));
  },
};

export const LoginEventModel = {
  async create({ email, method = 'password', success = true, loggedInAt = new Date().toISOString() }) {
    await run(
      'INSERT INTO login_events (user_email, login_method, success, logged_in_at) VALUES (?, ?, ?, ?)',
      [email, method, success ? 1 : 0, loggedInAt],
    );
  },

  async listRecent(limit = 200) {
    const rows = await all(
      `
      SELECT id, user_email, login_method, success, logged_in_at
      FROM login_events
      ORDER BY logged_in_at DESC
      LIMIT ?
      `,
      [limit],
    );

    return rows.map((row) => ({
      id: row.id,
      userEmail: row.user_email,
      loginMethod: row.login_method,
      success: Boolean(row.success),
      loggedInAt: row.logged_in_at,
    }));
  },
};

export const FileOwnershipModel = {
  async replaceForUser(email, files = []) {
    const now = new Date().toISOString();
    await run('BEGIN TRANSACTION');
    try {
      // mark existing records as deleted (tombstone)
      await run('UPDATE file_records SET deleted = 1, deleted_at = ? WHERE user_email = ? AND deleted = 0', [now, email]);
      for (const file of files) {
        if (!file || !file.name) continue;
        await run(
          `
          INSERT INTO file_records (
            user_email, data_id, file_name, file_type, file_size, checksum, stored_at, updated_at, deleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
          `,
          [
            email,
            file.dataId || null,
            file.name,
            file.type || null,
            Number.isFinite(file.size) ? file.size : null,
            file.checksum || null,
            file.createdAt || now,
            now,
          ],
        );
      }
      await run('COMMIT');
    } catch (error) {
      await run('ROLLBACK');
      throw error;
    }
  },

  async listRecent(limit = 200) {
    const rows = await all(
      `
      SELECT id, user_email, data_id, file_name, file_type, file_size, checksum, stored_at, updated_at
      FROM file_records
      ORDER BY updated_at DESC
      LIMIT ?
      `,
      [limit],
    );

    return rows.map((row) => ({
      id: row.id,
      userEmail: row.user_email,
      dataId: row.data_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      checksum: row.checksum,
      storedAt: row.stored_at,
      updatedAt: row.updated_at,
    }));
  },
};

export async function getDbInsights() {
  const [users, logins, files] = await Promise.all([
    UserModel.listWithStats(200),
    LoginEventModel.listRecent(200),
    FileOwnershipModel.listRecent(200),
  ]);
  return { users, logins, files };
}
