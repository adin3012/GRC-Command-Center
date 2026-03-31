/**
 * GRC Ledger — Local Backend Server
 * ──────────────────────────────────
 * Run:  node server.js
 * Then open:  http://localhost:3000
 *
 * What this does:
 *  - Serves your dashboard at localhost:3000
 *  - Saves policies, reports, VAPT reports, and certificates to data.json
 *  - Handles PDF uploads (stored in /uploads folder)
 *  - All data persists across restarts
 */

const http     = require('http');
const fs       = require('fs');
const path     = require('path');
const url      = require('url');
const crypto   = require('crypto');

// ── Admin credentials
const ADMIN_USERNAME = 'adin.saikia@gmail.com';
const ADMIN_PASSWORD = 'adin@vc1234';

// ── In-memory sessions (cleared on server restart)
const sessions = new Map();

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 }); // 8 hours
  return token;
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';
  const match   = cookies.match(/grc_session=([a-f0-9]{64})/);
  return match ? match[1] : null;
}

function isAdmin(req) {
  const token = getSessionToken(req);
  if (!token) return false;
  const sess  = sessions.get(token);
  if (!sess || sess.expires < Date.now()) { sessions.delete(token); return false; }
  return true;
}

const PORT      = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const LOGO_DIR   = path.join(__dirname, 'logo');

// ── Ensure uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// ── Seed data.json if it doesn't exist yet
if (!fs.existsSync(DATA_FILE)) {
  const seed = {
    policies: [
      { id: 1, name: 'IT Security Policy',       status: 'Published',    category: 'Security',   updated: 'Oct 12, 2023', desc: 'Defines organizational controls for information systems, access management, and incident response.', icon: 'security'     },
      { id: 2, name: 'Data Privacy Policy',      status: 'Under Review', category: 'Privacy',    updated: 'Aug 20, 2023', desc: 'Governs collection, storage, and processing of personal data across all platforms.',               icon: 'privacy_tip'  },
      { id: 3, name: 'Employee Code of Conduct', status: 'Draft',        category: 'HR',         updated: 'In progress',  desc: 'Sets behavioral standards and ethical guidelines for all employees and contractors.',             icon: 'gavel'        },
    ],
    reports: [
      { id: 1, title: 'Q3 Compliance Audit',   subtitle: 'Verified by External Auditor',  status: 'Verified',     date: 'Oct 2023', icon: 'verified',  desc: 'Comprehensive review of all operational controls and risk assessments for Q3 2023.' },
      { id: 2, title: 'GDPR Readiness Report', subtitle: 'Privacy Impact Assessment',     status: 'In Progress',  date: 'Sep 2023', icon: 'language',  desc: 'Evaluation of data processing activities and GDPR compliance readiness across EU operations.' },
      { id: 3, title: 'SOC 2 Type II Update',  subtitle: 'Annual Security Certification', status: 'Complete',     date: 'Aug 2023', icon: 'lock',      desc: 'Annual audit of security controls, availability, and confidentiality for cloud services.' },
    ],
    vapt: [
      { id: 1, title: 'Web Application VAPT',        subtitle: 'Production — app.grcledger.com',    date: 'October 2023',   reportId: 'VAPT-WEB-2023-001', pdfFile: 'VAPT_WebApp_2023.pdf',   status: 'Complete', findings: { critical:1, high:2, medium:2, low:2 }, desc: '7 vulnerabilities including SQL Injection (Critical) and JWT algorithm confusion.' },
      { id: 2, title: 'Network Infrastructure VAPT', subtitle: 'Internal network — 10.0.0.0/16',   date: 'September 2023', reportId: 'VAPT-NET-2023-002', pdfFile: 'VAPT_Network_2023.pdf', status: 'Complete', findings: { critical:1, high:1, medium:2, low:1 }, desc: '5 vulnerabilities including EternalBlue on DB server (Critical).' },
    ],
    certificates: [
      { id: 1, name: 'ISO 27001',    status: 'Active',    fullName: 'Information Security Management',      icon: 'verified',         color: 'green' },
      { id: 2, name: 'ISO 27701',    status: 'Certified', fullName: 'Privacy Information Management',       icon: 'shield',           color: 'green' },
      { id: 3, name: 'SOC 2 Type II',status: 'Active',    fullName: 'Security & Availability Trust',        icon: 'lock',             color: 'green' },
      { id: 4, name: 'GDPR',         status: 'Certified', fullName: 'General Data Protection Regulation',   icon: 'language',         color: 'green' },
      { id: 5, name: 'HIPAA',        status: 'Active',    fullName: 'Health Insurance Portability Act',     icon: 'medical_services', color: 'green' },
      { id: 6, name: 'CCPA',         status: 'Compliant', fullName: 'California Consumer Privacy Act',      icon: 'gavel',            color: 'gray'  },
      { id: 7, name: 'DPDPA',        status: 'Compliant', fullName: 'Digital Personal Data Protection Act', icon: 'fingerprint',      color: 'gray'  },
    ],
    risks: [
      { id: 1, risk: 'Data Breach Exposure',      category: 'Privacy',    severity: 'High',   owner: 'Security Team', riskStatus: 'Mitigating' },
      { id: 2, risk: 'Third-Party Vendor Risk',   category: 'Operations', severity: 'Medium', owner: 'Risk Officer',  riskStatus: 'Monitored'  },
      { id: 3, risk: 'Regulatory Non-Compliance', category: 'Legal',      severity: 'Medium', owner: 'Legal Team',    riskStatus: 'Resolved'   },
    ],
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  console.log('✅ Created data.json with starter data');
}

// ── Read / write helpers
function readData()       { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeData(data)  { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function nextId(arr)      { return arr.length ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

// ── MIME types
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

// ── Parse multipart form (for PDF uploads)
function parseMultipart(body, boundary) {
  const parts = {};
  const boundaryBuf = Buffer.from('--' + boundary);
  let start = body.indexOf(boundaryBuf) + boundaryBuf.length + 2;
  while (start < body.length) {
    const end = body.indexOf(boundaryBuf, start);
    if (end === -1) break;
    const part = body.slice(start, end - 2);
    const headerEnd = part.indexOf('\r\n\r\n');
    const headers = part.slice(0, headerEnd).toString();
    const content = part.slice(headerEnd + 4);
    const nameMatch = headers.match(/name="([^"]+)"/);
    const fileMatch = headers.match(/filename="([^"]+)"/);
    if (nameMatch) {
      parts[nameMatch[1]] = fileMatch
        ? { filename: fileMatch[1], data: content }
        : content.toString().trim();
    }
    start = end + boundaryBuf.length + 2;
  }
  return parts;
}

// ── Collect request body
function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ── JSON response helper
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// ── Server-Sent Events broadcast
const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch (_) { sseClients.delete(client); }
  }
}

// ── Main server
const server = http.createServer(async (req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method   = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // ── Auth routes ─────────────────────────────────────────────────

  // GET /api/me
  if (pathname === '/api/me' && method === 'GET') {
    return json(res, 200, { isAdmin: isAdmin(req) });
  }

  // POST /api/login
  if (pathname === '/api/login' && method === 'POST') {
    const body = await collectBody(req);
    const { username, password } = JSON.parse(body.toString());
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = createSession();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': `grc_session=${token}; HttpOnly; Path=/; Max-Age=${8 * 3600}`,
        'Access-Control-Allow-Origin': '*',
      });
      return res.end(JSON.stringify({ ok: true }));
    }
    return json(res, 401, { error: 'Invalid credentials' });
  }

  // POST /api/logout
  if (pathname === '/api/logout' && method === 'POST') {
    const token = getSessionToken(req);
    if (token) sessions.delete(token);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'grc_session=; HttpOnly; Path=/; Max-Age=0',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  // ── API routes ──────────────────────────────────────────────────

  // GET /api/events  — SSE stream for real-time updates
  if (pathname === '/api/events' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // GET /api/data  — return everything
  if (pathname === '/api/data' && method === 'GET') {
    return json(res, 200, readData());
  }

  // Generic CRUD: /api/:collection
  const crudMatch = pathname.match(/^\/api\/(policies|reports|vapt|certificates|risks)(?:\/(\d+))?$/);
  if (crudMatch) {
    const collection = crudMatch[1];
    const id = crudMatch[2] ? parseInt(crudMatch[2]) : null;
    const data = readData();

    if (method === 'GET') {
      return json(res, 200, id ? data[collection].find(x => x.id === id) || {} : data[collection]);
    }

    // ── All write operations require admin login
    if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized — please log in as admin' });

    if (method === 'POST') {
      const body = await collectBody(req);
      const item = JSON.parse(body.toString());
      item.id = nextId(data[collection]);
      data[collection].unshift(item);
      writeData(data);
      broadcast('change', { action: 'added', collection, item });
      return json(res, 201, item);
    }

    if (method === 'PUT' && id) {
      const body = await collectBody(req);
      const updates = JSON.parse(body.toString());
      const idx = data[collection].findIndex(x => x.id === id);
      if (idx === -1) return json(res, 404, { error: 'Not found' });
      data[collection][idx] = { ...data[collection][idx], ...updates };
      writeData(data);
      broadcast('change', { action: 'updated', collection, item: data[collection][idx] });
      return json(res, 200, data[collection][idx]);
    }

    if (method === 'DELETE' && id) {
      const before = data[collection].length;
      data[collection] = data[collection].filter(x => x.id !== id);
      writeData(data);
      broadcast('change', { action: 'deleted', collection, id });
      return json(res, 200, { deleted: data[collection].length < before });
    }
  }

  // PDF upload:  POST /api/upload  (admin only)
  if (pathname === '/api/upload' && method === 'POST') {
    if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });
    const body = await collectBody(req);
    const ct   = req.headers['content-type'] || '';
    const bm   = ct.match(/boundary=(.+)/);
    if (!bm) return json(res, 400, { error: 'No boundary' });
    const parts = parseMultipart(body, bm[1]);
    if (!parts.file || !parts.file.filename) return json(res, 400, { error: 'No file' });
    const allowedFolders = ['policies','reports','vapt','certificates','SAST'];
    const folder = parsed.query && parsed.query.folder && allowedFolders.includes(parsed.query.folder) ? parsed.query.folder : '';
    const targetDir = folder ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const filename = parts.file.filename.replace(/[^a-zA-Z0-9._\- ()&]/g, '_');
    fs.writeFileSync(path.join(targetDir, filename), parts.file.data);
    const relativePath = folder ? `${folder}/${filename}` : filename;
    return json(res, 200, { filename, relativePath, url: `/uploads/${relativePath}` });
  }

  // Serve logo files
  if (pathname.startsWith('/logo/')) {
    const filePath = path.resolve(LOGO_DIR, decodeURIComponent(pathname.slice('/logo/'.length)));
    if (!filePath.startsWith(path.resolve(LOGO_DIR))) return json(res, 403, { error: 'Forbidden' });
    if (fs.existsSync(filePath)) {
      const ext  = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'image/png';
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(filePath).pipe(res);
    }
    return json(res, 404, { error: 'File not found' });
  }

  // Serve uploaded PDFs (supports subfolders: /uploads/reports/, /uploads/vapt/, etc.)
  if (pathname.startsWith('/uploads/')) {
    const decoded  = decodeURIComponent(pathname.slice('/uploads/'.length));
    const filePath = path.resolve(UPLOAD_DIR, decoded);
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return json(res, 403, { error: 'Forbidden' });
    if (fs.existsSync(filePath)) {
      const ext  = path.extname(filePath).toLowerCase();
      const mime = ext === '.pdf' ? 'application/pdf' : (MIME[ext] || 'application/octet-stream');
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(filePath).pipe(res);
    }
    return json(res, 404, { error: 'File not found' });
  }

  // ── Static file serving ─────────────────────────────────────────
  let filePath = pathname === '/' ? '/grc-final.html' : pathname;
  const fullPath = path.join(__dirname, filePath);

  // Also try serving PDFs from same directory (for existing VAPT files)
  if (fs.existsSync(fullPath)) {
    const ext  = path.extname(fullPath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    return fs.createReadStream(fullPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       GRC Ledger — Server Running        ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Open:  http://localhost:${PORT}             ║`);
  console.log('║  Data:  data.json (auto-created)         ║');
  console.log('║  PDFs:  /uploads folder                  ║');
  console.log('║  Stop:  Ctrl + C                         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
});
