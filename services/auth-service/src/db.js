const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'auth.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('cliente', 'cocina', 'cajero', 'admin')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

const queries = {
  findByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  findById: db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?'),
  insertUser: db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  listUsers: db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'),
  listUsersByRole: db.prepare('SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY created_at DESC')
};

module.exports = {
  db,
  findUserByEmail(email) {
    return queries.findByEmail.get(email.toLowerCase().trim());
  },
  findUserById(id) {
    return queries.findById.get(id);
  },
  createUser({ id, name, email, password_hash, role }) {
    const createdAt = new Date().toISOString();
    queries.insertUser.run(id, name, email.toLowerCase().trim(), password_hash, role, createdAt);
    return { id, name, email: email.toLowerCase().trim(), role, created_at: createdAt };
  },
  listUsers(role) {
    if (role) {
      return queries.listUsersByRole.all(role);
    }
    return queries.listUsers.all();
  }
};
