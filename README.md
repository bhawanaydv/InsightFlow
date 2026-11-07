# InsightFlow

**Your data. Your questions. Clear insights.**

InsightFlow is a private workspace for students and beginner analysts to organize projects, upload CSV or Excel datasets, understand their structure, and preview their data. This Week 1 foundation includes registration, sign in, project management, dataset metadata extraction, and paginated previews. Cleaning, EDA, AI analysis, and reports are clearly marked as coming soon.

## Tech stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Recharts, Lucide React
- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Files:** Multer memory uploads with local disk storage; CSV and XLSX parsing
- **Authentication:** bcrypt password hashing and signed JWT bearer tokens

## Project layout

```text
frontend/                 React application
  src/components/         Shared navigation and UI components
  src/pages/              Landing, auth, dashboard, projects, workspace
  src/services/           API client
backend/                  Express API
  prisma/                 PostgreSQL schema and initial migration
  src/routes/             Authentication, project and dataset endpoints
  src/services/           Dataset parsing and metadata extraction
  tests/                  API ownership/auth and upload validation tests
```

## Requirements

- Node.js 20.19 or newer and npm
- PostgreSQL 14 or newer

## Local setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Configure the backend:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Set `DATABASE_URL` to your PostgreSQL connection string. Replace `CHANGE_ME` with your local database password and set `JWT_SECRET` to a randomly generated secret of at least 32 characters. `UPLOAD_DIR` defaults to `./uploads` relative to the backend process.

3. Configure the frontend:

   ```bash
   cp frontend/.env.example frontend/.env
   ```

   The default API URL is `http://localhost:4000/api`.

4. Create the `insightflow` PostgreSQL database, then generate Prisma Client and apply the migration:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the API and web app together:

   ```bash
   npm run dev
   ```

   The frontend runs at [http://localhost:5173](http://localhost:5173); the API runs at [http://localhost:4000](http://localhost:4000). Check API readiness at `/api/health`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_SECRET` | Signing key, at least 32 characters | Required |
| `JWT_EXPIRES_IN` | JWT lifetime | `7d` |
| `PORT` | API port | `4000` |
| `FRONTEND_URL` | Allowed browser origin for CORS | `http://localhost:5173` |
| `UPLOAD_DIR` | Directory for original uploaded files | `./uploads` |
| `MAX_UPLOAD_MB` | Maximum upload size | `25` |

### Frontend (`frontend/.env`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | API base URL | `http://localhost:4000/api` |

Never put real credentials in `.env.example` or frontend variables. Actual `.env` files, local uploads, and database files are ignored by Git.

## Database and file handling

The Prisma schema defines `User`, `Project`, and `Dataset`. A user owns projects; each dataset belongs to a project, so ownership is checked through the project's authenticated owner. Foreign keys cascade project and dataset metadata deletion. The initial PostgreSQL migration is in `backend/prisma/migrations/20261107000000_init/`.

Original files are stored separately under `backend/uploads/` by default, using generated names. Only file metadata and column information are stored in PostgreSQL. Project deletion removes its metadata and local original files. Uploads are limited to 25 MB by default; CSV and XLSX are accepted, with CSV MIME variants supported. XLSX metadata and preview use the first worksheet. Type detection samples up to 100 rows. A maximum of 100,000 data rows and 500 columns is supported.

## API endpoints

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current authenticated user |
| `GET` | `/api/projects` | List the current user's projects and recent dataset summaries |
| `POST` | `/api/projects` | Create a project (`{ "name": "…" }`) |
| `GET` | `/api/projects/:projectId` | Get an owned project and its dataset metadata |
| `PATCH` | `/api/projects/:projectId` | Rename an owned project (`{ "name": "…" }`) |
| `DELETE` | `/api/projects/:projectId` | Delete an owned project and its files |
| `POST` | `/api/projects/:projectId/datasets` | Upload a multipart `file` field (CSV or XLSX) |
| `GET` | `/api/datasets/:datasetId/preview?page=1&pageSize=25` | Paginated preview for a dataset in an owned project |

## Tests and build

```bash
npm test
npm run build
```

Backend tests cover password hashing, invalid credentials, ownership-scoped project and dataset queries, CSV metadata extraction, malformed files, unsupported types, and the upload-size limit. They use a mocked Prisma client and do not require PostgreSQL. For local application use, PostgreSQL must be running and migrated.

## Week 1 scope

The landing page, signup, login, dashboard, project lifecycle, project overview, dataset upload, metadata, and preview are implemented. Data cleaning, exploratory analysis, AI analyst, and insights/reports are roadmap placeholders; no AI service or generated analysis is included in this milestone.
