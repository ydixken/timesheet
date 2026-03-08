# Timesheet

Self-hosted time tracking for freelancers who want full control over their data. Built to replace Clockify with revenue analytics, per-client PDF exports, and a terminal-inspired UI.

![Dashboard](assets/dashboard.png)

## Why this exists

I needed a simple timesheet app that lets me track hours, see how much I'm earning per client, and generate professional PDF timesheets at the end of each month. Most tools are either SaaS with monthly fees or missing the invoice workflow. So I built my own.

## Features

### Time Tracking

Log your hours with descriptions, project assignments, and billable/non-billable flags. Switch between duration input and start/end time range. Entries are grouped by day with daily totals.

![Tracker](assets/tracker.png)

There's also a **weekly grid view** (spreadsheet-style, projects as rows, days as columns) and a **monthly calendar** with color-coded project bars per day.

### Projects and Clients

Manage clients with contact details. Create projects with hourly rates, budget estimates, and color coding. Track how much time you've spent, how much is billable, and what's left in the budget.

![Projects](assets/projects.png)

### Dashboard

KPI cards for total hours, top project, and top client. A stacked bar chart shows revenue per day broken down by project. The donut chart shows time distribution. Revenue section tracks earnings this month, year-to-date, and per-project with budget progress bars.

### Reports and CSV Export

Summary view grouped by project or client with bar charts and distribution breakdowns. Detailed view with sortable columns and date/project filtering. Export everything to CSV.

### PDF Export

Generate professional PDF timesheets per client per month. Choose between a classic or terminal theme. The generation streams progress in real-time via SSE, and you can preview or download the result.

## Tech Stack

- React 18, Vite, Tailwind CSS v4, Zustand, Recharts
- Fastify, Drizzle ORM, PostgreSQL 16
- Shared TypeScript types and Zod schemas (pnpm monorepo)
- Puppeteer for PDF generation
- Docker multi-stage builds, GitLab CI, Helm chart for Kubernetes
- OIDC or local JWT authentication

## Getting Started

You need Node.js 20+, pnpm 9+, Docker, and optionally [Task](https://taskfile.dev).

```sh
# Clone and install
git clone <repo-url> timesheet
cd timesheet
pnpm install

# Copy environment config
cp .env.example .env

# Start Postgres, run migrations, seed the admin user
task db:up
task shared:build
task db:migrate
task seed

# Start dev servers (in separate terminals)
task backend:dev   # http://localhost:3000
task frontend:dev  # http://localhost:5173
```

## Available Tasks

Run `task --list` to see everything. Here are the ones you'll use most:

| Task | What it does |
|------|-------------|
| `task db:up` | Start PostgreSQL container |
| `task db:reset` | Wipe DB, re-create volume, run migrations |
| `task db:migrate` | Run pending Drizzle migrations |
| `task db:generate` | Generate migration from schema changes |
| `task db:studio` | Open Drizzle Studio |
| `task backend:dev` | Backend with hot reload |
| `task frontend:dev` | Vite dev server |
| `task backend:test` | Run backend tests |
| `task frontend:test` | Run frontend tests |
| `task seed` | Seed admin user |
| `task seed:demo` | Seed demo data (clients, projects, entries) |
| `task docker:build` | Build Docker images locally |
| `task ci:test` | Full lint + test suite (mirrors CI) |

## Project Structure

```
timesheet/
  packages/shared/    Zod schemas and TypeScript types
  apps/backend/       Fastify API, Drizzle ORM, Puppeteer PDF
  apps/frontend/      React SPA (Vite + Tailwind)
  nginx/              Reverse proxy config for Docker Compose
  helm/               Kubernetes Helm chart
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://timesheet:timesheet@localhost:5432/timesheet` | PostgreSQL connection string |
| `AUTH_MODE` | `none` | `none` for local dev, `oidc` for production |
| `JWT_SECRET` | (required) | Secret for signing JWT tokens |
| `JWT_EXPIRY_HOURS` | `24` | Token expiry |
| `ADMIN_USER` | `admin` | Username for seed script |
| `ADMIN_PASS` | `change-me` | Password for seed script |
| `UPLOADS_DIR` | `./uploads` | Client logo storage |
| `PORT` | `3000` | Backend port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |
| `PUPPETEER_NO_SANDBOX` | `false` | Set `true` in containers |

See `.env.example` for the full list including OIDC settings.

## Docker and Deployment

```sh
# Build and run the full stack locally
task docker:build
docker compose up -d
# Access via http://localhost
```

The Compose stack runs Postgres, backend, frontend, and an nginx proxy that routes `/api` to the backend.

For production, GitLab CI builds and pushes images to the container registry on every push to `main`. The Helm chart in `helm/` handles Kubernetes deployment. See `helm/README.md` for the values contract and resource recommendations.

## License

Private. All rights reserved.
