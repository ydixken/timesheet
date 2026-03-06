# Timesheet Helm Chart

> **Note:** This directory is a placeholder. Yannick writes the Helm charts.
> This README documents the expected values contract for the chart.

## Expected values.yaml

```yaml
backend:
  image:
    repository: registry.gitlab.com/<group>/timesheet/backend
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 3000
  env:
    NODE_ENV: production
    JWT_EXPIRY_HOURS: "24"
    UPLOADS_DIR: /uploads
    MAX_UPLOAD_SIZE_MB: "5"
    PUPPETEER_NO_SANDBOX: "true"
    CORS_ORIGIN: https://timesheet.dixken.de
  resources:
    requests:
      cpu: 100m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 768Mi    # Puppeteer needs headroom
  persistence:
    uploads:
      enabled: true
      size: 1Gi
      mountPath: /uploads

frontend:
  image:
    repository: registry.gitlab.com/<group>/timesheet/frontend
    tag: latest
    pullPolicy: IfNotPresent
  replicas: 1
  port: 80
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 200m
      memory: 128Mi

ingress:
  enabled: true
  className: nginx
  host: timesheet.dixken.de
  tls:
    enabled: true
    secretName: timesheet-tls

postgresql:
  # Use bitnami/postgresql subchart or set external
  enabled: true
  auth:
    database: timesheet
    username: timesheet
    existingSecret: timesheet-db-secret
    secretKeys:
      userPasswordKey: password
  primary:
    persistence:
      size: 5Gi
```

## Required Kubernetes Secrets

### `timesheet-secret`

| Key | Description |
|-----|-------------|
| `JWT_SECRET` | Secret for signing JWT tokens |
| `ADMIN_USER` | Admin username (used by seed job) |
| `ADMIN_PASS` | Admin password (used by seed job) |

### `timesheet-db-secret`

| Key | Description |
|-----|-------------|
| `password` | PostgreSQL user password |
| `DATABASE_URL` | Full connection string (`postgres://user:pass@host:5432/db`) |

## Health Check Endpoints

- **Liveness:** `GET /api/health` -> `200`
- **Readiness:** `GET /api/health/ready` -> `200`

## Resource Recommendations

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-----------|-----------|--------------|------------|
| Backend | 100m | 500m | 256Mi | 768Mi |
| Frontend | 50m | 200m | 64Mi | 128Mi |

The backend memory limit is higher than typical Node.js apps because Puppeteer spawns a headless Chromium process for PDF generation.

## Notes

- Backend uses Puppeteer (headless Chrome) for PDF export — container needs `--no-sandbox` flag and sufficient memory
- File uploads are stored on a PVC mounted at `UPLOADS_DIR` (`/uploads`)
- PostgreSQL can be deployed as a bitnami subchart or configured as an external database
- The frontend is a static SPA served by nginx; API requests to `/api` are proxied to the backend
- TLS is expected to be handled by cert-manager or a similar controller
