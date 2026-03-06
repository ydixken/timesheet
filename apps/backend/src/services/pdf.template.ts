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
    margin: 20mm 15mm;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 10pt;
    color: #222;
    line-height: 1.4;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 2px solid #333;
  }

  .header-left {
    flex: 1;
  }

  .header-right {
    flex-shrink: 0;
    text-align: right;
  }

  .logo {
    max-height: 60px;
    max-width: 180px;
    object-fit: contain;
  }

  .meta {
    margin-bottom: 18px;
  }

  .meta table {
    border-collapse: collapse;
  }

  .meta td {
    padding: 2px 0;
    vertical-align: top;
  }

  .meta-label {
    font-weight: 600;
    color: #555;
    padding-right: 16px;
    white-space: nowrap;
  }

  .meta-value {
    color: #222;
  }

  .entries-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 16px;
    font-size: 9pt;
  }

  .entries-table thead th {
    background: #333;
    color: #fff;
    font-weight: 600;
    padding: 6px 8px;
    text-align: left;
    font-size: 9pt;
  }

  .entries-table thead th.col-hours {
    text-align: right;
  }

  .entries-table td {
    padding: 4px 8px;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: top;
  }

  .entries-table .col-date {
    width: 80px;
    white-space: nowrap;
    font-weight: 500;
  }

  .entries-table .col-hours {
    width: 65px;
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
    margin-bottom: 30px;
  }

  .summary table {
    margin-left: auto;
    border-collapse: collapse;
  }

  .summary-label {
    font-weight: 600;
    color: #555;
    padding: 3px 16px 3px 0;
    text-align: right;
  }

  .summary-value {
    font-weight: 600;
    color: #222;
    padding: 3px 0;
    text-align: right;
    min-width: 100px;
  }

  .total-amount td {
    border-top: 2px solid #333;
    padding-top: 6px;
    font-size: 11pt;
  }

  .signatures {
    margin-top: 40px;
    page-break-inside: avoid;
  }

  .signature-block {
    margin-bottom: 30px;
  }

  .signature-label {
    font-weight: 600;
    color: #555;
    margin-bottom: 20px;
    font-size: 10pt;
  }

  .signature-line {
    display: flex;
    gap: 40px;
    align-items: flex-end;
  }

  .signature-field {
    flex: 1;
  }

  .signature-field .line {
    border-bottom: 1px solid #333;
    min-width: 200px;
    height: 1px;
    margin-top: 30px;
  }

  .signature-field .label {
    font-size: 8pt;
    color: #888;
    margin-top: 4px;
  }

  .date-field {
    flex: 0 0 140px;
  }

  .date-field .line {
    border-bottom: 1px solid #333;
    height: 1px;
    margin-top: 30px;
  }

  .date-field .label {
    font-size: 8pt;
    color: #888;
    margin-top: 4px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">${freelancerLogo}</div>
  <div class="header-right">${clientLogo}</div>
</div>

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
    <div class="signature-label">Freelancer Signature:</div>
    <div class="signature-line">
      <div class="signature-field">
        <div class="line"></div>
        <div class="label">${escapeHtml(data.freelancerName)}</div>
      </div>
    </div>
  </div>
  <div class="signature-block">
    <div class="signature-label">Customer Signature:</div>
    <div class="signature-line">
      <div class="signature-field">
        <div class="line"></div>
        <div class="label">${escapeHtml(data.clientName)}</div>
      </div>
      <div class="date-field">
        <div class="line"></div>
        <div class="label">Date</div>
      </div>
    </div>
  </div>
</div>

</body>
</html>`
}
