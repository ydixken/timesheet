import puppeteer from 'puppeteer'
import type { Browser } from 'puppeteer'
import { config } from '../config.js'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      ...(config.PUPPETEER_EXECUTABLE_PATH && {
        executablePath: config.PUPPETEER_EXECUTABLE_PATH,
      }),
      args: config.PUPPETEER_NO_SANDBOX
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [],
    })
  }
  return browser
}

export type ProgressCallback = (message: string) => void

export async function generatePdf(
  html: string,
  onProgress?: ProgressCallback,
): Promise<Buffer> {
  const log = onProgress ?? (() => {})

  log('puppeteer: connecting to Chromium...')
  const b = await getBrowser()
  const version = await b.version()
  log(`puppeteer: browser connected (${version})`)

  log('puppeteer: creating new page context...')
  const page = await b.newPage()

  // Capture real Puppeteer page events
  page.on('console', (msg) => {
    log(`chrome console [${msg.type()}]: ${msg.text()}`)
  })

  page.on('request', (req) => {
    log(`chrome network: ${req.method()} ${req.url().slice(0, 120)}`)
  })

  page.on('requestfinished', (req) => {
    const resp = req.response()
    if (resp) {
      log(`chrome network: ${resp.status()} ${req.url().slice(0, 120)}`)
    }
  })

  page.on('requestfailed', (req) => {
    log(`chrome network FAIL: ${req.url().slice(0, 120)} ${req.failure()?.errorText ?? ''}`)
  })

  page.on('pageerror', (err) => {
    log(`chrome error: ${String(err)}`)
  })

  try {
    log('puppeteer: setting HTML content (waitUntil: networkidle0)...')
    await page.setContent(html, { waitUntil: 'networkidle0' })
    log('puppeteer: content loaded, network idle')

    const metrics = await page.metrics()
    log(`puppeteer: page metrics - DOM nodes: ${metrics.Nodes}, layouts: ${metrics.LayoutCount}`)

    log('puppeteer: generating PDF (A4, margins 12mm)...')
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '12mm', bottom: '12mm', left: '12mm', right: '12mm' },
    })
    const buf = Buffer.from(pdf)
    log(`puppeteer: PDF buffer ready (${(buf.length / 1024).toFixed(1)} KB, ${pdf.length} bytes)`)
    return buf
  } finally {
    await page.close()
    log('puppeteer: page closed, resources released')
  }
}

process.on('beforeExit', async () => {
  if (browser) await browser.close()
})
