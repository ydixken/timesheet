# Timesheet Helm Chart

Deploys the timesheet app (backend + frontend) on Kubernetes with ingress, TLS, and persistent storage for uploads.

## Quick Start

```sh
helm install timesheet ./helm/timesheet \
  --set ingress.host=timesheet.example.com \
  --set backend.env.CORS_ORIGIN=https://timesheet.example.com \
  --set backend.env.OIDC_ISSUER_URL=https://keycloak.example.com/realms/main \
  --set backend.env.OIDC_CLIENT_ID=timesheet
```

You'll also need to create the required secrets before installing (see below).

## values.yaml

```yaml
imagePullSecrets: []

backend:
  image:
    repository: registry.gitlab.com/cluster.fail/timesheet/backend
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 3000
  env:
    NODE_ENV: production
    AUTH_MODE: oidc
    OIDC_ISSUER_URL: ""
    OIDC_CLIENT_ID: timesheet
    UPLOADS_DIR: /uploads
    MAX_UPLOAD_SIZE_MB: "5"
    PUPPETEER_NO_SANDBOX: "true"
    CORS_ORIGIN: ""
  secretEnv:
    DATABASE_URL:
      secretName: timesheet-postgresql
      key: DATABASE_URL
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      memory: 768Mi    # Puppeteer needs headroom for PDF generation
  persistence:
    uploads:
      enabled: true
      size: 1Gi
      mountPath: /uploads

frontend:
  image:
    repository: registry.gitlab.com/cluster.fail/timesheet/frontend
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 80
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      memory: 128Mi

ingress:
  enabled: true
  className: nginx
  host: ""
  annotations: {}
  tls:
    enabled: true
    secretName: timesheet-tls
```

All values under `backend.env` are passed as environment variables to the backend container. Values under `backend.secretEnv` are injected from Kubernetes secrets using `valueFrom.secretKeyRef`.

## Required Kubernetes Secrets

Create these before running `helm install`.

### `timesheet-postgresql`

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Full PostgreSQL connection string (`postgres://user:pass@host:5432/timesheet`) |

This can come from a PostgreSQL operator, a bitnami subchart, or a manually created secret for an external database.

## Authentication

The chart defaults to OIDC authentication (`AUTH_MODE: oidc`). Set `OIDC_ISSUER_URL` and `OIDC_CLIENT_ID` to your identity provider. The backend validates JWT tokens using the provider's JWKS endpoint.

For local dev or testing, set `AUTH_MODE: none` to skip authentication entirely.

## Health Check Endpoints

Both are used for liveness and readiness probes in the deployment templates.

| Probe | Endpoint | Success |
|-------|----------|---------|
| Liveness | `GET /api/health` | `200` |
| Readiness | `GET /api/health/ready` | `200` (checks DB connectivity) |

## Resource Recommendations

| Component | CPU Request | Memory Request | Memory Limit | Notes |
|-----------|------------|----------------|-------------|-------|
| Backend | 100m | 256Mi | 768Mi | Puppeteer spawns headless Chromium for PDF export |
| Frontend | 50m | 64Mi | 128Mi | Static SPA served by nginx |

## Architecture

- The **frontend** is a static React SPA served by nginx. The ingress routes `/` to the frontend service.
- The **backend** is a Fastify Node.js API. The ingress routes `/api` to the backend service.
- **File uploads** (client logos) are stored on a PVC mounted at `/uploads`.
- **PDF generation** uses Puppeteer with headless Chromium inside the backend container. The `PUPPETEER_NO_SANDBOX` flag must be `true` in containers, and the memory limit should stay at 768Mi or higher.
- **TLS** is expected to be handled by cert-manager or a similar controller. Set `ingress.tls.secretName` to match your certificate secret.

## Templates

| Template | What it creates |
|----------|----------------|
| `backend-deployment.yaml` | Backend deployment with env vars, secret refs, upload volume mount |
| `backend-service.yaml` | ClusterIP service on port 3000 |
| `frontend-deployment.yaml` | Frontend deployment (nginx) |
| `frontend-service.yaml` | ClusterIP service on port 80 |
| `ingress.yaml` | Ingress with path-based routing (`/api` to backend, `/` to frontend) |
| `pvc-uploads.yaml` | PersistentVolumeClaim for file uploads |
