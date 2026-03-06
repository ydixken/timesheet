# Timesheet App — Task Tracker

## Phase 1 — Monorepo Foundation [DONE]
- [x] Root config: pnpm-workspace.yaml, package.json, tsconfig.base.json, .gitignore
- [x] packages/shared — Zod schemas + TypeScript types
- [x] apps/backend — Fastify scaffold, DB connection, Drizzle schema, first migration
- [x] apps/frontend — Vite + React + Tailwind scaffold, design tokens, Login page
- [x] docker-compose.yml + Taskfile basics
- [x] CI pipeline: lint + test stages only

## Phase 2 — Auth + Core Time Entry [DONE]
- [x] Backend: auth routes (login/logout/me), JWT middleware
- [x] Backend: CRUD for clients, projects, tasks, time entries
- [x] Frontend: protected route wrapper, JWT cookie handling
- [x] Frontend: Time Tracker page
- [x] Frontend: Timesheet weekly grid page
- [ ] Unit tests for entry duration logic + aggregation queries

## Phase 3 — Analytics & Dashboard [DONE]
- [x] Backend: dashboard aggregation queries
- [x] Backend: revenue calculations
- [x] Backend: reports endpoints (summary, detailed, weekly, CSV)
- [x] Frontend: Dashboard page
- [x] Frontend: Reports page
- [x] Frontend: Calendar view

## Phase 4 — Projects & Clients [DONE]
- [x] Frontend: Projects list + project detail
- [x] Frontend: Clients management page
- [x] Logo upload flow
- [x] Progress bars for budget tracking

## Phase 5 — PDF Export [DONE]
- [x] pdf.template.ts — HTML builder
- [x] pdf.service.ts — Puppeteer integration
- [x] PDF route
- [x] Frontend: Export PDF button + preview modal
- [ ] Thorough testing (requires running DB + server)

## Phase 6 — Hardening & Deploy Prep [DONE]
- [x] Health check endpoints
- [x] Graceful shutdown
- [x] Integration tests (26 passing: 12 schema + 14 time utility)
- [x] seed.ts script
- [x] Full CI pipeline (lint → test → docker-build → deploy)
- [x] Helm values README
- [x] Project README
- [x] Initial Drizzle migration generated
