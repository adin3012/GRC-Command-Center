const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'grc_database.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = `
-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Policies
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
  review_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reports
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- VAPT Reports
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
  next_review_date DATETIME,
  assessor TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Certificates
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Risks
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
  review_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users (for auth)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- Audit Logs
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activities (for activity feed)
CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  user_email TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_vapt_status ON vapt_reports(status);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risks(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
`;

db.exec(schema);

module.exports = db;
