import type { FastifyInstance } from 'fastify'
import type { PdfTheme } from '@timesheet/shared'
import { roundMinutes } from '@timesheet/shared'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { eq, and, gte, lte, inArray } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, clients, timeEntries, pdfExports } from '../db/schema.js'
import { config } from '../config.js'
import { buildPdfHtml } from '../services/pdf.template.js'
import type { PdfDayRow } from '../services/pdf.template.js'
import { generatePdf } from '../services/pdf.service.js'
import { randomUUID } from 'node:crypto'
import archiver from 'archiver'

const DAY_NAMES = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

// In-memory cache for streamed PDF results (auto-expires after 5 min)
const pdfCache = new Map<string, { buffer: Buffer; filename: string; expires: number }>()

function cleanExpiredPdfs() {
  const now = Date.now()
  for (const [key, val] of pdfCache) {
    if (val.expires < now) pdfCache.delete(key)
  }
}
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatGermanDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

function formatGermanAmount(n: number): string {
  return n.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

async function readLogoAsDataUrl(logoPath: string): Promise<string | null> {
  try {
    const fullPath = path.join(config.UPLOADS_DIR, logoPath)
    const logoFile = await readFile(fullPath)
    const ext = logoPath.split('.').pop()?.toLowerCase()
    const mime =
      ext === 'svg' ? 'image/svg+xml' : ext === 'png' ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${logoFile.toString('base64')}`
  } catch {
    return null
  }
}

export default async function pdfRoutes(fastify: FastifyInstance) {
  // Download cached PDF by token — no auth required, the UUID token IS the auth.
  fastify.get('/pdf/download/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    cleanExpiredPdfs()
    const cached = pdfCache.get(token)
    if (!cached) {
      return reply.code(404).send({ error: 'PDF not found or expired' })
    }
    const { dl } = request.query as { dl?: string }
    const isZip = cached.filename.endsWith('.zip')
    const contentType = isZip ? 'application/zip' : 'application/pdf'
    const disposition = dl === '1' || isZip ? 'attachment' : 'inline'
    return reply
      .header('Content-Type', contentType)
      .header('Content-Disposition', `${disposition}; filename="${cached.filename}"`)
      .send(cached.buffer)
  })

  fastify.get('/pdf/:projectId/:year/:month', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId, year, month } = request.params as {
      projectId: string
      year: string
      month: string
    }
    const { theme: themeParam } = request.query as { theme?: string }
    const theme: PdfTheme = themeParam === 'terminal' ? 'terminal' : 'classic'

    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)

    if (
      isNaN(yearNum) ||
      isNaN(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    ) {
      return reply.code(400).send({ error: 'Invalid year or month' })
    }

    // 1. Fetch project
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))

    if (!project) {
      return reply.code(404).send({ error: 'Project not found' })
    }

    // 2. Fetch client
    let client = null
    if (project.clientId) {
      const [c] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, project.clientId))
      client = c || null
    }

    // 3. Date range
    const lastDay = new Date(yearNum, monthNum, 0).getDate()
    const startDate = `${yearNum}-${pad2(monthNum)}-01`
    const endDate = `${yearNum}-${pad2(monthNum)}-${pad2(lastDay)}`

    // 4. Fetch entries
    const entries = await db
      .select()
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.projectId, projectId),
          gte(timeEntries.date, startDate),
          lte(timeEntries.date, endDate),
        ),
      )
      .orderBy(timeEntries.date)

    // 5. Build day rows — one per calendar day
    const days: PdfDayRow[] = []
    let roundedTotalMinutes = 0
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(yearNum, monthNum - 1, day)
      const dateStr = `${yearNum}-${pad2(monthNum)}-${pad2(day)}`
      const dayOfWeek = date.getDay() // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      const dayEntries = entries.filter((e) => e.date === dateStr)
      const totalMin = dayEntries.reduce((sum, e) => sum + e.durationMin, 0)
      const effectiveMin = project.roundingMin ? roundMinutes(totalMin, project.roundingMin) : totalMin
      roundedTotalMinutes += effectiveMin
      const descriptions = dayEntries
        .map((e) => e.description)
        .filter(Boolean)
        .join(', ')

      days.push({
        date: `${DAY_NAMES[dayOfWeek]} ${pad2(day)}.${pad2(monthNum)}.`,
        hours: effectiveMin > 0 ? formatGermanDecimal(effectiveMin / 60) : null,
        description: descriptions,
        isWeekend,
      })
    }

    // 6. Totals
    const totalMinutes = entries.reduce((sum, e) => sum + e.durationMin, 0)
    const totalMinutesForPdf = project.roundingMin ? roundedTotalMinutes : totalMinutes
    const totalHours = formatGermanDecimal(totalMinutesForPdf / 60)
    const hourlyRate = project.showAmount && project.hourlyRate ? parseFloat(project.hourlyRate) : null
    const totalAmount = hourlyRate ? hourlyRate * (totalMinutesForPdf / 60) : null

    // 7. Logos
    const clientLogoUrl = client?.logoPath
      ? await readLogoAsDataUrl(client.logoPath)
      : null

    // 8. Build HTML
    const html = buildPdfHtml({
      freelancerName: 'Yannick Dixken',
      projectName: project.name,
      clientName: client?.name || 'Unknown',
      clientAddress: client?.address || null,
      period: `${MONTH_NAMES[monthNum - 1]} ${yearNum}`,
      periodRange: `01.${pad2(monthNum)}.${yearNum} \u2013 ${pad2(lastDay)}.${pad2(monthNum)}.${yearNum}`,
      freelancerLogoUrl: null,
      clientLogoUrl,
      days,
      totalHours,
      hourlyRate: hourlyRate ? formatGermanDecimal(hourlyRate) : null,
      totalAmount: totalAmount ? formatGermanAmount(totalAmount) : null,
    }, theme)

    // 9. Generate PDF
    const pdfBuffer = await generatePdf(html)

    // 10. Log export
    const clientSlug = (client?.name || 'unknown')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
    const filename = `timesheet_${clientSlug}_${yearNum}-${pad2(monthNum)}.pdf`

    await db.insert(pdfExports).values({
      projectId,
      month: startDate,
      filename,
    })

    // 11. Send response
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `inline; filename="${filename}"`)
      .send(pdfBuffer)
  })

  // SSE stream endpoint — streams progress logs then returns a download token
  fastify.get('/pdf/:projectId/:year/:month/stream', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { projectId, year, month } = request.params as {
      projectId: string
      year: string
      month: string
    }
    const { theme: themeParam } = request.query as { theme?: string }
    const theme: PdfTheme = themeParam === 'terminal' ? 'terminal' : 'classic'

    const yearNum = parseInt(year, 10)
    const monthNum = parseInt(month, 10)

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return reply.code(400).send({ error: 'Invalid year or month' })
    }

    // Set up SSE — hijack to prevent Fastify from sending its own response
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const send = (event: string, data: string) => {
      reply.raw.write(`event: ${event}\ndata: ${data}\n\n`)
    }

    const log = (msg: string) => send('log', msg)

    try {
      cleanExpiredPdfs()

      log(`Theme: ${theme}`)
      log('Fetching project data...')
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))

      if (!project) {
        send('error', 'Project not found')
        reply.raw.end()
        return
      }
      log(`Project: ${project.name}`)

      log('Fetching client information...')
      let client = null
      if (project.clientId) {
        const [c] = await db
          .select()
          .from(clients)
          .where(eq(clients.id, project.clientId))
        client = c || null
      }
      log(client ? `Client: ${client.name}` : 'No client assigned')

      const lastDay = new Date(yearNum, monthNum, 0).getDate()
      const startDate = `${yearNum}-${pad2(monthNum)}-01`
      const endDate = `${yearNum}-${pad2(monthNum)}-${pad2(lastDay)}`

      log(`Loading time entries for ${pad2(monthNum)}/${yearNum}...`)
      const entries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.projectId, projectId),
            gte(timeEntries.date, startDate),
            lte(timeEntries.date, endDate),
          ),
        )
        .orderBy(timeEntries.date)
      log(`Found ${entries.length} entries`)

      log('Building timesheet template...')
      const days: PdfDayRow[] = []
      let roundedTotalMinutes = 0
      for (let day = 1; day <= lastDay; day++) {
        const date = new Date(yearNum, monthNum - 1, day)
        const dateStr = `${yearNum}-${pad2(monthNum)}-${pad2(day)}`
        const dayOfWeek = date.getDay()
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const dayEntries = entries.filter((e) => e.date === dateStr)
        const totalMin = dayEntries.reduce((sum, e) => sum + e.durationMin, 0)
        const effectiveMin = project.roundingMin ? roundMinutes(totalMin, project.roundingMin) : totalMin
        roundedTotalMinutes += effectiveMin
        const descriptions = dayEntries
          .map((e) => e.description)
          .filter(Boolean)
          .join(', ')
        days.push({
          date: `${DAY_NAMES[dayOfWeek]} ${pad2(day)}.${pad2(monthNum)}.`,
          hours: effectiveMin > 0 ? formatGermanDecimal(effectiveMin / 60) : null,
          description: descriptions,
          isWeekend,
        })
      }

      if (client?.logoPath) {
        log('Loading client logo...')
      }
      const clientLogoUrl = client?.logoPath
        ? await readLogoAsDataUrl(client.logoPath)
        : null

      const totalMinutes = entries.reduce((sum, e) => sum + e.durationMin, 0)
      const totalMinutesForPdf = project.roundingMin ? roundedTotalMinutes : totalMinutes
      const totalHours = formatGermanDecimal(totalMinutesForPdf / 60)
      const hourlyRate =
        project.showAmount && project.hourlyRate
          ? parseFloat(project.hourlyRate)
          : null
      const totalAmount = hourlyRate ? hourlyRate * (totalMinutesForPdf / 60) : null

      log('HTML template ready')
      log('Starting Puppeteer PDF engine...')

      const html = buildPdfHtml({
        freelancerName: 'Yannick Dixken',
        projectName: project.name,
        clientName: client?.name || 'Unknown',
        clientAddress: client?.address || null,
        period: `${MONTH_NAMES[monthNum - 1]} ${yearNum}`,
        periodRange: `01.${pad2(monthNum)}.${yearNum} \u2013 ${pad2(lastDay)}.${pad2(monthNum)}.${yearNum}`,
        freelancerLogoUrl: null,
        clientLogoUrl,
        days,
        totalHours,
        hourlyRate: hourlyRate ? formatGermanDecimal(hourlyRate) : null,
        totalAmount: totalAmount ? formatGermanAmount(totalAmount) : null,
      }, theme)

      const pdfBuffer = await generatePdf(html, log)

      // Store in cache
      const clientSlug = (client?.name || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
      const filename = `timesheet_${clientSlug}_${yearNum}-${pad2(monthNum)}.pdf`
      const token = randomUUID()
      pdfCache.set(token, {
        buffer: pdfBuffer,
        filename,
        expires: Date.now() + 5 * 60 * 1000,
      })

      // Log export
      await db.insert(pdfExports).values({
        projectId,
        month: startDate,
        filename,
      })

      log('Export complete')
      send('done', JSON.stringify({ token, filename }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      send('error', msg)
    } finally {
      reply.raw.end()
    }
  })

  // SSE stream endpoint for ZIP export of all projects in a month
  fastify.post('/pdf/zip/stream', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = request.body as {
      year: number
      month: number
      theme?: string
      projectIds?: string[]
    }

    const yearNum = body.year
    const monthNum = body.month
    const theme: PdfTheme = body.theme === 'terminal' ? 'terminal' : 'classic'

    if (
      !yearNum || !monthNum ||
      isNaN(yearNum) || isNaN(monthNum) ||
      monthNum < 1 || monthNum > 12
    ) {
      return reply.code(400).send({ error: 'Invalid year or month' })
    }

    // Set up SSE
    reply.hijack()
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    const send = (event: string, data: string) => {
      reply.raw.write(`event: ${event}\ndata: ${data}\n\n`)
    }

    const log = (msg: string) => send('log', msg)

    try {
      cleanExpiredPdfs()

      const lastDay = new Date(yearNum, monthNum, 0).getDate()
      const startDate = `${yearNum}-${pad2(monthNum)}-01`
      const endDate = `${yearNum}-${pad2(monthNum)}-${pad2(lastDay)}`

      // Determine which projects to export
      let projectList: typeof projects.$inferSelect[]

      if (body.projectIds && body.projectIds.length > 0) {
        log(`Fetching ${body.projectIds.length} specified projects...`)
        projectList = await db
          .select()
          .from(projects)
          .where(inArray(projects.id, body.projectIds))
      } else {
        log(`Finding projects with entries in ${pad2(monthNum)}/${yearNum}...`)
        // Find all projects that have time entries in the given month
        const projectIdsWithEntries = await db
          .selectDistinct({ projectId: timeEntries.projectId })
          .from(timeEntries)
          .where(
            and(
              gte(timeEntries.date, startDate),
              lte(timeEntries.date, endDate),
            ),
          )

        if (projectIdsWithEntries.length === 0) {
          send('error', 'No projects with entries found for this month')
          reply.raw.end()
          return
        }

        const ids = projectIdsWithEntries.map((r) => r.projectId)
        projectList = await db
          .select()
          .from(projects)
          .where(inArray(projects.id, ids))
      }

      log(`Found ${projectList.length} project(s) to export`)
      log(`Theme: ${theme}`)

      // Fetch all needed clients in one query
      const clientIds = [...new Set(projectList.map((p) => p.clientId).filter(Boolean))] as string[]
      const clientMap = new Map<string, typeof clients.$inferSelect>()
      if (clientIds.length > 0) {
        const clientList = await db
          .select()
          .from(clients)
          .where(inArray(clients.id, clientIds))
        for (const c of clientList) {
          clientMap.set(c.id, c)
        }
      }

      // Generate PDFs for each project
      const pdfBuffers: { buffer: Buffer; filename: string }[] = []

      for (let i = 0; i < projectList.length; i++) {
        const project = projectList[i]
        const client = project.clientId ? clientMap.get(project.clientId) ?? null : null
        log(`[${i + 1}/${projectList.length}] Generating PDF: ${project.name}...`)

        // Fetch entries for this project
        const entries = await db
          .select()
          .from(timeEntries)
          .where(
            and(
              eq(timeEntries.projectId, project.id),
              gte(timeEntries.date, startDate),
              lte(timeEntries.date, endDate),
            ),
          )
          .orderBy(timeEntries.date)

        if (entries.length === 0) {
          log(`  Skipping ${project.name} — no entries`)
          continue
        }

        log(`  ${entries.length} entries found`)

        // Build day rows
        const days: PdfDayRow[] = []
        let roundedTotalMinutes = 0
        for (let day = 1; day <= lastDay; day++) {
          const date = new Date(yearNum, monthNum - 1, day)
          const dateStr = `${yearNum}-${pad2(monthNum)}-${pad2(day)}`
          const dayOfWeek = date.getDay()
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
          const dayEntries = entries.filter((e) => e.date === dateStr)
          const totalMin = dayEntries.reduce((sum, e) => sum + e.durationMin, 0)
          const effectiveMin = project.roundingMin ? roundMinutes(totalMin, project.roundingMin) : totalMin
          roundedTotalMinutes += effectiveMin
          const descriptions = dayEntries
            .map((e) => e.description)
            .filter(Boolean)
            .join(', ')
          days.push({
            date: `${DAY_NAMES[dayOfWeek]} ${pad2(day)}.${pad2(monthNum)}.`,
            hours: effectiveMin > 0 ? formatGermanDecimal(effectiveMin / 60) : null,
            description: descriptions,
            isWeekend,
          })
        }

        const clientLogoUrl = client?.logoPath
          ? await readLogoAsDataUrl(client.logoPath)
          : null

        const totalMinutes = entries.reduce((sum, e) => sum + e.durationMin, 0)
        const totalMinutesForPdf = project.roundingMin ? roundedTotalMinutes : totalMinutes
        const totalHours = formatGermanDecimal(totalMinutesForPdf / 60)
        const hourlyRate =
          project.showAmount && project.hourlyRate
            ? parseFloat(project.hourlyRate)
            : null
        const totalAmount = hourlyRate ? hourlyRate * (totalMinutesForPdf / 60) : null

        const html = buildPdfHtml({
          freelancerName: 'Yannick Dixken',
          projectName: project.name,
          clientName: client?.name || 'Unknown',
          clientAddress: client?.address || null,
          period: `${MONTH_NAMES[monthNum - 1]} ${yearNum}`,
          periodRange: `01.${pad2(monthNum)}.${yearNum} \u2013 ${pad2(lastDay)}.${pad2(monthNum)}.${yearNum}`,
          freelancerLogoUrl: null,
          clientLogoUrl,
          days,
          totalHours,
          hourlyRate: hourlyRate ? formatGermanDecimal(hourlyRate) : null,
          totalAmount: totalAmount ? formatGermanAmount(totalAmount) : null,
        }, theme)

        const pdfBuffer = await generatePdf(html)

        const clientSlug = (client?.name || 'unknown')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
        const filename = `timesheet_${clientSlug}_${yearNum}-${pad2(monthNum)}.pdf`

        pdfBuffers.push({ buffer: pdfBuffer, filename })

        // Log export
        await db.insert(pdfExports).values({
          projectId: project.id,
          month: startDate,
          filename,
        })

        log(`  PDF ready (${(pdfBuffer.length / 1024).toFixed(1)} KB)`)
      }

      if (pdfBuffers.length === 0) {
        send('error', 'No PDFs generated — no entries found for any project')
        reply.raw.end()
        return
      }

      // Bundle into ZIP
      log(`Bundling ${pdfBuffers.length} PDF(s) into ZIP...`)

      const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } })
        const chunks: Buffer[] = []

        archive.on('data', (chunk: Buffer) => chunks.push(chunk))
        archive.on('end', () => resolve(Buffer.concat(chunks)))
        archive.on('error', reject)

        for (const { buffer, filename } of pdfBuffers) {
          archive.append(buffer, { name: filename })
        }

        archive.finalize()
      })

      const zipFilename = `timesheets_${yearNum}-${pad2(monthNum)}.zip`
      const token = randomUUID()
      pdfCache.set(token, {
        buffer: zipBuffer,
        filename: zipFilename,
        expires: Date.now() + 5 * 60 * 1000,
      })

      log(`ZIP ready (${(zipBuffer.length / 1024).toFixed(1)} KB)`)
      log('Export complete')
      send('done', JSON.stringify({ token, filename: zipFilename }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      send('error', msg)
    } finally {
      reply.raw.end()
    }
  })

}
