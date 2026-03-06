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

export function buildPdfHtml(data: PdfTemplateData): string {
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
