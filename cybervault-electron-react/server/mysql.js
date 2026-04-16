import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'cybervault',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function safeJsonParse(value, fallback = null) {
  if (!value || typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function formatDateTime(value) {
  if (!value) return null;
  // accept Date or ISO string; convert to MySQL DATETIME(3) format: 'YYYY-MM-DD HH:MM:SS.sss'
  const s = (value instanceof Date) ? value.toISOString() : String(value);
  return s.replace('T', ' ').replace('Z', '');
}

function mapUserRow(row) {
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

export async function initMySqlSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      neural_pin VARCHAR(20) NULL,
      face_descriptor LONGTEXT NULL,
      iris_template LONGTEXT NULL,
      fingerprint_enabled TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      INDEX idx_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS login_events (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_email VARCHAR(255) NOT NULL,
      login_method VARCHAR(64) NOT NULL,
      success TINYINT(1) NOT NULL DEFAULT 1,
      logged_in_at DATETIME(3) NOT NULL,
      INDEX idx_login_user_time (user_email, logged_in_at DESC),
      CONSTRAINT fk_login_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_records (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_email VARCHAR(255) NOT NULL,
      data_id VARCHAR(255) NULL,
      file_name TEXT NOT NULL,
      file_type VARCHAR(255) NULL,
      file_size BIGINT NULL,
      checksum TEXT NULL,
      stored_at DATETIME(3) NOT NULL,
      updated_at DATETIME(3) NOT NULL,
      deleted TINYINT(1) NOT NULL DEFAULT 0,
      deleted_at DATETIME(3) NULL,
      deleted_by VARCHAR(255) NULL,
      INDEX idx_file_user (user_email),
      CONSTRAINT fk_file_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Ensure tombstone columns exist (safe alter - ignore failures)
  try {
    await pool.query("ALTER TABLE file_records ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE file_records ADD COLUMN deleted_at DATETIME(3) NULL");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE file_records ADD COLUMN deleted_by VARCHAR(255) NULL");
  } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        device_id VARCHAR(255) NOT NULL UNIQUE,
        user_email VARCHAR(255) NULL,
        name VARCHAR(255) NULL,
        token VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL,
        INDEX idx_devices_user (user_email),
        CONSTRAINT fk_device_user_email FOREIGN KEY (user_email) REFERENCES users(email) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

export async function findUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
  return mapUserRow(rows[0]);
}

export async function upsertUser(user) {
  const now = formatDateTime(new Date().toISOString());
  const createdAt = user.createdAt ? formatDateTime(user.createdAt) : now;
  await pool.query(
    `
    INSERT INTO users (
      username, email, password_hash, salt, neural_pin,
      face_descriptor, iris_template, fingerprint_enabled,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      username = VALUES(username),
      password_hash = VALUES(password_hash),
      salt = VALUES(salt),
      neural_pin = VALUES(neural_pin),
      face_descriptor = VALUES(face_descriptor),
      iris_template = VALUES(iris_template),
      fingerprint_enabled = VALUES(fingerprint_enabled),
      updated_at = VALUES(updated_at)
    `,
    [
      user.username || '',
      user.email,
      user.passwordHash || '',
      user.salt || '',
      user.neuralPin || null,
      JSON.stringify(user.faceDescriptor ?? null),
      JSON.stringify(user.irisTemplate ?? null),
      user.fingerprintEnabled ? 1 : 0,
      createdAt,
      now,
    ],
  );

  return findUserByEmail(user.email);
}

export async function createLoginEvent({ email, method = 'password', success = true, loggedInAt = null }) {
  const loggedAt = formatDateTime(loggedInAt || new Date().toISOString());
  await pool.query(
    'INSERT INTO login_events (user_email, login_method, success, logged_in_at) VALUES (?, ?, ?, ?)',
    [email, method, success ? 1 : 0, loggedAt],
  );
}

export async function replaceUserFiles(email, files = []) {
  const conn = await pool.getConnection();
  const now = formatDateTime(new Date().toISOString());
  try {
    await conn.beginTransaction();
    // soft-delete existing file records for this user (keep tombstones)
    await conn.query('UPDATE file_records SET deleted = 1, deleted_at = ? WHERE user_email = ? AND deleted = 0', [now, email]);

    for (const file of files) {
      if (!file || !file.name) continue;
      await conn.query(
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
          formatDateTime(file.createdAt || now),
          now,
        ],
      );
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function getInsights(limit = 200) {
  const [usersRows] = await pool.query(
    `
    SELECT
      u.id,
      u.username,
      u.email,
      u.created_at,
      MAX(le.logged_in_at) AS last_login
    FROM users u
    LEFT JOIN login_events le ON le.user_email = u.email
    GROUP BY u.id, u.username, u.email, u.created_at
    ORDER BY u.created_at DESC
    LIMIT ?
    `,
    [limit],
  );

  // fetch file counts per user separately to avoid aggregation edge-cases
  const [countsRows] = await pool.query(
    `SELECT user_email, COUNT(*) AS cnt FROM file_records WHERE deleted = 0 GROUP BY user_email`,
  );
  const countsMap = new Map((countsRows || []).map((r) => [r.user_email, Number(r.cnt || 0)]));

  const [loginRows] = await pool.query(
    `
    SELECT id, user_email, login_method, success, logged_in_at
    FROM login_events
    ORDER BY logged_in_at DESC
    LIMIT ?
    `,
    [limit],
  );

  const [fileRows] = await pool.query(
    `
    SELECT id, user_email, data_id, file_name, file_type, file_size, checksum, stored_at, updated_at
    FROM file_records
    WHERE deleted = 0
    ORDER BY stored_at DESC
    LIMIT ?
    `,
    [limit],
  );

  return {
    users: usersRows.map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: row.created_at,
      lastLogin: row.last_login,
      fileCount: Number(countsMap.get(row.email) || 0),
    })),
    logins: loginRows.map((row) => ({
      id: row.id,
      userEmail: row.user_email,
      loginMethod: row.login_method,
      success: Boolean(row.success),
      loggedInAt: row.logged_in_at,
    })),
    files: fileRows.map((row) => ({
      id: row.id,
      userEmail: row.user_email,
      dataId: row.data_id,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      checksum: row.checksum,
      storedAt: row.stored_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function deleteUserById(userId) {
  const numericId = Number(userId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return { affectedRows: 0 };
  }
  const [result] = await pool.query('DELETE FROM users WHERE id = ?', [numericId]);
  return { affectedRows: Number(result?.affectedRows || 0) };
}

export async function findAdminByUsername(username) {
  const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ? LIMIT 1', [username]);
  return rows[0] || null;
}

export async function createAdminUser({ username, passwordHash }) {
  const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
  await pool.query(
    `INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)`,
    [username, passwordHash, now],
  );
  return findAdminByUsername(username);
}

export async function registerDevice({ deviceId, userEmail = null, name = null, token }) {
  const now = formatDateTime(new Date().toISOString());
  await pool.query(
    `INSERT INTO devices (device_id, user_email, name, token, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_email = VALUES(user_email), name = VALUES(name), token = VALUES(token)`,
    [deviceId, userEmail, name, token, now],
  );
  const [rows] = await pool.query('SELECT * FROM devices WHERE device_id = ? LIMIT 1', [deviceId]);
  return rows[0] || null;
}

export async function findDeviceByToken(token) {
  const [rows] = await pool.query('SELECT * FROM devices WHERE token = ? LIMIT 1', [token]);
  return rows[0] || null;
}

export async function getChangesSince(sinceISO, limit = 200) {
  const since = formatDateTime(sinceISO || new Date(0).toISOString());
  const [usersRows] = await pool.query(
    `SELECT id, username, email, created_at, updated_at FROM users WHERE updated_at > ? ORDER BY updated_at DESC LIMIT ?`,
    [since, limit],
  );

  const [loginRows] = await pool.query(
    `SELECT id, user_email, login_method, success, logged_in_at FROM login_events WHERE logged_in_at > ? ORDER BY logged_in_at DESC LIMIT ?`,
    [since, limit],
  );

  const [fileRows] = await pool.query(
    `SELECT id, user_email, data_id, file_name, file_type, file_size, checksum, stored_at, updated_at, deleted, deleted_at FROM file_records WHERE GREATEST(IFNULL(updated_at,'1970-01-01'), IFNULL(deleted_at,'1970-01-01')) > ? ORDER BY GREATEST(IFNULL(updated_at,'1970-01-01'), IFNULL(deleted_at,'1970-01-01')) DESC LIMIT ?`,
    [since, limit],
  );

  return {
    users: usersRows,
    logins: loginRows,
    files: fileRows,
  };
}

export { pool };
