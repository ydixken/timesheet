# Timesheet

Self-hosted timesheet application for freelance time tracking, revenue analytics, and PDF export. Built as a replacement for Clockify with a focus on professional invoice-ready PDF timesheets per customer per month.

## Features

- Time tracker with chronological entry list
- Weekly timesheet grid view
- Monthly calendar view
- Dashboard with analytics and revenue tracking
- Reports (summary, detailed, CSV export)
- Projects and clients management with budget tracking
- Professional PDF timesheet export per customer per month
- Single-user authentication (JWT)

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS v4, Zustand, Recharts
- **Backend:** Fastify, Drizzle ORM, PostgreSQL 16
- **Shared:** TypeScript monorepo (pnpm workspaces) with Zod schemas
- **PDF:** Puppeteer (headless Chrome)
- **Infrastructure:** Docker, GitLab CI, Kubernetes (Helm)

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose
- [Task](https://taskfile.dev) (optional but recommended)

## Getting Started

### 1. Clone and install

```sh
git clone <repo-url> timesheet
cd timesheet
pnpm install
```

### 2. Start the database

```sh
task db:up
# or without Task:
docker compose up -d db
```

### 3. Build the shared package

```sh
task shared:build
# or: pnpm --filter @timesheet/shared build
```

### 4. Generate and run migrations

```sh
task db:generate
task db:migrate
```

### 5. Seed the admin user

```sh
cp .env.example .env
# Edit .env — set ADMIN_USER and ADMIN_PASS
task seed
```

### 6. Start development servers

In separate terminals:

```sh
task backend:dev   # http://localhost:3000
task frontend:dev  # http://localhost:5173
```

Visit [http://localhost:5173](http://localhost:5173).

## Available Tasks

Run `task --list` to see all targets. Key tasks:

| Task | Description |
|------|-------------|
| `task dev` | Start DB, then instructions for backend + frontend |
| `task db:up` | Start PostgreSQL container |
| `task db:down` | Stop PostgreSQL container |
| `task db:reset` | Wipe DB volume and re-migrate |
| `task db:migrate` | Run pending Drizzle migrations |
| `task db:generate` | Generate new migration from schema changes |
| `task db:studio` | Open Drizzle Studio |
| `task backend:dev` | Run backend with tsx watch |
| `task backend:build` | Compile backend TypeScript |
| `task backend:test` | Run backend tests |
| `task backend:lint` | Lint + type-check backend |
| `task frontend:dev` | Start Vite dev server |
| `task frontend:build` | Build production frontend |
| `task frontend:test` | Run frontend tests |
| `task frontend:lint` | Lint + type-check frontend |
| `task shared:build` | Build shared package |
| `task docker:build` | Build all Docker images locally |
| `task docker:push` | Tag and push images (set VERSION and REGISTRY) |
| `task ci:test` | Full test suite (mirrors CI) |
| `task seed` | Seed admin user |

## Project Structure

```
timesheet/
  packages/shared/    — Zod schemas and TypeScript types (single source of truth)
  apps/backend/       — Fastify API server
  apps/frontend/      — React SPA (Vite)
  nginx/              — Nginx reverse proxy config (docker compose)
  helm/               — Kubernetes Helm chart (placeholder)
  tasks/              — Task tracking and lessons
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://timesheet:timesheet@localhost:5432/timesheet` | PostgreSQL connection string |
| `JWT_SECRET` | — | Secret for signing JWT tokens (required) |
| `JWT_EXPIRY_HOURS` | `24` | JWT token expiry in hours |
| `ADMIN_USER` | `yannick` | Username for seed script |
| `ADMIN_PASS` | — | Password for seed script |
| `UPLOADS_DIR` | `./uploads` | Directory for file uploads |
| `MAX_UPLOAD_SIZE_MB` | `5` | Max upload file size in MB |
| `PORT` | `3000` | Backend server port |
| `NODE_ENV` | `development` | Node environment |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `PUPPETEER_NO_SANDBOX` | `false` | Disable Chromium sandbox (set `true` in containers) |

## Docker

Build and run the full stack with Docker Compose:

```sh
# Build images
task docker:build
# or: docker build -t timesheet-backend:local -f apps/backend/Dockerfile .
#     docker build -t timesheet-frontend:local -f apps/frontend/Dockerfile .

# Run everything (DB + backend + frontend + nginx)
docker compose up -d

# Access via http://localhost
```

The compose stack includes PostgreSQL, backend, frontend, and an nginx reverse proxy that routes `/api` to the backend and everything else to the frontend.

## Deployment

- Docker images are built by GitLab CI on pushes to `main`
- Images are pushed to the GitLab built-in container registry
- Helm chart in `helm/` for Kubernetes deployment (see `helm/README.md`)
- Target domain: `timesheet.dixken.de`

## PDF Export

The backend uses Puppeteer to render professional PDF timesheets. Each PDF covers one customer for one month, showing daily time entries, totals, and rates. PDFs are generated on-demand via the API and can be downloaded from the reports view in the frontend.

## License

Private — All rights reserved.
