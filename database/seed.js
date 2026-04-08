const { run, get, all, lastId, getDb } = require('./db');
const bcrypt = require('bcryptjs');

const seedOrganization = () => {
  const existing = get('SELECT * FROM organizations WHERE id = 1');
  if (existing) return;
  
  run('INSERT INTO organizations (name, logo_url, website) VALUES (?, ?, ?)', 
    ['Vantage Circle', '/logo/VC_Logo.png', 'https://vantagecircle.com']);
};

const seedPolicies = () => {
  const existing = get('SELECT COUNT(*) as count FROM policies');
  if (existing?.count > 0) return;

  const policies = [
    { name: 'Acceptable Usage Policy', desc: 'Defines acceptable use of information systems, assets, and network resources across the organization.', category: 'Security', status: 'Published', icon: 'computer', pdf_url: 'policies/Vantagecircle_Acceptable_Usage_Policy.docx (1) (2).pdf' },
    { name: 'Antivirus Policy', desc: 'Governs deployment and management of antivirus and malware protection controls on all endpoints.', category: 'Security', status: 'Published', icon: 'security', pdf_url: 'policies/Vantagecircle_Antivirus_Policy.docx.pdf' },
    { name: 'Anti-Bribery Policy', desc: 'Outlines the organization\'s stance on bribery, gifts, and anti-corruption practices for all staff.', category: 'HR', status: 'Published', icon: 'balance', pdf_url: 'policies/VC_Anti-Bribery Policy.pdf' },
    { name: 'Artificial Intelligence Policy', desc: 'Governs responsible use, governance, and risk management of AI/ML technologies within the organization.', category: 'Security', status: 'Published', icon: 'smart_toy', pdf_url: 'policies/Vantage Circle_Artificial_Intelligence_Policy (1) 3 (1).pdf' },
    { name: 'Asset Management Policy & Procedure', desc: 'Defines procedures for identification, classification, and lifecycle management of organizational assets.', category: 'Security', status: 'Published', icon: 'inventory_2', pdf_url: 'policies/Vantagecircle_Asset_Management_Policy_&_Procedure.docx (1) (4).pdf' },
    { name: 'BCP and DR Policy & Procedure', desc: 'Establishes procedures for business continuity planning and disaster recovery to maintain operations.', category: 'Operations', status: 'Published', icon: 'restore', pdf_url: 'policies/Vantagecircle_BCP_and_DR_Policy_and_Procedure.docx (3).pdf' },
    { name: 'BCP/DR Test Report 2026', desc: 'Results of the Business Continuity Plan and Disaster Recovery test conducted in January 2026.', category: 'Operations', status: 'Published', icon: 'fact_check', pdf_url: 'policies/BCP_DR_Test_Report_2026.pdf' },
    { name: 'Change Management Policy & Procedure', desc: 'Defines controls for managing changes to information systems, applications, and infrastructure.', category: 'Security', status: 'Published', icon: 'manage_history', pdf_url: 'policies/Vantagecircle_Change_Management_Policy_&_Procedure.docx (2).pdf' },
    { name: 'Clear Desk & Clear Screen Policy', desc: 'Ensures physical and on-screen security of workstations and sensitive information when unattended.', category: 'Security', status: 'Published', icon: 'monitor', pdf_url: 'policies/Vantagecircle_Clear_Desk_&_Screen_Policy.docx (2).pdf' },
    { name: 'Cloud Security Policy', desc: 'Governs security controls, responsibilities, and standards for cloud-hosted services and infrastructure.', category: 'Security', status: 'Published', icon: 'cloud_done', pdf_url: 'policies/Vantage Circle_Cloud Security Policy (2) (1) (1).pdf' },
    { name: 'Code of Conduct and Ethics', desc: 'Sets behavioral standards and ethical guidelines for all employees and contractors at Vantage Circle.', category: 'HR', status: 'Published', icon: 'handshake', pdf_url: 'policies/Code of Conduct & Ethics Policy 2.pdf' },
    { name: 'Configuration Management Policy', desc: 'Defines procedures for secure configuration and baseline hardening of all IT systems and devices.', category: 'Security', status: 'Published', icon: 'settings_applications', pdf_url: 'policies/Vantage Circle_Configuration_Policy_and_Procedure (1).pdf' },
    { name: 'Consent Management Procedure', desc: 'Procedures for obtaining, recording, and managing data subject consent in compliance with privacy regulations.', category: 'Privacy', status: 'Published', icon: 'how_to_reg', pdf_url: 'policies/Vantage Circle_Consent Management Procedure.pdf' },
    { name: 'Cookie Policy', desc: 'Governs the use of cookies and tracking technologies across organizational websites and applications.', category: 'Privacy', status: 'Published', icon: 'cookie', pdf_url: 'policies/Vantagecircle_Cookie_Policy_2025.pdf' },
    { name: 'Cryptography Policy & Procedure', desc: 'Defines standards for cryptographic controls, encryption algorithms, and key lifecycle management.', category: 'Security', status: 'Published', icon: 'key', pdf_url: 'policies/Vantagecircle_Cryptography_Policy_and_Procedure.docx (2).pdf' },
    { name: 'Data Backup Policy', desc: 'Defines procedures for data backup frequency, retention, recovery testing, and backup media management.', category: 'Security', status: 'Published', icon: 'backup', pdf_url: 'policies/Vantagecircle_Data_Backup_Policy.docx_1 (2) (3).pdf' },
    { name: 'Personal Data Breach Management', desc: 'Procedures for identifying, escalating, reporting, and responding to personal data breaches.', category: 'Privacy', status: 'Published', icon: 'notification_important', pdf_url: 'policies/Vantagecircle_Data_Breach_Management_Procedure.docx (1) (1).pdf' },
    { name: 'Data Minimization Policy', desc: 'Ensures data collected is limited to what is necessary for specified, explicit, and legitimate purposes.', category: 'Privacy', status: 'Published', icon: 'compress', pdf_url: 'policies/Vantage Circle_Limited Data Set Policy_Data Minimization Policy.pdf' },
    { name: 'Data Privacy Impact Assessment', desc: 'Methodology for conducting DPIA for high-risk processing activities in compliance with GDPR Art. 35.', category: 'Privacy', status: 'Published', icon: 'analytics', pdf_url: 'policies/Vantagecircle_DPIA.docx.pdf' },
    { name: 'Data Privacy Policy', desc: 'Governs collection, storage, processing, and sharing of personal data across all platforms.', category: 'Privacy', status: 'Published', icon: 'privacy_tip', pdf_url: 'policies/Vantagecircle_Data Privacy Policy.docx.pdf' },
    { name: 'Data Retention and Disposal Policy', desc: 'Defines retention schedules and secure disposal procedures for organizational data assets.', category: 'Privacy', status: 'Published', icon: 'delete_forever', pdf_url: 'policies/Vantagecircle_Data_Retention_and_Disposal_Policy.docx.pdf' },
    { name: 'Data Subject Request Manual', desc: 'Procedures for handling data subject rights requests: access, rectification, erasure, and portability.', category: 'Privacy', status: 'Published', icon: 'person_search', pdf_url: 'policies/Vantagecircle_Data_Subject_Request_Manual.docx  (1).pdf' },
    { name: 'Employee Data Privacy Statement', desc: 'Statement describing how employee personal data is collected, processed, and protected.', category: 'Privacy', status: 'Published', icon: 'badge', pdf_url: 'policies/Vantagecircle_Employee_Data_Privacy_Statement.docx (1).pdf' },
    { name: 'Employee Exit Policy', desc: 'Defines procedures, responsibilities, and checklists for the employee offboarding and exit process.', category: 'HR', status: 'Published', icon: 'exit_to_app', pdf_url: 'policies/Employee Exit Policy (1) (1).pdf' },
    { name: 'Employee Privacy Statement', desc: 'Privacy notice informing employees of their rights and how their personal data is handled by Vantage Circle.', category: 'Privacy', status: 'Published', icon: 'person', pdf_url: 'policies/Vantagecircle_Employee_Privacy_Statement.docx (1) (1) (2).pdf' },
    { name: 'Hardening Policy', desc: 'Defines baseline security hardening requirements for servers, endpoints, and network devices.', category: 'Security', status: 'Published', icon: 'shield', pdf_url: 'policies/Vantagecircle_Hardening_Policy.docx (1) (1).pdf' },
    { name: 'HR Disciplinary Policy & Procedure', desc: 'Defines disciplinary procedures, progressive discipline steps, and grievance handling processes.', category: 'HR', status: 'Published', icon: 'gavel', pdf_url: 'policies/Vantagecircle_HR_Disciplinary_Action_Policy_&_Procedure.docx (1)-2 (1).pdf' },
    { name: 'HR Security Policy', desc: 'Defines information security requirements during recruitment, employment lifecycle, and termination.', category: 'HR', status: 'Published', icon: 'group', pdf_url: 'policies/Vantagecircle_HR_Security_Policy.docx.pdf' },
    { name: 'Incident Management Policy', desc: 'Defines procedures for detecting, reporting, classifying, and responding to information security incidents.', category: 'Security', status: 'Published', icon: 'warning', pdf_url: 'policies/Vantagecircle_Incident_Management_Policy_and_Procedure.docx (1).pdf' },
    { name: 'Information Classification Policy', desc: 'Defines classification levels (Public, Internal, Confidential, Restricted) and handling requirements.', category: 'Security', status: 'Published', icon: 'label', pdf_url: 'policies/Vantagecircle_Information_Classification_Policy.docx (2).pdf' },
    { name: 'ISMS Manual', desc: 'The Information Security Management System manual defining the ISMS framework, scope, and control objectives.', category: 'Security', status: 'Published', icon: 'menu_book', pdf_url: 'policies/vantage_circle_information_security_management_system_manual (1).pdf' },
    { name: 'Information Security Policy', desc: 'Defines organizational controls for information systems, access management, and incident response.', category: 'Security', status: 'Published', icon: 'verified_user', pdf_url: 'policies/Vantage Circle_Information_Security_Policy (1) (1).pdf' },
    { name: 'Log Management and Monitoring Policy', desc: 'Defines logging standards, log retention periods, and security event monitoring procedures.', category: 'Security', status: 'Published', icon: 'monitoring', pdf_url: 'policies/Vantagecircle_Log_Management_and_Monitoring_Policy_and_Procedure.docx (1) (2).pdf' },
    { name: 'Logical Access Control Policy', desc: 'Defines access control standards, user provisioning, privilege management, and access review procedures.', category: 'Security', status: 'Published', icon: 'lock_person', pdf_url: 'policies/Vantagecircle_Logical_Access_Control_Policy_&_Procedure.docx (1) (1) (2).pdf' },
    { name: 'Media Handling and Disposal Policy', desc: 'Defines procedures for secure handling, storage, transfer, and disposal of physical and digital media.', category: 'Security', status: 'Published', icon: 'sd_card', pdf_url: 'policies/Vantagecircle_Media_Handling_and_Disposal_Policy.docx (2).pdf' },
    { name: 'Network Management Policy', desc: 'Defines network security controls, segmentation, access rules, and monitoring requirements.', category: 'Security', status: 'Published', icon: 'hub', pdf_url: 'policies/Vantagecircle_Network_Management_Policy.docx.pdf' },
    { name: 'Password Management Policy', desc: 'Defines password complexity, rotation frequency, and secure storage requirements for all systems.', category: 'Security', status: 'Published', icon: 'password', pdf_url: 'policies/Vantagecircle_Password_Management_Policy.docx.pdf' },
    { name: 'Patch and Vulnerability Management', desc: 'Defines procedures for identifying, prioritizing, testing, and applying security patches and fixes.', category: 'Security', status: 'Published', icon: 'system_update', pdf_url: 'policies/Vantagecircle_Patch_and_Vulnerability_Management_Policy.docx (1) (1) (1).pdf' },
    { name: 'Physical Access Control Policy', desc: 'Defines controls for physical access to facilities, data centers, server rooms, and secure areas.', category: 'Security', status: 'Published', icon: 'door_front', pdf_url: 'policies/Vantagecircle_Physical_Access_Control_Policy.docx (1) (2).pdf' },
    { name: 'Physical & Environmental Security', desc: 'Defines physical security controls for premises, equipment protection, and environmental threat management.', category: 'Security', status: 'Published', icon: 'domain', pdf_url: 'policies/Vantagecircle_Physical_&_Environmental_Security_Policy.docx.pdf' },
    { name: 'Privacy Policy', desc: 'Public-facing policy describing how customer and user personal data is collected, used, and protected.', category: 'Privacy', status: 'Published', icon: 'policy', pdf_url: 'policies/Vantagecircle_Privacy_Policy.docx.pdf' },
    { name: 'Risk Management Procedure', desc: 'Defines the risk assessment methodology, risk treatment options, and risk acceptance criteria.', category: 'Operations', status: 'Published', icon: 'assessment', pdf_url: 'policies/Vantagecircle_Risk_Management_Procedure.docx (1) (2).pdf' },
    { name: 'Secure Development and Maintenance', desc: 'Defines secure coding standards, code review requirements, and vulnerability management in the SDLC.', category: 'Security', status: 'Published', icon: 'code', pdf_url: 'policies/vantage_circle_secure_development_and_maintenance_policy (3).pdf' },
    { name: 'Software Development Lifecycle', desc: 'Defines the SDLC process, security gates, testing requirements, and quality standards for software development.', category: 'Security', status: 'Published', icon: 'developer_mode', pdf_url: 'policies/Vantage Circle_Software Development Lifecycle Procedure (3).pdf' },
    { name: 'Supplier Management Policy', desc: 'Defines requirements for third-party vendor risk assessment, onboarding, and ongoing monitoring.', category: 'Operations', status: 'Published', icon: 'storefront', pdf_url: 'policies/Vantagecircle_Supplier_Management_Policy_&_Procedure.docx (1) (1) 2.pdf' },
    { name: 'Threat Intelligence Policy', desc: 'Defines processes for gathering, analyzing, and operationalizing threat intelligence data.', category: 'Security', status: 'Published', icon: 'radar', pdf_url: 'policies/Vantage Circle_Threat_Intelligence_Policy (1).pdf' },
    { name: 'Work From Home Policy', desc: 'Defines eligibility criteria, equipment requirements, and information security guidelines for remote work.', category: 'HR', status: 'Published', icon: 'home_work', pdf_url: 'policies/WFH POLICY_VC (1) (2) (2).pdf' },
  ];

  policies.forEach(p => {
    run(`
      INSERT INTO policies (name, description, category, status, icon, pdf_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `, [p.name, p.desc, p.category, p.status, p.icon, p.pdf_url]);
  });
};

const seedReports = () => {
  const existing = get('SELECT COUNT(*) as count FROM reports');
  if (existing?.count > 0) return;

  const reports = [
    { title: 'HIPAA Compliance Audit', subtitle: 'Assessed by Scrut Automation Inc.', desc: 'HIPAA compliance audit for Bargain Technologies (Vantage Circle) against NIST SP 800-66 Rev. 2. Assessment Date: Feb 5, 2026. Report Date: Feb 17, 2026.', status: 'Complete', date: 'Feb 2026', icon: 'medical_services', pdf_url: 'certificates/HIPAA_Compliance_Audit_Report.pdf' },
    { title: 'CCPA Compliance Audit', subtitle: 'Assessed by Scrut Automation Inc.', desc: 'California Consumer Privacy Act audit covering data collection practices, consumer rights implementation, and data retention policies. Assessment Date: Feb 5, 2026.', status: 'Complete', date: 'Feb 2026', icon: 'gavel', pdf_url: 'certificates/CCPA_Audit_Report.pdf' },
    { title: 'DPDPA Compliance Audit', subtitle: 'Assessed by Scrut Automation', desc: 'Digital Personal Data Protection Act compliance audit evaluating consent management, lawful data processing, and data principal rights. Assessment Date: Feb 5, 2026.', status: 'Complete', date: 'Feb 2026', icon: 'fingerprint', pdf_url: 'certificates/DPDPA_Audit_Report.pdf' },
    { title: 'GDPR Assessment Report', subtitle: 'Assessed by Scrut Automation Inc.', desc: 'GDPR compliance assessment for Bargain Technologies covering EU operations, data mapping, and processing activities under Regulation (EU) 2016/679. Assessment Date: May 28, 2025.', status: 'Complete', date: 'May 2025', icon: 'language', pdf_url: 'reports/GDPR_Audit_Report_2025.pdf' },
    { title: 'BCP/DR Test Report 2026', subtitle: 'Business Continuity Plan Test Result', desc: 'Business Continuity Plan and Disaster Recovery test result report for Vantage Circle. Version 3.0. Release Date: Jan 30, 2026.', status: 'Verified', date: 'Jan 2026', icon: 'verified', pdf_url: 'policies/BCP_DR_Test_Report_2026.pdf' },
  ];

  reports.forEach(r => {
    run(`
      INSERT INTO reports (title, subtitle, description, status, date, icon, pdf_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [r.title, r.subtitle, r.desc, r.status, r.date, r.icon, r.pdf_url]);
  });
};

const seedVapt = () => {
  const existing = get('SELECT COUNT(*) as count FROM vapt_reports');
  if (existing?.count > 0) return;

  const vaptReports = [
    { title: 'Web Application VAPT', subtitle: 'Vantage Circle Web Application', desc: 'Level 2 Closure Report. 2 findings identified: EXIF Geolocation data exposure (Medium) and Overly permissive cross-access domain policy (Low). Both fixed at Level 2. Assessed by Cybertryzub Infosec (May 5–8, 2025).', report_id: 'VAPT-WEB-2025', status: 'Complete', date: 'Apr 1, 2026', pdf_url: 'vapt/Web_App_VAPT_May2025.pdf', critical: 0, high: 0, medium: 1, low: 1 },
    { title: 'Android Application VAPT', subtitle: 'Vantage Circle Android App', desc: 'Level 2 Closure Report. 4 findings: No Root Detection (High — Fixed), Vulnerable Android version (High — BUC), Insecure permissions (Medium — BUC), CSP header missing (Low — BUC). Assessed by Cybertryzub Infosec (Feb 19–21, 2025).', report_id: 'VAPT-AND-2025', status: 'Complete', date: 'Feb 21, 2025', pdf_url: 'vapt/Android_App_VAPT_Feb2025.pdf', critical: 0, high: 2, medium: 1, low: 1 },
    { title: 'iOS Application VAPT', subtitle: 'Vantage Circle iOS App', desc: 'Level 2 Closure Report. 4 findings: No Jailbreak Detection (High — Fixed), ATS Misconfigured (High — BUC), Insecure permissions (Medium — BUC), CSP header missing (Low — BUC). Assessed by Cybertryzub Infosec (Feb 20–21, 2025).', report_id: 'VAPT-IOS-2025', status: 'Complete', date: 'Feb 21, 2025', pdf_url: 'vapt/iOS_App_VAPT_Feb2025.pdf', critical: 0, high: 2, medium: 1, low: 1 },
    { title: 'Source Code Security Review (SAST)', subtitle: 'Bargain Technologies — Application Source Code', desc: 'Level 2 Closure Report. 14 findings: 4 High (Command Injection, Path Traversal, SSRF, Hardcoded Secrets) and 10 Medium (encryption, cryptographic, and cookie issues). All 14 findings fixed at Level 2. Assessed by Cybertryzub Infosec (Jul 15–30, 2025).', report_id: 'SAST-2025', status: 'Complete', date: 'Jul 30, 2025', pdf_url: 'SAST/Vantage_Circle_Source_Code_Review_Audit_Level_2_Report.pdf', critical: 0, high: 4, medium: 10, low: 0 },
  ];

  vaptReports.forEach(v => {
    run(`
      INSERT INTO vapt_reports (title, subtitle, description, report_id, status, date, pdf_url, findings_critical, findings_high, findings_medium, findings_low, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [v.title, v.subtitle, v.desc, v.report_id, v.status, v.date, v.pdf_url, v.critical, v.high, v.medium, v.low]);
  });
};

const seedCertificates = () => {
  const existing = get('SELECT COUNT(*) as count FROM certificates');
  if (existing?.count > 0) return;

  const certificates = [
    { name: 'ISO 27001', full_name: 'Information Security Management System', icon: 'verified', color: 'green', status: 'Active', issued_date: 'Apr 25, 2024', expiry_date: 'Apr 24, 2027', cert_body: 'INTERCERT', pdf_url: 'certificates/ISO_27001_Certificate.pdf' },
    { name: 'ISO 27701', full_name: 'Privacy Information Management System', icon: 'shield', color: 'green', status: 'Certified', issued_date: 'Apr 25, 2024', expiry_date: 'Apr 24, 2027', cert_body: 'INTERCERT', pdf_url: 'certificates/ISO_27701_Certificate.pdf' },
    { name: 'SOC 2 Type II', full_name: 'Security, Availability & Confidentiality', icon: 'lock', color: 'red', status: 'Expired', issued_date: 'Apr 1, 2025', expiry_date: 'Mar 31, 2026', cert_body: 'Accorp Partners', pdf_url: 'certificates/SOC2_TypeII_Certificate.pdf' },
    { name: 'HIPAA', full_name: 'Health Insurance Portability Act', icon: 'medical_services', color: 'green', status: 'Active', issued_date: 'Feb 17, 2026', expiry_date: 'Feb 17, 2027', cert_body: 'Scrut Automation', pdf_url: 'certificates/HIPAA_Compliance_Audit_Report.pdf' },
    { name: 'CCPA', full_name: 'California Consumer Privacy Act', icon: 'gavel', color: 'green', status: 'Compliant', issued_date: 'Feb 5, 2026', expiry_date: 'Feb 5, 2027', cert_body: 'Scrut Automation', pdf_url: 'certificates/CCPA_Audit_Report.pdf' },
    { name: 'DPDPA', full_name: 'Digital Personal Data Protection Act', icon: 'fingerprint', color: 'green', status: 'Compliant', issued_date: 'Feb 5, 2026', expiry_date: 'Feb 5, 2027', cert_body: 'Scrut Automation', pdf_url: 'certificates/DPDPA_Audit_Report.pdf' },
    { name: 'GDPR', full_name: 'General Data Protection Regulation (EU)', icon: 'language', color: 'green', status: 'Certified', issued_date: 'May 28, 2025', expiry_date: 'May 28, 2026', cert_body: 'Scrut Automation', pdf_url: 'reports/GDPR_Audit_Report_2025.pdf' },
  ];

  certificates.forEach(c => {
    run(`
      INSERT INTO certificates (name, full_name, icon, color, status, issued_date, expiry_date, cert_body, pdf_url, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [c.name, c.full_name, c.icon, c.color, c.status, c.issued_date, c.expiry_date, c.cert_body, c.pdf_url]);
  });
};

const seedRisks = () => {
  const existing = get('SELECT COUNT(*) as count FROM risks');
  if (existing?.count > 0) return;

  const risks = [
    { title: 'Data Breach Exposure', description: 'Risk of unauthorized access to sensitive customer or employee data.', category: 'Privacy', severity: 'High', likelihood: 'Medium', impact: 'High', owner: 'Security Team', status: 'Mitigating' },
    { title: 'Third-Party Vendor Risk', description: 'Security and compliance risks from third-party suppliers and partners.', category: 'Operations', severity: 'Medium', likelihood: 'Medium', impact: 'Medium', owner: 'Risk Officer', status: 'Monitored' },
    { title: 'Regulatory Non-Compliance', description: 'Risk of failing to meet regulatory requirements in various jurisdictions.', category: 'Legal', severity: 'Medium', likelihood: 'Low', impact: 'Medium', owner: 'Legal Team', status: 'Resolved' },
    { title: 'Insider Threat Exposure', description: 'Risk from employees or contractors with malicious intent or negligence.', category: 'HR', severity: 'High', likelihood: 'Low', impact: 'High', owner: 'HR & Security', status: 'Mitigating' },
    { title: 'Cloud Misconfiguration', description: 'Risk from improperly configured cloud services leading to data exposure.', category: 'IT', severity: 'Low', likelihood: 'Medium', impact: 'Low', owner: 'DevOps Team', status: 'Monitored' },
  ];

  risks.forEach(r => {
    run(`
      INSERT INTO risks (title, description, category, severity, likelihood, impact, owner, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [r.title, r.description, r.category, r.severity, r.likelihood, r.impact, r.owner, r.status]);
  });
};

const seedAdminUser = () => {
  const existing = get('SELECT COUNT(*) as count FROM users');
  if (existing?.count > 0) return;

  const hash = bcrypt.hashSync('vantage@123', 10);
  run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', ['adin.saikia@vantagecircle.com', hash, 'Adin Saikia', 'admin']);
  run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', ['security@vantagecircle.com', hash, 'Security Team', 'admin']);
};

async function runSeeds() {
  console.log('Seeding database...');
  await getDb();
  seedOrganization();
  seedPolicies();
  seedReports();
  seedVapt();
  seedCertificates();
  seedRisks();
  seedAdminUser();
  console.log('Database seeded successfully!');
}

runSeeds().catch(console.error);

module.exports = { runSeeds };
