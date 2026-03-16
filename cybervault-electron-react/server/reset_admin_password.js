import bcrypt from 'bcrypt';
import { pool } from './mysql.js';

async function reset(username, password) {
  if (!username || !password) {
    console.error('Usage: node server/reset_admin_password.js <username> <newPassword>');
    process.exit(2);
  }
  try {
    const hash = await bcrypt.hash(String(password), 10);
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');
    const [rows] = await pool.query('SELECT id FROM admin_users WHERE username = ? LIMIT 1', [username]);
    if (!rows || rows.length === 0) {
      console.log('No existing admin with that username. Inserting new admin.');
      await pool.query('INSERT INTO admin_users (username, password_hash, created_at) VALUES (?, ?, ?)', [username, hash, now]);
      console.log('Admin created.');
    } else {
      await pool.query('UPDATE admin_users SET password_hash = ? WHERE username = ?', [hash, username]);
      console.log('Admin password updated.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Failed to reset admin password:', err);
    process.exit(1);
  }
}

const [,, username, password] = process.argv;
reset(username, password);
