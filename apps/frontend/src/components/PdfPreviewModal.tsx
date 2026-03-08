import { useState, useEffect, useCallback, useRef } from 'react'
import type { PdfTheme } from '@timesheet/shared'
import { useAuthStore } from '../store/auth'
import { Button } from './ui/Button'

interface PdfPreviewModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
  roundingMin?: number | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Phase = 'select' | 'generating' | 'ready' | 'error'

export function PdfPreviewModal({ projectId, projectName, isOpen, onClose, roundingMin }: PdfPreviewModalProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [theme, setTheme] = useState<PdfTheme>('terminal')
  const [phase, setPhase] = useState<Phase>('select')
  const [logs, setLogs] = useState<string[]>([])
  const [pdfToken, setPdfToken] = useState<string | null>(null)
  const [pdfFilename, setPdfFilename] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const pdfUrl = pdfToken ? `/api/pdf/download/${pdfToken}` : null

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleEscape])

  // Reset state when modal opens or month/year changes
  useEffect(() => {
    if (isOpen) {
      setPhase('select')
      setLogs([])
      setPdfToken(null)
      setPdfFilename(null)
      setErrorMsg(null)
    }
  }, [isOpen])

  // Auto-scroll log container
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const startGeneration = useCallback(() => {
    setPhase('generating')
    setLogs([])
    setPdfToken(null)
    setPdfFilename(null)
    setErrorMsg(null)

    const token = useAuthStore.getState().getAccessToken()
    const url = `/api/pdf/${projectId}/${year}/${month}/stream?theme=${theme}`
    const abortController = new AbortController()

    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          setErrorMsg(`HTTP ${response.status}: ${response.statusText}`)
          setPhase('error')
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse SSE events from buffer
          const lines = buffer.split('\n')
          buffer = ''

          let currentEvent = ''
          let currentData = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7)
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6)
            } else if (line === '') {
              // End of event
              if (currentEvent && currentData) {
                if (currentEvent === 'log') {
                  setLogs((prev) => [...prev, currentData])
                } else if (currentEvent === 'done') {
                  const result = JSON.parse(currentData)
                  setPdfToken(result.token)
                  setPdfFilename(result.filename)
                  setPhase('ready')
                } else if (currentEvent === 'error') {
                  setErrorMsg(currentData)
                  setPhase('error')
                }
              }
              currentEvent = ''
              currentData = ''
            } else if (line !== '') {
              // Incomplete event, put back in buffer
              buffer = line + '\n'
            }
          }

          // If we have partial data, keep it in buffer
          if (currentEvent || currentData) {
            if (currentEvent) buffer = `event: ${currentEvent}\n` + buffer
            if (currentData) buffer = `data: ${currentData}\n` + buffer
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setErrorMsg(err.message)
          setPhase('error')
        }
      })

    return () => abortController.abort()
  }, [projectId, year, month, theme])

  if (!isOpen) return null

  const currentYear = now.getFullYear()
  const years = [currentYear, currentYear - 1]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg w-full max-w-6xl mx-4 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <h2 className="text-terminal-text-bright font-mono text-sm font-bold">
            PDF Export &mdash; {projectName}
          </h2>
          <button
            onClick={onClose}
            className="text-terminal-text hover:text-terminal-text-bright font-mono text-lg cursor-pointer leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 p-4">
          {phase === 'select' && (
            <div className="flex flex-col items-center justify-center h-full min-h-[80vh] gap-6">
              <div className="text-terminal-green font-mono text-sm whitespace-pre">
{`  ___  ___  ___   ___            _
 | _ \\|   \\| __| | __|_ ___ __  | |_
 |  _/| |) | _|  | _|\\ \\ / '_ \\ |  _|
 |_|  |___/|_|   |___/_\\_\\ .__/  \\__|
                          |_|          `}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-terminal-text font-mono">
                  Month:
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-2 py-1 rounded text-sm focus:outline-none focus:border-terminal-green"
                  >
                    {MONTHS.map((name, i) => (
                      <option key={i + 1} value={i + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-sm text-terminal-text font-mono">
                  Year:
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-2 py-1 rounded text-sm focus:outline-none focus:border-terminal-green"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className="text-terminal-text">Theme:</span>
                {(['classic', 'terminal'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      theme === t
                        ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green'
                        : 'text-terminal-text border border-terminal-border hover:border-terminal-text'
                    }`}
                  >
                    [{t}]
                  </button>
                ))}
              </div>
              {roundingMin && (
                <p className="text-terminal-text font-mono text-xs mt-2">
                  Rounding: {roundingMin} min
                </p>
              )}
              <Button variant="filled" onClick={startGeneration}>
                [generate]
              </Button>
            </div>
          )}

          {phase === 'generating' && (
            <div className="h-full min-h-[80vh] flex flex-col">
              <div className="flex-1 bg-terminal-bg rounded border border-terminal-border p-4 overflow-y-auto font-mono text-sm">
                <div className="text-terminal-text mb-2">
                  <span className="text-terminal-green">$</span> generate-pdf --project &quot;{projectName}&quot; --period {year}-{String(month).padStart(2, '0')}
                </div>
                {logs.map((line, i) => (
                  <div key={i} className="text-terminal-text leading-relaxed">
                    <span className="text-terminal-blue">[{String(i + 1).padStart(2, '0')}]</span>{' '}
                    {line}
                  </div>
                ))}
                <div className="inline-block">
                  <span className="text-terminal-green animate-pulse">_</span>
                </div>
                <div ref={logEndRef} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-2 text-terminal-text font-mono text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-terminal-green animate-pulse" />
                  Processing...
                </div>
              </div>
            </div>
          )}

          {phase === 'ready' && pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[80vh] rounded border border-terminal-border bg-white"
              title={`PDF preview for ${projectName}`}
            />
          )}

          {phase === 'error' && (
            <div className="h-full min-h-[80vh] flex flex-col items-center justify-center gap-4">
              <div className="text-terminal-danger font-mono text-sm">
                Error: {errorMsg}
              </div>
              <Button variant="outline" onClick={() => setPhase('select')}>
                [retry]
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-terminal-border">
          <div className="flex items-center gap-3">
            {phase === 'ready' && (
              <Button variant="outline" onClick={() => setPhase('select')}>
                [regenerate]
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {phase === 'ready' && pdfUrl && pdfFilename && (
              <a href={`${pdfUrl}?dl=1`} download={pdfFilename} className="inline-block">
                <Button variant="filled">[download]</Button>
              </a>
            )}
            <Button onClick={onClose}>[close]</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
