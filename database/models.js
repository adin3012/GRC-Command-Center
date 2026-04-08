const { run, get, all, lastId } = require('./db');

const logAudit = (userEmail, action, entityType, entityId, entityName, changes = null, req = null) => {
  try {
    run(`
      INSERT INTO audit_logs (user_email, action, entity_type, entity_id, entity_name, changes, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userEmail || 'system',
      action,
      entityType,
      entityId,
      entityName,
      changes ? JSON.stringify(changes) : null,
      req?.socket?.remoteAddress || null,
      req?.headers?.['user-agent']?.substring(0, 500) || null
    ]);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const logActivity = (type, title, description, entityType, entityId, userEmail = null, metadata = null) => {
  try {
    run(`
      INSERT INTO activities (type, title, description, entity_type, entity_id, user_email, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      type,
      title,
      description,
      entityType,
      entityId,
      userEmail,
      metadata ? JSON.stringify(metadata) : null
    ]);
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
};

const policies = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM policies WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters.search) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY updated_at DESC';
    return all(sql, params);
  },
  
  getById: (id) => get('SELECT * FROM policies WHERE id = ?', [id]),
  
  create: (data) => {
    run(`
      INSERT INTO policies (name, description, category, status, icon, pdf_url, owner, review_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [data.name, data.description, data.category, data.status || 'Draft', data.icon || 'description', data.pdf_url, data.owner, data.review_date]);
    
    const id = lastId();
    const item = policies.getById(id);
    logActivity('created', `Policy Created: ${data.name}`, `New policy "${data.name}" was added to the library.`, 'policy', id);
    return item;
  },
  
  update: (id, data, userEmail) => {
    const old = policies.getById(id);
    if (!old) return null;
    
    const fields = [];
    const params = [];
    
    ['name', 'description', 'category', 'status', 'icon', 'pdf_url', 'owner', 'review_date'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (fields.length === 0) return old;
    
    fields.push('updated_at = datetime("now")');
    params.push(id);
    
    run(`UPDATE policies SET ${fields.join(', ')} WHERE id = ?`, params);
    
    const updated = policies.getById(id);
    logAudit(userEmail, 'update', 'policy', id, old.name, { old, new: updated });
    logActivity('updated', `Policy Updated: ${updated.name}`, `Policy "${updated.name}" was modified.`, 'policy', id, userEmail);
    return updated;
  },
  
  delete: (id, userEmail) => {
    const item = policies.getById(id);
    if (!item) return false;
    
    run('DELETE FROM policies WHERE id = ?', [id]);
    logAudit(userEmail, 'delete', 'policy', id, item.name, item);
    logActivity('deleted', `Policy Deleted: ${item.name}`, `Policy "${item.name}" was removed from the library.`, 'policy', id, userEmail);
    return true;
  }
};

const reports = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM reports WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY updated_at DESC';
    return all(sql, params);
  },
  
  getById: (id) => get('SELECT * FROM reports WHERE id = ?', [id]),
  
  create: (data) => {
    run(`
      INSERT INTO reports (title, subtitle, description, status, date, icon, pdf_url, auditor, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [data.title, data.subtitle, data.description, data.status || 'In Progress', data.date, data.icon || 'assessment', data.pdf_url, data.auditor]);
    
    const id = lastId();
    const item = reports.getById(id);
    logActivity('created', `Report Added: ${data.title}`, `New report "${data.title}" was added.`, 'report', id);
    return item;
  },
  
  update: (id, data, userEmail) => {
    const old = reports.getById(id);
    if (!old) return null;
    
    const fields = [];
    const params = [];
    
    ['title', 'subtitle', 'description', 'status', 'date', 'icon', 'pdf_url', 'auditor'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (fields.length === 0) return old;
    
    fields.push('updated_at = datetime("now")');
    params.push(id);
    
    run(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`, params);
    
    const updated = reports.getById(id);
    logAudit(userEmail, 'update', 'report', id, old.title, { old, new: updated });
    logActivity('updated', `Report Updated: ${updated.title}`, `Report "${updated.title}" was modified.`, 'report', id, userEmail);
    return updated;
  },
  
  delete: (id, userEmail) => {
    const item = reports.getById(id);
    if (!item) return false;
    
    run('DELETE FROM reports WHERE id = ?', [id]);
    logAudit(userEmail, 'delete', 'report', id, item.title, item);
    logActivity('deleted', `Report Deleted: ${item.title}`, `Report "${item.title}" was removed.`, 'report', id, userEmail);
    return true;
  }
};

const vaptReports = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM vapt_reports WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY updated_at DESC';
    return all(sql, params);
  },
  
  getById: (id) => get('SELECT * FROM vapt_reports WHERE id = ?', [id]),
  
  create: (data) => {
    run(`
      INSERT INTO vapt_reports (title, subtitle, description, report_id, status, date, pdf_url, findings_critical, findings_high, findings_medium, findings_low, assessor, next_review_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      data.title, data.subtitle, data.description, data.report_id,
      data.status || 'In Progress', data.date, data.pdf_url,
      data.findings_critical || 0, data.findings_high || 0, data.findings_medium || 0, data.findings_low || 0,
      data.assessor, data.next_review_date
    ]);
    
    const id = lastId();
    const item = vaptReports.getById(id);
    logActivity('created', `VAPT Report Added: ${data.title}`, `New VAPT report "${data.title}" was added.`, 'vapt', id);
    return item;
  },
  
  update: (id, data, userEmail) => {
    const old = vaptReports.getById(id);
    if (!old) return null;
    
    const fields = [];
    const params = [];
    
    ['title', 'subtitle', 'description', 'report_id', 'status', 'date', 'pdf_url', 'findings_critical', 'findings_high', 'findings_medium', 'findings_low', 'assessor', 'next_review_date', 'remediation_status'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (fields.length === 0) return old;
    
    fields.push('updated_at = datetime("now")');
    params.push(id);
    
    run(`UPDATE vapt_reports SET ${fields.join(', ')} WHERE id = ?`, params);
    
    const updated = vaptReports.getById(id);
    logAudit(userEmail, 'update', 'vapt', id, old.title, { old, new: updated });
    logActivity('updated', `VAPT Report Updated: ${updated.title}`, `VAPT report "${updated.title}" was modified.`, 'vapt', id, userEmail);
    return updated;
  },
  
  delete: (id, userEmail) => {
    const item = vaptReports.getById(id);
    if (!item) return false;
    
    run('DELETE FROM vapt_reports WHERE id = ?', [id]);
    logAudit(userEmail, 'delete', 'vapt', id, item.title, item);
    logActivity('deleted', `VAPT Report Deleted: ${item.title}`, `VAPT report "${item.title}" was removed.`, 'vapt', id, userEmail);
    return true;
  }
};

const certificates = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM certificates WHERE 1=1';
    const params = [];
    
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.search) {
      sql += ' AND (name LIKE ? OR full_name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }
    
    sql += ' ORDER BY expiry_date ASC';
    return all(sql, params);
  },
  
  getById: (id) => get('SELECT * FROM certificates WHERE id = ?', [id]),
  
  create: (data) => {
    run(`
      INSERT INTO certificates (name, full_name, icon, color, status, issued_date, expiry_date, cert_body, pdf_url, scope, certificate_number, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      data.name, data.full_name, data.icon || 'verified', data.color || 'green',
      data.status || 'Active', data.issued_date, data.expiry_date, data.cert_body, data.pdf_url,
      data.scope, data.certificate_number
    ]);
    
    const id = lastId();
    const item = certificates.getById(id);
    logActivity('created', `Certificate Added: ${data.name}`, `New certificate "${data.name}" was added.`, 'certificate', id);
    return item;
  },
  
  update: (id, data, userEmail) => {
    const old = certificates.getById(id);
    if (!old) return null;
    
    const fields = [];
    const params = [];
    
    ['name', 'full_name', 'icon', 'color', 'status', 'issued_date', 'expiry_date', 'cert_body', 'pdf_url', 'scope', 'certificate_number'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (fields.length === 0) return old;
    
    fields.push('updated_at = datetime("now")');
    params.push(id);
    
    run(`UPDATE certificates SET ${fields.join(', ')} WHERE id = ?`, params);
    
    const updated = certificates.getById(id);
    logAudit(userEmail, 'update', 'certificate', id, old.name, { old, new: updated });
    logActivity('updated', `Certificate Updated: ${updated.name}`, `Certificate "${updated.name}" was modified.`, 'certificate', id, userEmail);
    return updated;
  },
  
  delete: (id, userEmail) => {
    const item = certificates.getById(id);
    if (!item) return false;
    
    run('DELETE FROM certificates WHERE id = ?', [id]);
    logAudit(userEmail, 'delete', 'certificate', id, item.name, item);
    logActivity('deleted', `Certificate Deleted: ${item.name}`, `Certificate "${item.name}" was removed.`, 'certificate', id, userEmail);
    return true;
  }
};

const risks = {
  getAll: (filters = {}) => {
    let sql = 'SELECT * FROM risks WHERE 1=1';
    const params = [];
    
    if (filters.severity) {
      sql += ' AND severity = ?';
      params.push(filters.severity);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    
    sql += ' ORDER BY updated_at DESC';
    return all(sql, params);
  },
  
  getById: (id) => get('SELECT * FROM risks WHERE id = ?', [id]),
  
  create: (data) => {
    run(`
      INSERT INTO risks (title, description, category, severity, likelihood, impact, owner, status, mitigation_plan, review_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      data.title, data.description, data.category, data.severity || 'Medium',
      data.likelihood, data.impact, data.owner, data.status || 'Open',
      data.mitigation_plan, data.review_date
    ]);
    
    const id = lastId();
    const item = risks.getById(id);
    logActivity('created', `Risk Added: ${data.title}`, `New risk "${data.title}" was added.`, 'risk', id);
    return item;
  },
  
  update: (id, data, userEmail) => {
    const old = risks.getById(id);
    if (!old) return null;
    
    const fields = [];
    const params = [];
    
    ['title', 'description', 'category', 'severity', 'likelihood', 'impact', 'owner', 'status', 'mitigation_plan', 'review_date'].forEach(field => {
      if (data[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(data[field]);
      }
    });
    
    if (fields.length === 0) return old;
    
    fields.push('updated_at = datetime("now")');
    params.push(id);
    
    run(`UPDATE risks SET ${fields.join(', ')} WHERE id = ?`, params);
    
    const updated = risks.getById(id);
    logAudit(userEmail, 'update', 'risk', id, old.title, { old, new: updated });
    logActivity('updated', `Risk Updated: ${updated.title}`, `Risk "${updated.title}" was modified.`, 'risk', id, userEmail);
    return updated;
  },
  
  delete: (id, userEmail) => {
    const item = risks.getById(id);
    if (!item) return false;
    
    run('DELETE FROM risks WHERE id = ?', [id]);
    logAudit(userEmail, 'delete', 'risk', id, item.title, item);
    logActivity('deleted', `Risk Deleted: ${item.title}`, `Risk "${item.title}" was removed.`, 'risk', id, userEmail);
    return true;
  }
};

const users = {
  getByEmail: (email) => get('SELECT * FROM users WHERE email = ?', [email]),
  getById: (id) => get('SELECT * FROM users WHERE id = ?', [id]),
  create: (data) => {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(data.password, 10);
    run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [data.email, hash, data.name, data.role || 'user']);
    return users.getById(lastId());
  },
  updateLastLogin: (id) => run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [id])
};

const activities = {
  getRecent: (limit = 50) => all('SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', [limit]),
  getByEntity: (entityType, entityId) => all('SELECT * FROM activities WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC', [entityType, entityId])
};

const auditLogs = {
  getRecent: (limit = 100) => all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]),
  getByEntity: (entityType, entityId) => all('SELECT * FROM audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC', [entityType, entityId])
};

const dashboard = {
  getStats: () => {
    const policiesStats = get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "Published" THEN 1 ELSE 0 END) as published FROM policies') || { total: 0, published: 0 };
    const reportsStats = get('SELECT COUNT(*) as total, SUM(CASE WHEN status IN ("Complete", "Verified") THEN 1 ELSE 0 END) as complete FROM reports') || { total: 0, complete: 0 };
    const vaptStats = get('SELECT COUNT(*) as total, SUM(CASE WHEN status = "Complete" THEN 1 ELSE 0 END) as complete, SUM(findings_critical) + SUM(findings_high) as critical_high_findings FROM vapt_reports') || { total: 0, complete: 0, critical_high_findings: 0 };
    const certStats = get('SELECT COUNT(*) as total, SUM(CASE WHEN status IN ("Active", "Certified", "Compliant") THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = "Expired" THEN 1 ELSE 0 END) as expired FROM certificates') || { total: 0, active: 0, expired: 0 };
    const riskStats = get('SELECT COUNT(*) as total, SUM(CASE WHEN severity = "High" THEN 1 ELSE 0 END) as high_severity, SUM(CASE WHEN status = "Open" THEN 1 ELSE 0 END) as open_risks FROM risks') || { total: 0, high_severity: 0, open_risks: 0 };
    
    return {
      policies: policiesStats,
      reports: reportsStats,
      vapt: vaptStats,
      certificates: certStats,
      risks: riskStats
    };
  }
};

module.exports = {
  policies,
  reports,
  vaptReports,
  certificates,
  risks,
  users,
  activities,
  auditLogs,
  dashboard,
  logAudit,
  logActivity
};
