import { useState, useEffect, useCallback } from 'react'
import { Button } from './ui/Button'

interface PdfPreviewModalProps {
  projectId: string
  projectName: string
  isOpen: boolean
  onClose: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PdfPreviewModal({ projectId, projectName, isOpen, onClose }: PdfPreviewModalProps) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const pdfUrl = `/api/pdf/${projectId}/${year}/${month}`

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
      <div className="bg-terminal-bg-light border border-terminal-border rounded-lg w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border">
          <h2 className="text-terminal-text-bright font-mono text-sm font-bold">
            PDF Preview &mdash; {projectName}
          </h2>
          <button
            onClick={onClose}
            className="text-terminal-text hover:text-terminal-text-bright font-mono text-lg cursor-pointer leading-none"
          >
            &times;
          </button>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 min-h-0 p-4">
          <iframe
            key={`${year}-${month}`}
            src={pdfUrl}
            className="w-full h-full min-h-[60vh] rounded border border-terminal-border bg-white"
            title={`PDF preview for ${projectName}`}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-terminal-border">
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
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              download={`${projectName}-${year}-${String(month).padStart(2, '0')}.pdf`}
              className="inline-block"
            >
              <Button variant="filled">[download]</Button>
            </a>
            <Button onClick={onClose}>[close]</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
