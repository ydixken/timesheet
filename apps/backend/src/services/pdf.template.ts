import type { PdfTheme } from '@timesheet/shared'

export interface PdfDayRow {
  date: string
  hours: string | null
  description: string
  isWeekend: boolean
}

export interface PdfTemplateData {
  freelancerName: string
  projectName: string
  clientName: string
  clientAddress: string | null
  period: string
  periodRange: string
  freelancerLogoUrl: string | null
  clientLogoUrl: string | null
  days: PdfDayRow[]
  totalHours: string
  hourlyRate: string | null
  totalAmount: string | null
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildDayRows(days: PdfDayRow[]): string {
  return days
    .map((day, i) => {
      const bgClass = day.isWeekend
        ? 'weekend'
        : i % 2 === 0
          ? 'even'
          : ''
      return `<tr class="${bgClass}">
        <td class="col-date">${escapeHtml(day.date)}</td>
        <td class="col-hours">${day.hours ? `${escapeHtml(day.hours)}&nbsp;h` : '&mdash;'}</td>
        <td class="col-desc">${escapeHtml(day.description)}</td>
      </tr>`
    })
    .join('\n')
}

function buildClassicPdfHtml(data: PdfTemplateData): string {
  const addressHtml = data.clientAddress
    ? escapeHtml(data.clientAddress).replace(/\n/g, '<br>')
    : ''

  const freelancerLogo = data.freelancerLogoUrl
    ? `<img src="${data.freelancerLogoUrl}" class="logo" alt="Freelancer Logo">`
    : ''

  const clientLogo = data.clientLogoUrl
    ? `<img src="${data.clientLogoUrl}" class="logo" alt="Client Logo">`
    : ''

  const totalSection = data.hourlyRate
    ? `
      <tr>
        <td class="summary-label">Total Hours:</td>
        <td class="summary-value">${escapeHtml(data.totalHours)}&nbsp;h</td>
      </tr>
      <tr>
        <td class="summary-label">Hourly Rate:</td>
        <td class="summary-value">&euro;${escapeHtml(data.hourlyRate)}/h</td>
      </tr>
      <tr class="total-amount">
        <td class="summary-label">Total Amount:</td>
        <td class="summary-value">&euro;${escapeHtml(data.totalAmount!)}</td>
      </tr>`
    : `
      <tr>
        <td class="summary-label">Total Hours:</td>
        <td class="summary-value">${escapeHtml(data.totalHours)}&nbsp;h</td>
      </tr>`

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 12mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 9pt;
    color: #222;
    line-height: 1.3;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 2px solid #333;
  }

  .header-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .header-left .app-logo {
    font-family: "Courier New", Courier, monospace;
    font-size: 14pt;
    font-weight: 700;
    color: #222;
    letter-spacing: -0.5px;
  }

  .header-left .app-logo .tilde {
    color: #39ff14;
  }

  .header-left .app-repo {
    font-family: "Courier New", Courier, monospace;
    font-size: 7pt;
    color: #888;
    display: block;
    margin-top: 1px;
  }

  .header-right {
    flex-shrink: 0;
    text-align: right;
  }

  .logo {
    max-height: 48px;
    max-width: 160px;
    object-fit: contain;
  }

  .doc-title {
    font-size: 13pt;
    font-weight: 700;
    color: #222;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .meta {
    margin-bottom: 10px;
  }

  .meta table {
    border-collapse: collapse;
  }

  .meta td {
    padding: 1px 0;
    vertical-align: top;
  }

  .meta-label {
    font-weight: 600;
    color: #555;
    padding-right: 20px;
    white-space: nowrap;
    width: 80px;
  }

  .meta-value {
    color: #222;
  }

  .entries-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 8px;
    font-size: 7.5pt;
  }

  .entries-table thead th {
    background: #333;
    color: #fff;
    font-weight: 600;
    padding: 3px 6px;
    text-align: left;
    font-size: 7.5pt;
  }

  .entries-table thead th.col-hours {
    text-align: right;
  }

  .entries-table td {
    padding: 2px 6px;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: top;
    line-height: 1.2;
  }

  .entries-table .col-date {
    width: 72px;
    white-space: nowrap;
    font-weight: 500;
  }

  .entries-table .col-hours {
    width: 50px;
    text-align: right;
    white-space: nowrap;
  }

  .entries-table .col-desc {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .entries-table tr.even {
    background: #fafafa;
  }

  .entries-table tr.weekend {
    background: #f0f0f0;
    color: #999;
  }

  .entries-table tr.weekend .col-hours {
    color: #bbb;
  }

  .summary {
    width: 100%;
    margin-bottom: 12px;
  }

  .summary table {
    margin-left: auto;
    border-collapse: collapse;
  }

  .summary-label {
    font-weight: 600;
    color: #555;
    padding: 2px 12px 2px 0;
    text-align: right;
  }

  .summary-value {
    font-weight: 600;
    color: #222;
    padding: 2px 0;
    text-align: right;
    min-width: 80px;
  }

  .total-amount td {
    border-top: 2px solid #333;
    padding-top: 4px;
    font-size: 10pt;
  }

  .signatures {
    page-break-inside: avoid;
  }

  .signature-block {
    display: flex;
    align-items: flex-end;
    gap: 20px;
  }

  .signature-label {
    font-weight: 600;
    color: #555;
    font-size: 8pt;
    white-space: nowrap;
    padding-bottom: 2px;
  }

  .signature-field {
    width: 180px;
  }

  .signature-field .line {
    border-bottom: 1px solid #333;
    height: 1px;
    margin-top: 20px;
  }

  .signature-field .label {
    font-size: 7pt;
    color: #888;
    margin-top: 2px;
  }

  .date-field {
    width: 100px;
  }

  .date-field .line {
    border-bottom: 1px solid #333;
    height: 1px;
    margin-top: 20px;
  }

  .date-field .label {
    font-size: 7pt;
    color: #888;
    margin-top: 2px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <div>
      <span class="app-logo"><span class="tilde">~</span>/timesheet_</span>
      <span class="app-repo">https://gitlab.com/cluster.fail/timesheet</span>
    </div>
    ${freelancerLogo}
  </div>
  <div class="header-right">${clientLogo}</div>
</div>

<div class="doc-title">Timetracking</div>

<div class="meta">
  <table>
    <tr>
      <td class="meta-label">Freelancer:</td>
      <td class="meta-value">${escapeHtml(data.freelancerName)}</td>
    </tr>
    <tr>
      <td class="meta-label">Project:</td>
      <td class="meta-value">${escapeHtml(data.projectName)}</td>
    </tr>
    <tr>
      <td class="meta-label">Client:</td>
      <td class="meta-value">${escapeHtml(data.clientName)}${addressHtml ? `<br>${addressHtml}` : ''}</td>
    </tr>
    <tr>
      <td class="meta-label">Period:</td>
      <td class="meta-value">${escapeHtml(data.period)}&nbsp;&nbsp;(${escapeHtml(data.periodRange)})</td>
    </tr>
  </table>
</div>

<table class="entries-table">
  <thead>
    <tr>
      <th class="col-date">Date</th>
      <th class="col-hours">Hours</th>
      <th class="col-desc">Description</th>
    </tr>
  </thead>
  <tbody>
    ${buildDayRows(data.days)}
  </tbody>
</table>

<div class="summary">
  <table>
    ${totalSection}
  </table>
</div>

<div class="signatures">
  <div class="signature-block">
    <div class="signature-label">Approved by:</div>
    <div class="signature-field">
      <div class="line"></div>
      <div class="label">${escapeHtml(data.projectName)}</div>
    </div>
    <div class="date-field">
      <div class="line"></div>
      <div class="label">Date</div>
    </div>
  </div>
</div>

</body>
</html>`
}

function buildTerminalDayRows(days: PdfDayRow[]): string {
  return days
    .map((day, i) => {
      const lineNo = String(i + 1).padStart(2, '0')
      if (day.isWeekend) {
        return `<tr class="t-weekend">
          <td class="t-gutter">${lineNo}</td>
          <td class="t-date">// ${escapeHtml(day.date)}</td>
          <td class="t-hours">${day.hours ? `${escapeHtml(day.hours)}&nbsp;h` : '---'}</td>
          <td class="t-desc">${day.description ? `// ${escapeHtml(day.description)}` : ''}</td>
        </tr>`
      }
      return `<tr class="t-row${i % 2 === 0 ? ' t-even' : ''}">
        <td class="t-gutter">${lineNo}</td>
        <td class="t-date">${escapeHtml(day.date)}</td>
        <td class="t-hours">${day.hours ? `${escapeHtml(day.hours)}&nbsp;h` : '<span class="t-muted">---</span>'}</td>
        <td class="t-desc">${escapeHtml(day.description)}</td>
      </tr>`
    })
    .join('\n')
}

function buildTerminalPdfHtml(data: PdfTemplateData): string {
  const clientLogo = data.clientLogoUrl
    ? `<img src="${data.clientLogoUrl}" class="t-logo" alt="Client Logo">`
    : ''

  const summaryLines: string[] = [
    `<span class="t-cyan">total_hours</span>  = <span class="t-bold">${escapeHtml(data.totalHours)} h</span>`,
  ]
  if (data.hourlyRate) {
    summaryLines.push(
      `<span class="t-cyan">hourly_rate</span>  = <span class="t-bold">${escapeHtml(data.hourlyRate)} EUR/h</span>`,
      `<span class="t-separator">${'\u2500'.repeat(25)}</span>`,
      `<span class="t-cyan">total_amount</span> = <span class="t-bold">${escapeHtml(data.totalAmount!)} EUR</span>  &lt;&lt;&lt;`,
    )
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');

  @page {
    size: A4 portrait;
    margin: 12mm 12mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    color: #0a0e14;
    line-height: 1.3;
    background: #fff;
  }

  /* --- Header --- */
  .t-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 6px;
    border-bottom: 1px solid #39ff14;
    margin-bottom: 0;
  }

  .t-header-accent {
    height: 2px;
    background: #0a0e14;
    margin-bottom: 14px;
  }

  .t-app-logo {
    font-size: 16pt;
    font-weight: 700;
    color: #0a0e14;
  }

  .t-app-logo .t-tilde {
    color: #39ff14;
  }

  .t-app-repo {
    display: block;
    font-size: 6.5pt;
    color: #888;
    margin-top: 1px;
  }

  .t-logo {
    max-height: 48px;
    max-width: 160px;
    object-fit: contain;
  }

  /* --- Title --- */
  .t-title {
    font-size: 11pt;
    margin-bottom: 12px;
  }

  .t-title .t-prompt {
    color: #39ff14;
  }

  .t-title .t-cmd {
    color: #0a0e14;
    font-weight: 700;
  }

  /* --- Meta --- */
  .t-meta {
    margin-bottom: 12px;
    font-size: 9pt;
  }

  .t-meta table {
    border-collapse: collapse;
  }

  .t-meta td {
    padding: 2px 0;
    vertical-align: top;
  }

  .t-meta-label {
    color: #0a0e14;
    font-weight: 700;
    padding-right: 20px;
    white-space: nowrap;
    width: 110px;
  }

  .t-meta-value {
    color: #0a0e14;
  }

  /* --- Entries table --- */
  .t-entries {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 8pt;
    line-height: 1.3;
  }

  .t-entries thead th {
    background: #0a0e14;
    color: #39ff14;
    font-weight: 700;
    padding: 4px 6px;
    text-align: left;
    font-size: 8pt;
  }

  .t-entries thead th.t-hours {
    text-align: right;
  }

  .t-entries thead th.t-gutter {
    width: 20px;
    background: #0a0e14;
  }

  .t-entries td {
    padding: 3px 6px;
    vertical-align: top;
  }

  .t-entries .t-gutter {
    width: 20px;
    font-size: 6pt;
    color: #ccc;
    text-align: right;
    padding-right: 6px;
    user-select: none;
  }

  .t-entries .t-date {
    width: 72px;
    white-space: nowrap;
    font-weight: 500;
  }

  .t-entries .t-hours {
    width: 50px;
    text-align: right;
    white-space: nowrap;
  }

  .t-entries .t-desc {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .t-entries .t-row {
    border-left: 2px solid #39ff14;
  }

  .t-entries .t-even {
    background: #fafafa;
  }

  .t-entries .t-weekend {
    background: #f5f5f5;
    color: #aaa;
    border-left: 2px solid transparent;
  }

  .t-entries .t-weekend .t-hours {
    color: #ccc;
  }

  .t-muted {
    color: #ccc;
  }

  /* --- Summary --- */
  .t-summary {
    margin-bottom: 14px;
    font-size: 10pt;
    white-space: pre;
  }

  .t-summary-header {
    color: #0a0e14;
  }

  .t-summary-header .t-cyan {
    color: #0a0e14;
  }

  .t-summary-body {
    padding-left: 12px;
  }

  .t-bold {
    color: #0a0e14;
    font-weight: 700;
  }

  .t-green-bold {
    color: #39ff14;
    font-weight: 700;
  }

  .t-cyan {
    color: #0a0e14;
  }

  .t-separator {
    color: #ccc;
  }

  /* --- Signature --- */
  .t-signature {
    font-size: 9pt;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }

  .t-sig-comment {
    color: #888;
    margin-bottom: 4px;
  }

  .t-sig-line {
    display: flex;
    gap: 6px;
    align-items: baseline;
  }

  .t-sig-line .t-prompt-gt {
    color: #39ff14;
    font-weight: 700;
  }

  .t-sig-field {
    border-bottom: 1px solid #0a0e14;
    min-width: 150px;
    display: inline-block;
    margin: 0 4px;
  }

  /* --- Footer --- */
  .t-footer {
    text-align: center;
    font-size: 6pt;
    color: #ddd;
    margin-top: 8px;
  }
</style>
</head>
<body>

<div class="t-header">
  <div>
    <span class="t-app-logo"><span class="t-tilde">~</span>/timesheet_</span>
    <span class="t-app-repo">// gitlab.com/cluster.fail/timesheet</span>
  </div>
  <div>${clientLogo}</div>
</div>
<div class="t-header-accent"></div>

<div class="t-title">
  <span class="t-prompt">$</span> <span class="t-cmd">./report</span> --year ${escapeHtml(data.periodRange.slice(6, 10))} --month ${escapeHtml(data.periodRange.slice(3, 5))}
</div>

<div class="t-meta">
  <table>
    <tr>
      <td class="t-meta-label">[freelancer]</td>
      <td class="t-meta-value">${escapeHtml(data.freelancerName)}</td>
    </tr>
    <tr>
      <td class="t-meta-label">[project]</td>
      <td class="t-meta-value">${escapeHtml(data.projectName)}</td>
    </tr>
    <tr>
      <td class="t-meta-label">[client]</td>
      <td class="t-meta-value">${escapeHtml(data.clientName)}</td>
    </tr>
    <tr>
      <td class="t-meta-label">[period]</td>
      <td class="t-meta-value">${escapeHtml(data.period)}&nbsp;&nbsp;(${escapeHtml(data.periodRange)})</td>
    </tr>
  </table>
</div>

<table class="t-entries">
  <thead>
    <tr>
      <th class="t-gutter"></th>
      <th class="t-date">[date]</th>
      <th class="t-hours">[hours]</th>
      <th class="t-desc">[desc]</th>
    </tr>
  </thead>
  <tbody>
    ${buildTerminalDayRows(data.days)}
  </tbody>
</table>

<div class="t-summary">
  <div class="t-summary-header">---[ <span class="t-cyan">summary</span> ]---</div>
  <div class="t-summary-body">${summaryLines.join('\n  ')}</div>
</div>

<div class="t-signature">
  <div class="t-sig-comment">// sign-off</div>
  <div class="t-sig-line">
    <span class="t-prompt-gt">&gt;</span> approved_by: <span class="t-sig-field"></span> date: <span class="t-sig-field" style="min-width:100px"></span>
  </div>
</div>

<div class="t-footer">EOF</div>

</body>
</html>`
}

export function buildPdfHtml(data: PdfTemplateData, theme: PdfTheme = 'classic'): string {
  return theme === 'terminal' ? buildTerminalPdfHtml(data) : buildClassicPdfHtml(data)
}
