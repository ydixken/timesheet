---
name: timesheet-cc-deploy
description: Commit, push to GitLab, watch CI pipeline, and roll out to Kubernetes
user_invocable: true
---

# Timesheet Commit & Deploy

This skill commits the current changes, pushes to GitLab, monitors the CI pipeline, and watches the rollout on the Kubernetes cluster.

## Steps

### 1. Commit

Use the `/commit` skill to create a commit for the staged/unstaged changes. If there are no changes to commit, skip to step 3 (watch latest pipeline).

### 2. Push

Push the current branch to origin:

```bash
git push origin HEAD
```

If pushing to `main`, **ask the user for confirmation first** — this triggers CI and deploys to production.

### 3. Watch CI Pipeline

After pushing, monitor the GitLab CI pipeline using `glab`:

```bash
glab ci status --live --branch main
```

Wait for the pipeline to complete. If any job fails:
- Fetch the job logs with `glab ci view`
- Diagnose the failure and report it to the user
- Do NOT automatically fix and re-push without user approval

### 4. Watch Kubernetes Rollout

Once the CI pipeline succeeds (specifically the `docker-build` stage), the new images are pushed to the GitLab registry with the `:latest` tag. Restart the deployments to pull the new images and watch the rollout:

```bash
kubectl rollout restart deployment/timesheet-backend -n timesheet
kubectl rollout restart deployment/timesheet-frontend -n timesheet
```

Then watch both rollouts:

```bash
kubectl rollout status deployment/timesheet-backend -n timesheet --timeout=120s
kubectl rollout status deployment/timesheet-frontend -n timesheet --timeout=120s
```

### 5. Verify

After rollout completes, verify the pods are running:

```bash
kubectl get pods -n timesheet -l app.kubernetes.io/instance=timesheet
```

Report the final status to the user, including:
- Commit SHA
- Pipeline URL (from `glab ci status`)
- Pod status

## Cluster Details

- **kubectl context**: `cloudcats-ber`
- **Namespace**: `timesheet`
- **GitLab runner namespace**: `gitlab-runner-cluster-fail`
- **Deployments**: `timesheet-backend`, `timesheet-frontend`
- **Registry**: `registry.gitlab.com/cluster.fail/timesheet/{backend,frontend}`
- **Domain**: `timesheet.dixken.de`
