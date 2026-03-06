import puppeteer from 'puppeteer'
import type { Browser } from 'puppeteer'
import { config } from '../config.js'

let browser: Browser | null = null

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: config.PUPPETEER_NO_SANDBOX
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [],
    })
  }
  return browser
}

export async function generatePdf(html: string): Promise<Buffer> {
  const b = await getBrowser()
  const page = await b.newPage()
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    })
    return Buffer.from(pdf)
  } finally {
    await page.close()
  }
}

process.on('beforeExit', async () => {
  if (browser) await browser.close()
})
