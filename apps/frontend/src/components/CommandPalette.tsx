import { useState, useEffect, useCallback } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { parseQuickEntry, matchProject } from '@timesheet/shared'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import { useEntries } from '../hooks/useEntries'

export const useCommandPalette = create<{ open: boolean; toggle: () => void }>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
}))

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h && m) return `${h}h${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

const navItems = [
  { to: '/', label: 'dashboard' },
  { to: '/tracker', label: 'tracker' },
  { to: '/timesheet', label: 'timesheet' },
  { to: '/calendar', label: 'calendar' },
  { to: '/reports', label: 'reports' },
  { to: '/projects', label: 'projects' },
  { to: '/clients', label: 'clients' },
]

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open)
  const toggle = useCommandPalette((s) => s.toggle)
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const projects = useProjects((s) => s.projects)
  const fetchProjects = useProjects((s) => s.fetch)
  const clients = useClients((s) => s.clients)
  const fetchClients = useClients((s) => s.fetch)

  const activeProjects = projects.filter((p) => p.active)

  // Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  // Lazily fetch projects and clients when opening
  useEffect(() => {
    if (open) {
      if (projects.length === 0) fetchProjects('active')
      if (clients.length === 0) fetchClients()
    }
  }, [open, projects.length, clients.length, fetchProjects, fetchClients])

  // Reset input when closing
  useEffect(() => {
    if (!open) setInputValue('')
  }, [open])

  const setOpen = useCallback(
    (value: boolean) => {
      if (value !== open) toggle()
    },
    [open, toggle],
  )

  // Quick-add parsing
  const parsed = parseQuickEntry(inputValue)
  const matchedProject = parsed ? matchProject(parsed.projectQuery, activeProjects) : null

  const handleQuickAdd = async () => {
    if (!parsed || !matchedProject || submitting) return
    setSubmitting(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await useEntries.getState().create({
        projectId: matchedProject.id,
        description: parsed.description,
        date: today,
        durationMin: parsed.durationMin,
        billable: matchedProject.billable,
      })
      setOpen(false)
      setSuccessToast(`${formatDuration(parsed.durationMin)} added to ${matchedProject.name}`)
      setTimeout(() => setSuccessToast(null), 3000)
    } catch {
      // silently fail - the entry store will handle errors
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelect = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const clientNameById = (id: string | null) => {
    if (!id) return null
    return clients.find((c) => c.id === id)?.name ?? null
  }

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        shouldFilter={true}
        className="fixed inset-0 z-50"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-cmd-overlay"
          onClick={() => setOpen(false)}
        />

        {/* Dialog */}
        <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50 animate-cmd-content">
          <div className="bg-terminal-bg-light border border-terminal-border rounded-lg shadow-2xl overflow-hidden">
            {/* Input wrapper */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-terminal-border">
              <span className="text-terminal-green font-mono text-sm font-bold select-none">
                {'>_'}
              </span>
              <Command.Input
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="type a command or search..."
                className="flex-1 bg-transparent text-terminal-text-bright font-mono text-sm outline-none placeholder:text-terminal-text/40"
              />
            </div>

            {/* List */}
            <Command.List className="max-h-72 overflow-y-auto">
              {/* Quick-add item */}
              {parsed && matchedProject && (
                <Command.Item
                  value={`quick-add-${inputValue}`}
                  keywords={[inputValue]}
                  onSelect={handleQuickAdd}
                  className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                >
                  <span className="text-terminal-green font-bold">+</span>
                  <span className="px-1.5 py-0.5 rounded text-xs bg-terminal-surface text-terminal-blue">
                    {formatDuration(parsed.durationMin)}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: matchedProject.color }}
                  />
                  <span className="text-terminal-text-bright">{matchedProject.name}</span>
                  {parsed.description && (
                    <span className="text-terminal-text/60 truncate">| {parsed.description}</span>
                  )}
                </Command.Item>
              )}

              {/* Navigation */}
              <Command.Group heading="[navigation]">
                {navItems.map(({ to, label }) => (
                  <Command.Item
                    key={to}
                    value={label}
                    onSelect={() => handleSelect(to)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                  >
                    <span className="text-terminal-green">{'->'}</span>
                    <span>{label}</span>
                  </Command.Item>
                ))}
              </Command.Group>

              {/* Actions */}
              <Command.Group heading="[actions]">
                <Command.Item
                  value="new project"
                  onSelect={() => handleSelect('/projects?action=create')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                >
                  <span className="text-terminal-blue">$</span>
                  <span>new project</span>
                </Command.Item>
                <Command.Item
                  value="new client"
                  onSelect={() => handleSelect('/clients?action=create')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                >
                  <span className="text-terminal-blue">$</span>
                  <span>new client</span>
                </Command.Item>
                <Command.Item
                  value="export month"
                  onSelect={() => handleSelect('/projects?action=export')}
                  className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                >
                  <span className="text-terminal-blue">$</span>
                  <span>export month</span>
                </Command.Item>
              </Command.Group>

              {/* Projects */}
              {activeProjects.length > 0 && (
                <Command.Group heading="[projects]">
                  {activeProjects.map((project) => (
                    <Command.Item
                      key={project.id}
                      value={`project ${project.name}`}
                      onSelect={() => handleSelect(`/projects/${project.id}`)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-terminal-text-bright">{project.name}</span>
                      {clientNameById(project.clientId) && (
                        <span className="text-terminal-text/50 text-xs">
                          {clientNameById(project.clientId)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              <Command.Empty className="py-8 text-center font-mono text-sm text-terminal-text/50">
                no results found_
              </Command.Empty>
            </Command.List>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-terminal-border text-terminal-text/40 font-mono text-xs">
              <span>
                <kbd className="px-1 py-0.5 rounded border border-terminal-border text-[10px]">
                  {'↑↓'}
                </kbd>{' '}
                navigate
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded border border-terminal-border text-[10px]">
                  {'↵'}
                </kbd>{' '}
                select
              </span>
              <span>
                <kbd className="px-1 py-0.5 rounded border border-terminal-border text-[10px]">
                  esc
                </kbd>{' '}
                close
              </span>
            </div>
          </div>
        </div>
      </Command.Dialog>

      {/* Success toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-terminal-bg-light border border-terminal-green rounded-lg px-4 py-3 font-mono text-sm text-terminal-green">
          {successToast}
        </div>
      )}
    </>
  )
}
