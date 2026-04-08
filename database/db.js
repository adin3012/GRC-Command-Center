const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'grc_database.sqlite');
let db = null;

async function getDb() {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (err) {
    db = new SQL.Database();
  }
  
  initSchema();
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo_url TEXT,
      website TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      icon TEXT DEFAULT 'description',
      pdf_url TEXT,
      version TEXT,
      owner TEXT,
      review_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      status TEXT DEFAULT 'In Progress',
      date TEXT,
      icon TEXT DEFAULT 'assessment',
      pdf_url TEXT,
      auditor TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS vapt_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      report_id TEXT,
      status TEXT DEFAULT 'In Progress',
      date TEXT,
      pdf_url TEXT,
      findings_critical INTEGER DEFAULT 0,
      findings_high INTEGER DEFAULT 0,
      findings_medium INTEGER DEFAULT 0,
      findings_low INTEGER DEFAULT 0,
      remediation_status TEXT,
      next_review_date TEXT,
      assessor TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER DEFAULT 1,
      name TEXT NOT NULL,
      full_name TEXT,
      icon TEXT DEFAULT 'verified',
      color TEXT DEFAULT 'green',
      status TEXT DEFAULT 'Active',
      issued_date TEXT,
      expiry_date TEXT,
      cert_body TEXT,
      pdf_url TEXT,
      scope TEXT,
      certificate_number TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS risks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER DEFAULT 1,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT,
      severity TEXT DEFAULT 'Medium',
      likelihood TEXT DEFAULT 'Medium',
      impact TEXT DEFAULT 'Medium',
      owner TEXT,
      status TEXT DEFAULT 'Open',
      mitigation_plan TEXT,
      review_date TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      entity_name TEXT,
      changes TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      user_email TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  save();
}

function save() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function run(sql, params = []) {
  db.run(sql, params);
  save();
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  const results = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function lastId() {
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] || 0;
}

module.exports = { getDb, run, get, all, lastId, save };
