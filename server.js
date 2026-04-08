/**
 * GRC Command Center - Enterprise Backend Server
 * Built with SQL.js for production-ready data persistence
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sso = require('./sso/azure');

const PORT = process.env.PORT || 3002;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const LOGO_DIR = path.join(__dirname, 'logo');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const sessions = new Map();
let db = null;
let models = null;

function createSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { 
    user, 
    expires: Date.now() + 8 * 60 * 60 * 1000,
    lastActivity: Date.now()
  });
  return token;
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/grc_session=([a-f0-9]{64})/);
  return match ? match[1] : null;
}

function getSession(req) {
  const token = getSessionToken(req);
  if (!token) return null;
  const sess = sessions.get(token);
  if (!sess || sess.expires < Date.now()) {
    if (sess) sessions.delete(token);
    return null;
  }
  sess.lastActivity = Date.now();
  return sess;
}

function isAdmin(req) {
  const sess = getSession(req);
  return sess?.user?.role === 'admin';
}

function json(res, status, data) {
  res.writeHead(status, { 
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

const sseClients = new Set();

function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try { client.write(msg); } catch (_) { sseClients.delete(client); }
  }
}

function collectBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

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

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.pdf': 'application/pdf',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // Auth routes
  if (pathname === '/api/me' && method === 'GET') {
    const sess = getSession(req);
    return json(res, 200, { 
      isAdmin: isAdmin(req),
      user: sess?.user ? { email: sess.user.email, name: sess.user.name, role: sess.user.role } : null
    });
  }

  if (pathname === '/api/login' && method === 'POST') {
    try {
      const body = await collectBody(req);
      const { email, password } = JSON.parse(body.toString());
      const user = models.users.getByEmail(email);
      
      if (user && bcrypt.compareSync(password, user.password_hash)) {
        const token = createSession(user);
        models.users.updateLastLogin(user.id);
        models.logActivity('login', 'User Login', `${user.email} logged in successfully.`, 'user', user.id, user.email);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `grc_session=${token}; HttpOnly; Path=/; Max-Age=${8 * 3600}`,
          'Access-Control-Allow-Origin': '*',
        });
        return res.end(JSON.stringify({ ok: true, user: { email: user.email, name: user.name, role: user.role } }));
      }
      return json(res, 401, { error: 'Invalid credentials' });
    } catch (err) {
      return json(res, 400, { error: 'Invalid request' });
    }
  }

  if (pathname === '/api/logout' && method === 'POST') {
    const sess = getSession(req);
    if (sess) {
      models.logActivity('logout', 'User Logout', `${sess.user.email} logged out.`, 'user', sess.user.id, sess.user.email);
      sessions.delete(getSessionToken(req));
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'grc_session=; HttpOnly; Path=/; Max-Age=0',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  if (pathname === '/api/sso/azure/url' && method === 'GET') {
    const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    const redirectUri = `${baseUrl}/api/sso/azure/callback`;
    const authUrl = sso.generateAzureAuthUrl(redirectUri);
    return json(res, 200, { authUrl });
  }

  if (pathname === '/api/sso/azure/callback' && method === 'GET') {
    try {
      const baseUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      const redirectUri = `${baseUrl}/api/sso/azure/callback`;
      const { code, state } = parsedUrl.query;

      if (!code) {
        return json(res, 400, { error: 'Authorization code missing' });
      }

      const tokenResponse = await sso.getTokenFromCode(code, redirectUri);
      const userProfile = await sso.getUserProfile(tokenResponse.accessToken);

      let user = models.users.getByEmail(userProfile.mail || userProfile.userPrincipalName);
      if (!user) {
        user = models.users.create({
          email: userProfile.mail || userProfile.userPrincipalName,
          password: crypto.randomBytes(32).toString('hex'),
          name: userProfile.displayName,
          role: 'user'
        });
      }

      const token = createSession(user);
      models.users.updateLastLogin(user.id);
      models.logActivity('sso_login', 'SSO Login', `${user.email} logged in via Azure AD.`, 'user', user.id, user.email);

      res.writeHead(302, {
        'Location': '/?sso=success',
        'Set-Cookie': `grc_session=${token}; HttpOnly; Path=/; Max-Age=${8 * 3600}`
      });
      return res.end();
    } catch (err) {
      console.error('SSO error:', err);
      return json(res, 500, { error: 'SSO authentication failed' });
    }
  }

  // SSE events
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

  // Dashboard stats
  if (pathname === '/api/dashboard' && method === 'GET') {
    const stats = models.dashboard.getStats();
    const recentActivities = models.activities.getRecent(20);
    return json(res, 200, { stats, activities: recentActivities });
  }

  // Get all data
  if (pathname === '/api/data' && method === 'GET') {
    const sess = getSession(req);
    const data = {
      policies: models.policies.getAll(),
      reports: models.reports.getAll(),
      vapt: models.vaptReports.getAll(),
      certificates: models.certificates.getAll(),
      risks: models.risks.getAll()
    };
    if (sess?.user?.role === 'admin') {
      data.activities = models.activities.getRecent(50);
    }
    return json(res, 200, data);
  }

  // Audit logs (admin only)
  if (pathname === '/api/audit-logs' && method === 'GET') {
    if (!isAdmin(req)) return json(res, 403, { error: 'Admin access required' });
    const logs = models.auditLogs.getRecent(100);
    return json(res, 200, logs);
  }

  // Search API
  if (pathname === '/api/search' && method === 'GET') {
    const q = parsed.query.q || '';
    if (!q) return json(res, 200, { results: [] });
    
    const results = {
      policies: models.policies.getAll({ search: q }).slice(0, 5),
      reports: models.reports.getAll({ search: q }).slice(0, 5),
      vapt: models.vaptReports.getAll({ search: q }).slice(0, 5),
      certificates: models.certificates.getAll({ search: q }).slice(0, 5),
      risks: models.risks.getAll({ search: q }).slice(0, 5)
    };
    return json(res, 200, results);
  }

  // Generic CRUD routes
  const crudMatch = pathname.match(/^\/api\/(policies|reports|vapt|certificates|risks)(?:\/(\d+))?$/);
  if (crudMatch) {
    const collection = crudMatch[1];
    const id = crudMatch[2] ? parseInt(crudMatch[2]) : null;
    const sess = getSession(req);

    if (method === 'GET') {
      let items;
      const filters = {
        status: parsed.query.status,
        category: parsed.query.category,
        search: parsed.query.q
      };
      
      switch (collection) {
        case 'policies': items = models.policies.getAll(filters); break;
        case 'reports': items = models.reports.getAll(filters); break;
        case 'vapt': items = models.vaptReports.getAll(filters); break;
        case 'certificates': items = models.certificates.getAll(filters); break;
        case 'risks': items = models.risks.getAll(filters); break;
      }
      
      if (id) {
        let item;
        switch (collection) {
          case 'policies': item = models.policies.getById(id); break;
          case 'reports': item = models.reports.getById(id); break;
          case 'vapt': item = models.vaptReports.getById(id); break;
          case 'certificates': item = models.certificates.getById(id); break;
          case 'risks': item = models.risks.getById(id); break;
        }
        return json(res, 200, item || {});
      }
      return json(res, 200, items);
    }

    if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });

    if (method === 'POST') {
      try {
        const body = await collectBody(req);
        const data = JSON.parse(body.toString());
        let item;
        
        switch (collection) {
          case 'policies': item = models.policies.create(data); break;
          case 'reports': item = models.reports.create(data); break;
          case 'vapt': item = models.vaptReports.create(data); break;
          case 'certificates': item = models.certificates.create(data); break;
          case 'risks': item = models.risks.create(data); break;
        }
        
        broadcast('change', { action: 'added', collection, item });
        return json(res, 201, item);
      } catch (err) {
        console.error('Create error:', err);
        return json(res, 400, { error: err.message });
      }
    }

    if (method === 'PUT' && id) {
      try {
        const body = await collectBody(req);
        const data = JSON.parse(body.toString());
        let item;
        
        switch (collection) {
          case 'policies': item = models.policies.update(id, data, sess?.user?.email); break;
          case 'reports': item = models.reports.update(id, data, sess?.user?.email); break;
          case 'vapt': item = models.vaptReports.update(id, data, sess?.user?.email); break;
          case 'certificates': item = models.certificates.update(id, data, sess?.user?.email); break;
          case 'risks': item = models.risks.update(id, data, sess?.user?.email); break;
        }
        
        if (!item) return json(res, 404, { error: 'Not found' });
        
        broadcast('change', { action: 'updated', collection, item });
        return json(res, 200, item);
      } catch (err) {
        console.error('Update error:', err);
        return json(res, 400, { error: err.message });
      }
    }

    if (method === 'DELETE' && id) {
      let success;
      switch (collection) {
        case 'policies': success = models.policies.delete(id, sess?.user?.email); break;
        case 'reports': success = models.reports.delete(id, sess?.user?.email); break;
        case 'vapt': success = models.vaptReports.delete(id, sess?.user?.email); break;
        case 'certificates': success = models.certificates.delete(id, sess?.user?.email); break;
        case 'risks': success = models.risks.delete(id, sess?.user?.email); break;
      }
      
      if (!success) return json(res, 404, { error: 'Not found' });
      
      broadcast('change', { action: 'deleted', collection, id });
      return json(res, 200, { deleted: true });
    }
  }

  // File upload
  if (pathname === '/api/upload' && method === 'POST') {
    if (!isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });
    
    try {
      const body = await collectBody(req);
      const ct = req.headers['content-type'] || '';
      const bm = ct.match(/boundary=(.+)/);
      if (!bm) return json(res, 400, { error: 'No boundary' });
      
      const parts = parseMultipart(body, bm[1]);
      if (!parts.file || !parts.file.filename) return json(res, 400, { error: 'No file' });
      
      const allowedFolders = ['policies', 'reports', 'vapt', 'certificates', 'SAST'];
      const folder = parsed.query.folder && allowedFolders.includes(parsed.query.folder) ? parsed.query.folder : '';
      const targetDir = folder ? path.join(UPLOAD_DIR, folder) : UPLOAD_DIR;
      
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
      
      const filename = parts.file.filename.replace(/[^a-zA-Z0-9._\- ()&]/g, '_');
      const filePath = path.join(targetDir, filename);
      fs.writeFileSync(filePath, parts.file.data);
      
      const relativePath = folder ? `${folder}/${filename}` : filename;
      const sess = getSession(req);
      models.logActivity('upload', 'File Uploaded', `File "${filename}" was uploaded.`, 'file', null, sess?.user?.email, { folder, filename });
      
      return json(res, 200, { 
        filename, 
        relativePath, 
        url: `/uploads/${relativePath}`,
        size: parts.file.data.length
      });
    } catch (err) {
      console.error('Upload error:', err);
      return json(res, 500, { error: 'Upload failed' });
    }
  }

  // Serve files
  if (pathname.startsWith('/logo/')) {
    const filePath = path.resolve(LOGO_DIR, decodeURIComponent(pathname.slice('/logo/'.length)));
    if (!filePath.startsWith(path.resolve(LOGO_DIR))) return json(res, 403, { error: 'Forbidden' });
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'image/png' });
      return fs.createReadStream(filePath).pipe(res);
    }
    return json(res, 404, { error: 'Not found' });
  }

  if (pathname.startsWith('/uploads/')) {
    const decoded = decodeURIComponent(pathname.slice('/uploads/'.length));
    const filePath = path.resolve(UPLOAD_DIR, decoded);
    if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) return json(res, 403, { error: 'Forbidden' });
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = ext === '.pdf' ? 'application/pdf' : (MIME[ext] || 'application/octet-stream');
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(filePath).pipe(res);
    }
    return json(res, 404, { error: 'File not found' });
  }

  // Static files
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, filePath);
  
  if (fs.existsSync(fullPath)) {
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return fs.createReadStream(fullPath).pipe(res);
  }

  res.writeHead(404);
  res.end('Not found');
});

async function startServer() {
  try {
    const dbModule = require('./database/db');
    await dbModule.getDb();
    
    models = require('./database/models');
    
    server.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════════════╗');
      console.log('║        GRC Command Center - Enterprise Server        ║');
      console.log('╠══════════════════════════════════════════════════════╣');
      console.log(`║  URL:       http://localhost:${PORT}                   ║`);
      console.log('║  Database:  SQL.js (grc_database.sqlite)          ║');
      console.log('║  Storage:   /uploads folder                        ║');
      console.log('║  Stop:      Ctrl + C                              ║');
      console.log('╚══════════════════════════════════════════════════════╝');
      console.log('');
      console.log('Admin credentials:');
      console.log('  Email:    adin.saikia@vantagecircle.com');
      console.log('  Email:    security@vantagecircle.com');
      console.log('  Password: vantage@123');
      console.log('');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
