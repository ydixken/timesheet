import { useState, useEffect, useCallback, useRef } from 'react'
import type { PdfTheme } from '@timesheet/shared'
import { useAuthStore } from '../store/auth'
import { Button } from './ui/Button'

interface ZipExportModalProps {
  isOpen: boolean
  onClose: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type Phase = 'select' | 'generating' | 'ready' | 'error'

export function ZipExportModal({ isOpen, onClose }: ZipExportModalProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [theme, setTheme] = useState<PdfTheme>('terminal')
  const [phase, setPhase] = useState<Phase>('select')
  const [logs, setLogs] = useState<string[]>([])
  const [zipToken, setZipToken] = useState<string | null>(null)
  const [zipFilename, setZipFilename] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const zipUrl = zipToken ? `/api/pdf/download/${zipToken}` : null

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

  useEffect(() => {
    if (isOpen) {
      setPhase('select')
      setLogs([])
      setZipToken(null)
      setZipFilename(null)
      setErrorMsg(null)
    }
  }, [isOpen])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const startGeneration = useCallback(() => {
    setPhase('generating')
    setLogs([])
    setZipToken(null)
    setZipFilename(null)
    setErrorMsg(null)

    const token = useAuthStore.getState().getAccessToken()
    const abortController = new AbortController()

    fetch('/api/pdf/zip/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ year, month, theme }),
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
              if (currentEvent && currentData) {
                if (currentEvent === 'log') {
                  setLogs((prev) => [...prev, currentData])
                } else if (currentEvent === 'done') {
                  const result = JSON.parse(currentData)
                  setZipToken(result.token)
                  setZipFilename(result.filename)
                  setPhase('ready')
                } else if (currentEvent === 'error') {
                  setErrorMsg(currentData)
                  setPhase('error')
                }
              }
              currentEvent = ''
              currentData = ''
            } else if (line !== '') {
              buffer = line + '\n'
            }
          }

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
  }, [year, month, theme])

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
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <h2 className="text-terminal-text-bright font-mono text-sm font-bold">
            ZIP Export &mdash; All Projects
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
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="text-terminal-green font-mono text-sm whitespace-pre">
{`  _______ ___  ___            _
 |_  /_ _| _ \\| __|_ ___ __  | |_
  / / | ||  _/| _|\\ \\ / '_ \\ |  _|
 /___|___|_|  |___/_\\_\\ .__/  \\__|
                       |_|          `}
              </div>
              <p className="text-terminal-text font-mono text-sm text-center max-w-md">
                Generate PDFs for all projects with entries in the selected month and download as a ZIP archive.
              </p>
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
              <Button variant="filled" onClick={startGeneration}>
                [generate all]
              </Button>
            </div>
          )}

          {phase === 'generating' && (
            <div className="flex flex-col" style={{ minHeight: '400px' }}>
              <div className="flex-1 bg-terminal-bg rounded border border-terminal-border p-4 overflow-y-auto font-mono text-sm">
                <div className="text-terminal-text mb-2">
                  <span className="text-terminal-green">$</span> generate-zip --period {year}-{String(month).padStart(2, '0')} --theme {theme}
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

          {phase === 'ready' && (
            <div className="flex flex-col items-center justify-center gap-6 py-12">
              <div className="text-terminal-green font-mono text-sm whitespace-pre">
{`  ✓ ZIP archive ready`}
              </div>
              <div className="bg-terminal-bg rounded border border-terminal-border p-4 overflow-y-auto font-mono text-sm max-h-60 w-full">
                {logs.map((line, i) => (
                  <div key={i} className="text-terminal-text leading-relaxed">
                    <span className="text-terminal-blue">[{String(i + 1).padStart(2, '0')}]</span>{' '}
                    {line}
                  </div>
                ))}
              </div>
              {zipFilename && (
                <p className="text-terminal-text font-mono text-sm">
                  {zipFilename}
                </p>
              )}
            </div>
          )}

          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
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
            {phase === 'ready' && zipUrl && zipFilename && (
              <a href={`${zipUrl}?dl=1`} download={zipFilename} className="inline-block">
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
