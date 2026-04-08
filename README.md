# GRC Command Center - Enterprise Edition

A professional, SaaS-style Governance, Risk & Compliance dashboard built with Node.js and SQLite.

## Features

- **Policy Library** - Manage and track organizational policies
- **Compliance Reports** - Audit reports and assessments with PDF downloads
- **VAPT Reports** - Security testing results with findings tracking
- **Certificates** - Compliance certifications with expiry tracking
- **Risk Register** - Track and manage organizational risks
- **Activity Log** - Complete audit trail of all changes
- **Real-time Updates** - Live data sync across all connected clients
- **Role-based Access** - Admin authentication for content management

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in browser
open http://localhost:3001
```

## Admin Login

- **Email:** `admin@vantagecircle.com`
- **Password:** `admin123`

## Database

The application uses SQL.js (SQLite in JavaScript) for data persistence:
- Database file: `grc_database.sqlite`
- Auto-creates and seeds on first run

## Commands

```bash
npm start     # Start the server
npm run dev   # Development mode
npm run db:reset  # Reset and reseed database
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data` | Get all data |
| GET | `/api/dashboard` | Dashboard statistics |
| GET | `/api/search?q=term` | Search all collections |
| GET | `/api/policies` | List policies |
| POST | `/api/policies` | Create policy |
| PUT | `/api/policies/:id` | Update policy |
| DELETE | `/api/policies/:id` | Delete policy |
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Create report |
| GET | `/api/vapt` | List VAPT reports |
| POST | `/api/vapt` | Create VAPT report |
| GET | `/api/certificates` | List certificates |
| POST | `/api/certificates` | Create certificate |
| POST | `/api/upload?folder=name` | Upload file |
| POST | `/api/login` | Admin login |
| POST | `/api/logout` | Admin logout |

## Project Structure

```
├── database/
│   ├── db.js      # Database connection & helpers
│   ├── models.js  # Data models & CRUD operations
│   └── seed.js    # Initial data seeding
├── uploads/       # Uploaded files storage
├── logo/          # Logo assets
├── index.html     # Frontend application
├── server.js      # Backend server
└── package.json  # Dependencies
```

## Auto-sync Feature

When you update any report, certificate, or upload a new file:
1. The data is stored in the SQLite database
2. The text/description is linked to the file
3. Real-time updates are broadcast to all connected clients
4. The activity log records all changes with timestamps

## License

Proprietary - Vantage Circle
