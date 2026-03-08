import { db } from './db/index.js'
import { clients, projects, tasks, timeEntries } from './db/schema.js'

async function seedDemoData() {
  console.log('Clearing existing demo data...')
  await db.delete(timeEntries)
  await db.delete(tasks)
  await db.delete(projects)
  await db.delete(clients)

  // ── Clients ──────────────────────────────────────────────────────────
  console.log('Inserting clients...')
  const [finops, cloudscale, meditech, internal] = await db
    .insert(clients)
    .values([
      {
        name: 'FinOps GmbH',
        email: 'kontakt@finops.de',
        address: 'Berliner Str. 42, 10115 Berlin',
      },
      {
        name: 'CloudScale AG',
        email: 'info@cloudscale.ch',
        address: 'Bahnhofstr. 12, 8001 Zurich',
      },
      {
        name: 'MediTech Solutions',
        email: 'ops@meditech.io',
        address: 'Kaiserstr. 88, 60329 Frankfurt',
      },
      {
        name: 'Internal',
        email: 'demo@invalid.com',
      },
    ])
    .returning()

  // ── Projects ─────────────────────────────────────────────────────────
  console.log('Inserting projects...')
  const [k8s, terraform, cicd, monitoring, incident, internalProject] = await db
    .insert(projects)
    .values([
      {
        clientId: finops.id,
        name: 'K8s Platform Migration',
        color: '#39ff14',
        hourlyRate: '130.00',
        estimatedHours: '160.00',
      },
      {
        clientId: finops.id,
        name: 'Terraform Modules',
        color: '#00d9ff',
        hourlyRate: '120.00',
        estimatedHours: '80.00',
      },
      {
        clientId: cloudscale.id,
        name: 'CI/CD Pipeline Overhaul',
        color: '#ff6b6b',
        hourlyRate: '140.00',
        estimatedHours: '120.00',
      },
      {
        clientId: meditech.id,
        name: 'Monitoring Stack',
        color: '#ffd93d',
        hourlyRate: '110.00',
        estimatedHours: '60.00',
      },
      {
        clientId: meditech.id,
        name: 'Incident Response Retainer',
        color: '#c084fc',
        hourlyRate: '150.00',
        estimatedHours: '40.00',
      },
      {
        clientId: internal.id,
        name: 'Internal Tooling & Admin',
        color: '#ff8c42',
        billable: false,
      },
    ])
    .returning()

  // ── Tasks ────────────────────────────────────────────────────────────
  console.log('Inserting tasks...')
  const insertedTasks = await db
    .insert(tasks)
    .values([
      // K8s Platform Migration
      { projectId: k8s.id, name: 'Cluster setup & networking' },
      { projectId: k8s.id, name: 'Workload migration' },
      { projectId: k8s.id, name: 'Documentation' },
      // Terraform Modules
      { projectId: terraform.id, name: 'Module development' },
      { projectId: terraform.id, name: 'State migration' },
      // CI/CD Pipeline Overhaul
      { projectId: cicd.id, name: 'Pipeline design' },
      { projectId: cicd.id, name: 'Runner infrastructure' },
      { projectId: cicd.id, name: 'Secret management' },
      // Monitoring Stack
      { projectId: monitoring.id, name: 'Grafana dashboards' },
      { projectId: monitoring.id, name: 'Alert rules' },
      // Incident Response Retainer
      { projectId: incident.id, name: 'On-call support' },
      { projectId: incident.id, name: 'Post-mortem analysis' },
      // Internal
      { projectId: internalProject.id, name: 'Timesheet app development', billable: false },
      { projectId: internalProject.id, name: 'Invoicing & accounting', billable: false },
    ])
    .returning()

  // Build task lookup by name for easy referencing
  const t = Object.fromEntries(insertedTasks.map((task) => [task.name, task]))

  // ── Time Entries ─────────────────────────────────────────────────────
  console.log('Inserting time entries...')

  // February 2026 weekdays: Mon-Fri
  // Week 1: Feb 2-6, Week 2: Feb 9-13, Week 3: Feb 16-20, Week 4: Feb 23-27
  const entries = [
    // ── Week 1: Feb 2-6 ──────────────────────────────────────────────
    // Monday Feb 2
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Initial cluster provisioning with kubeadm', date: '2026-02-02', startTime: '08:30', endTime: '11:00', durationMin: 150 },
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Configure Calico CNI and network policies', date: '2026-02-02', startTime: '11:30', endTime: '13:30', durationMin: 120 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Scaffold VPC module for multi-region setup', date: '2026-02-02', startTime: '14:00', endTime: '16:00', durationMin: 120 },
    { projectId: internalProject.id, taskId: t['Invoicing & accounting'].id, description: 'Prepare January invoices', date: '2026-02-02', durationMin: 60, billable: false },

    // Tuesday Feb 3
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Set up MetalLB load balancer', date: '2026-02-03', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Analyze existing CI pipelines and identify bottlenecks', date: '2026-02-03', startTime: '12:00', endTime: '14:30', durationMin: 150, billable: false },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Draft pipeline architecture for GitLab CI', date: '2026-02-03', startTime: '15:00', endTime: '17:00', durationMin: 120 },

    // Wednesday Feb 4
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Migrate authentication service to new cluster', date: '2026-02-04', startTime: '08:00', endTime: '10:30', durationMin: 150 },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Install Prometheus stack with Helm', date: '2026-02-04', startTime: '11:00', endTime: '13:00', durationMin: 120 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Implement S3 backend with DynamoDB locking', date: '2026-02-04', startTime: '14:00', endTime: '16:30', durationMin: 150 },

    // Thursday Feb 5
    { projectId: cicd.id, taskId: t['Runner infrastructure'].id, description: 'Deploy self-hosted GitLab runners on Kubernetes', date: '2026-02-05', startTime: '09:00', endTime: '12:00', durationMin: 180 },
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Configure Ingress NGINX and TLS certificates', date: '2026-02-05', startTime: '13:00', endTime: '15:30', durationMin: 150 },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Build node health dashboard in Grafana', date: '2026-02-05', durationMin: 90 },

    // Friday Feb 6
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Migrate payment service and run integration tests', date: '2026-02-06', startTime: '09:00', endTime: '12:00', durationMin: 180 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Create EKS module with managed node groups', date: '2026-02-06', startTime: '13:00', endTime: '15:00', durationMin: 120 },
    { projectId: internalProject.id, taskId: t['Timesheet app development'].id, description: 'Fix dashboard chart rendering issue', date: '2026-02-06', durationMin: 45, billable: false },

    // ── Week 2: Feb 9-13 ─────────────────────────────────────────────
    // Monday Feb 9
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Implement multi-stage Docker builds for microservices', date: '2026-02-09', startTime: '08:30', endTime: '11:30', durationMin: 180 },
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Migrate notification service with zero-downtime strategy', date: '2026-02-09', startTime: '12:00', endTime: '14:30', durationMin: 150 },
    { projectId: terraform.id, taskId: t['State migration'].id, description: 'Plan state migration from local to remote backend', date: '2026-02-09', durationMin: 90, billable: false },

    // Tuesday Feb 10
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Configure pod security standards and RBAC', date: '2026-02-10', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Secret management'].id, description: 'Set up HashiCorp Vault for CI/CD secret injection', date: '2026-02-10', startTime: '12:00', endTime: '15:00', durationMin: 180 },
    { projectId: monitoring.id, taskId: t['Alert rules'].id, description: 'Define Prometheus alerting rules for SLOs', date: '2026-02-10', durationMin: 90, billable: false },

    // Wednesday Feb 11
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Set up ArgoCD for GitOps-based deployments', date: '2026-02-11', startTime: '08:00', endTime: '11:00', durationMin: 180 },
    { projectId: cicd.id, taskId: t['Runner infrastructure'].id, description: 'Implement Docker build caching with kaniko', date: '2026-02-11', startTime: '11:30', endTime: '14:00', durationMin: 150 },
    { projectId: incident.id, taskId: t['On-call support'].id, description: 'Investigate OOM kills on production nodes', date: '2026-02-11', startTime: '15:00', endTime: '17:30', durationMin: 150 },

    // Thursday Feb 12
    { projectId: terraform.id, taskId: t['State migration'].id, description: 'Execute state migration for VPC and EKS resources', date: '2026-02-12', startTime: '09:00', endTime: '12:00', durationMin: 180 },
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Write runbook for cluster node scaling procedures', date: '2026-02-12', startTime: '13:00', endTime: '15:00', durationMin: 120, billable: false },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Create API latency and error rate dashboard', date: '2026-02-12', durationMin: 120 },

    // Friday Feb 13
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Create reusable CI template for Go microservices', date: '2026-02-13', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Migrate frontend services and verify DNS routing', date: '2026-02-13', startTime: '12:00', endTime: '14:00', durationMin: 120 },
    { projectId: internalProject.id, taskId: t['Timesheet app development'].id, description: 'Add PDF export feature to timesheet app', date: '2026-02-13', durationMin: 90, billable: false },

    // Saturday Feb 14 (light incident work)
    { projectId: incident.id, taskId: t['On-call support'].id, description: 'On-call: respond to database failover alert', date: '2026-02-14', startTime: '10:00', endTime: '12:00', durationMin: 120 },

    // ── Week 3: Feb 16-20 ────────────────────────────────────────────
    // Monday Feb 16
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Configure HPA and resource limits for all workloads', date: '2026-02-16', startTime: '08:30', endTime: '11:00', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Secret management'].id, description: 'Implement Vault agent sidecar for Kubernetes pods', date: '2026-02-16', startTime: '11:30', endTime: '14:00', durationMin: 150 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Add CloudWatch monitoring to EKS module', date: '2026-02-16', durationMin: 120 },

    // Tuesday Feb 17
    { projectId: monitoring.id, taskId: t['Alert rules'].id, description: 'Set up PagerDuty integration for critical alerts', date: '2026-02-17', startTime: '09:00', endTime: '11:00', durationMin: 120 },
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Set up Velero for cluster backup and disaster recovery', date: '2026-02-17', startTime: '11:30', endTime: '14:30', durationMin: 180 },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Add SAST and container scanning to CI pipeline', date: '2026-02-17', startTime: '15:00', endTime: '17:00', durationMin: 120 },

    // Wednesday Feb 18
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Migrate batch processing jobs to CronJobs', date: '2026-02-18', startTime: '08:00', endTime: '10:30', durationMin: 150 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Implement RDS module with read replicas', date: '2026-02-18', startTime: '11:00', endTime: '13:30', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Runner infrastructure'].id, description: 'Optimize runner autoscaling with KEDA', date: '2026-02-18', durationMin: 120 },

    // Thursday Feb 19
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Document network policies and security baseline', date: '2026-02-19', startTime: '09:00', endTime: '11:00', durationMin: 120, billable: false },
    { projectId: incident.id, taskId: t['Post-mortem analysis'].id, description: 'Write post-mortem for Feb 14 database failover', date: '2026-02-19', startTime: '11:30', endTime: '13:30', durationMin: 120 },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Build SLO compliance dashboard with burn rate', date: '2026-02-19', startTime: '14:00', endTime: '16:00', durationMin: 120 },
    { projectId: internalProject.id, taskId: t['Invoicing & accounting'].id, description: 'Review and send client invoices', date: '2026-02-19', durationMin: 45, billable: false },

    // Friday Feb 20
    { projectId: cicd.id, taskId: t['Secret management'].id, description: 'Create Vault policies and AppRole auth for services', date: '2026-02-20', startTime: '09:00', endTime: '12:00', durationMin: 180 },
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Final migration of API gateway and traffic cutover', date: '2026-02-20', startTime: '13:00', endTime: '16:00', durationMin: 180 },

    // ── Week 4: Feb 23-27 ────────────────────────────────────────────
    // Monday Feb 23
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Validate all services healthy on new cluster', date: '2026-02-23', startTime: '08:30', endTime: '11:00', durationMin: 150 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Write Terratest integration tests for modules', date: '2026-02-23', startTime: '11:30', endTime: '14:00', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Implement canary deployment pipeline stage', date: '2026-02-23', durationMin: 120 },

    // Tuesday Feb 24
    { projectId: monitoring.id, taskId: t['Alert rules'].id, description: 'Fine-tune alert thresholds based on baseline data', date: '2026-02-24', startTime: '09:00', endTime: '11:00', durationMin: 120 },
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Create architecture diagram and migration guide', date: '2026-02-24', startTime: '11:30', endTime: '14:00', durationMin: 150, billable: false },
    { projectId: cicd.id, taskId: t['Runner infrastructure'].id, description: 'Implement spot instance runners for cost optimization', date: '2026-02-24', startTime: '14:30', endTime: '17:00', durationMin: 150 },

    // Wednesday Feb 25
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Create IAM module with least-privilege policies', date: '2026-02-25', startTime: '08:00', endTime: '10:30', durationMin: 150 },
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Implement network segmentation with Cilium', date: '2026-02-25', startTime: '11:00', endTime: '13:30', durationMin: 150 },
    { projectId: incident.id, taskId: t['On-call support'].id, description: 'On-call: debug intermittent pod evictions', date: '2026-02-25', durationMin: 90 },

    // Thursday Feb 26
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Create end-to-end test pipeline with ephemeral envs', date: '2026-02-26', startTime: '09:00', endTime: '12:00', durationMin: 180 },
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Write disaster recovery playbook', date: '2026-02-26', startTime: '13:00', endTime: '15:00', durationMin: 120, billable: false },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Build cost monitoring dashboard for cloud spend', date: '2026-02-26', durationMin: 90 },

    // Friday Feb 27
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Final security audit and penetration test review', date: '2026-02-27', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Document all modules and publish to internal registry', date: '2026-02-27', startTime: '12:00', endTime: '14:00', durationMin: 120 },
    { projectId: cicd.id, taskId: t['Secret management'].id, description: 'Security review of secret rotation procedures', date: '2026-02-27', startTime: '14:30', endTime: '16:00', durationMin: 90 },
    { projectId: internalProject.id, taskId: t['Timesheet app development'].id, description: 'Implement calendar view for timesheet app', date: '2026-02-27', durationMin: 60, billable: false },

    // ── March 2026: Week 1 (Mar 2-6) ────────────────────────────────
    // Monday Mar 2
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Monitor new cluster performance post-migration', date: '2026-03-02', startTime: '08:30', endTime: '11:00', durationMin: 150 },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Onboard remaining teams to new CI templates', date: '2026-03-02', startTime: '11:30', endTime: '14:00', durationMin: 150 },
    { projectId: monitoring.id, taskId: t['Grafana dashboards'].id, description: 'Add business metrics dashboard for product team', date: '2026-03-02', durationMin: 120 },

    // Tuesday Mar 3
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Implement Route53 DNS module with health checks', date: '2026-03-03', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Conduct knowledge transfer session for ops team', date: '2026-03-03', startTime: '13:00', endTime: '15:30', durationMin: 150, billable: false },
    { projectId: cicd.id, taskId: t['Runner infrastructure'].id, description: 'Implement ARM64 runner pool for cost savings', date: '2026-03-03', durationMin: 120 },

    // Wednesday Mar 4
    { projectId: k8s.id, taskId: t['Cluster setup & networking'].id, description: 'Upgrade Istio service mesh to latest stable', date: '2026-03-04', startTime: '08:00', endTime: '10:30', durationMin: 150 },
    { projectId: monitoring.id, taskId: t['Alert rules'].id, description: 'Implement anomaly detection alerts for traffic spikes', date: '2026-03-04', startTime: '11:00', endTime: '13:00', durationMin: 120 },
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Add tagging strategy module for cost allocation', date: '2026-03-04', startTime: '14:00', endTime: '16:00', durationMin: 120 },

    // Thursday Mar 5
    { projectId: cicd.id, taskId: t['Secret management'].id, description: 'Rotate all service credentials and update Vault', date: '2026-03-05', startTime: '09:00', endTime: '11:30', durationMin: 150 },
    { projectId: k8s.id, taskId: t['Workload migration'].id, description: 'Decommission old cluster nodes and clean up resources', date: '2026-03-05', startTime: '12:00', endTime: '14:30', durationMin: 150 },
    { projectId: incident.id, taskId: t['On-call support'].id, description: 'On-call: investigate latency spike on API gateway', date: '2026-03-05', durationMin: 90 },

    // Friday Mar 6
    { projectId: terraform.id, taskId: t['Module development'].id, description: 'Review and merge community PRs for shared modules', date: '2026-03-06', startTime: '09:00', endTime: '11:00', durationMin: 120 },
    { projectId: cicd.id, taskId: t['Pipeline design'].id, description: 'Add deployment notification hooks to Slack', date: '2026-03-06', startTime: '11:30', endTime: '13:30', durationMin: 120 },
    { projectId: k8s.id, taskId: t['Documentation'].id, description: 'Update architecture docs with post-migration topology', date: '2026-03-06', startTime: '14:00', endTime: '16:00', durationMin: 120 },
    { projectId: internalProject.id, taskId: t['Invoicing & accounting'].id, description: 'Prepare February invoices for all clients', date: '2026-03-06', durationMin: 60, billable: false },
  ]

  await db.insert(timeEntries).values(entries)

  const totalMinutes = entries.reduce((sum, e) => sum + e.durationMin, 0)
  const totalHours = (totalMinutes / 60).toFixed(1)
  console.log(`Demo data seeded: ${entries.length} entries, ${totalHours}h total across Feb-Mar 2026`)
  process.exit(0)
}

seedDemoData().catch((err) => {
  console.error('Demo seed failed:', err)
  process.exit(1)
})
