import puppeteer from 'puppeteer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = path.resolve(__dirname, '..', 'assets')
const BASE_URL = 'http://localhost:5173'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

  const screenshot = async (name: string) => {
    // Wait for any loading states / chart animations to settle
    await sleep(1500)
    await page.screenshot({ path: path.join(ASSETS_DIR, `${name}.png`), fullPage: false })
    console.log(`  ✓ ${name}.png`)
  }

  // 1. Dashboard — "This Week" is the default view, just capture it
  console.log('Taking screenshots...')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' })
  await screenshot('dashboard')

  // 2. Tracker — navigate to current month (March 2026, has data for week 1)
  await page.goto(`${BASE_URL}/tracker`, { waitUntil: 'networkidle0' })
  await screenshot('tracker')

  // 3. Timesheet grid — March shows current week data in the grid
  await page.goto(`${BASE_URL}/timesheet`, { waitUntil: 'networkidle0' })
  await screenshot('timesheet')

  // 4. Calendar — week view (default) showing current week with time grid
  await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'networkidle0' })
  await screenshot('calendar')

  // 5. Reports — summary tab (default). Set date range via JS to cover all data.
  await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="date"]')
    if (inputs.length >= 2) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )!.set!
      nativeInputValueSetter.call(inputs[0], '2026-02-01')
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }))
      inputs[0].dispatchEvent(new Event('change', { bubbles: true }))
    }
  })
  await sleep(2000)
  await screenshot('reports')

  // 6. Projects list
  await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle0' })
  await screenshot('projects')

  // 7. Project detail — click the first project (K8s Platform Migration)
  const projectLink = await page.$('a[href*="/projects/"]')
  if (projectLink) {
    await projectLink.click()
    await page.waitForNavigation({ waitUntil: 'networkidle0' })
  }
  await screenshot('project-detail')

  // 8. Clients
  await page.goto(`${BASE_URL}/clients`, { waitUntil: 'networkidle0' })
  await screenshot('clients')

  await browser.close()
  console.log(`\nAll screenshots saved to ${ASSETS_DIR}`)
}

takeScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err)
  process.exit(1)
})
