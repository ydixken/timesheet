import { useState, useEffect, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { parseQuickEntry, matchProject } from '@timesheet/shared'
import { useProjects } from '../hooks/useProjects'
import { useClients } from '../hooks/useClients'
import { useEntries } from '../hooks/useEntries'
import { useBudgetAlerts } from '../hooks/useBudgetAlerts'
import { formatLocalDate } from '../lib/time'
import { toast } from '../store/toasts'
import { navItems } from './layout/nav-items'

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

/** Check if the input starts with a duration pattern (quick-add mode) */
const DURATION_PREFIX = /^(\d+h\d+m|\d+:\d{2}|\d+\.?\d*h|\d+m)\s*/

export function CommandPalette() {
  const open = useCommandPalette((s) => s.open)
  const toggle = useCommandPalette((s) => s.toggle)
  const navigate = useNavigate()
  const [inputValue, setInputValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const projects = useProjects((s) => s.projects)
  const fetchProjects = useProjects((s) => s.fetch)
  const clients = useClients((s) => s.clients)
  const fetchClients = useClients((s) => s.fetch)

  const checkBudget = useBudgetAlerts((s) => s.checkBudget)
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
  const isQuickAddMode = DURATION_PREFIX.test(inputValue.trim())
  const parsed = parseQuickEntry(inputValue)
  const matchedProject = parsed ? matchProject(parsed.projectQuery, activeProjects) : null

  // In quick-add mode, fuzzy-match projects against the project query portion
  const projectMatches = useMemo(() => {
    if (!isQuickAddMode || !parsed?.projectQuery) return []
    const q = parsed.projectQuery.toLowerCase()
    return activeProjects.filter((p) => p.name.toLowerCase().includes(q))
  }, [isQuickAddMode, parsed?.projectQuery, activeProjects])

  const canSubmit = parsed && matchedProject && parsed.description.length > 0

  // Snapshot parsed state for the async handler to avoid stale closure
  const handleQuickAdd = useCallback(async () => {
    const snap = parseQuickEntry(inputValue)
    const proj = snap ? matchProject(snap.projectQuery, activeProjects) : null
    if (!snap || !proj || !snap.description || submitting) return
    setSubmitting(true)
    try {
      const today = formatLocalDate(new Date())
      await useEntries.getState().create({
        projectId: proj.id,
        description: snap.description,
        date: today,
        durationMin: snap.durationMin,
        billable: proj.billable,
      })
      checkBudget(proj.id)
      // Refresh the tracker entries
      useEntries.getState().fetch()
      setOpen(false)
      toast({
        variant: 'success',
        message: `${formatDuration(snap.durationMin)} added to ${proj.name}`,
      })
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }, [inputValue, activeProjects, submitting, checkBudget, setOpen])

  // When a project is selected from the dropdown, insert it into the input
  const handleProjectSelect = useCallback(
    (projectName: string) => {
      const match = inputValue.trim().match(DURATION_PREFIX)
      if (!match) return
      const durationPart = match[0]
      setInputValue(`${durationPart}${projectName} | `)
    },
    [inputValue],
  )

  const handleSelect = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const clientNameById = (id: string | null) => {
    if (!id) return null
    return clients.find((c) => c.id === id)?.name ?? null
  }

  // Custom filter: in quick-add mode, bypass cmdk's filter (we control visibility via rendering)
  const filter = useCallback(
    (value: string, search: string) => {
      if (isQuickAddMode) return 1
      if (!search) return 1
      return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
    },
    [isQuickAddMode],
  )

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        filter={filter}
        className="fixed inset-0 z-50"
      >
        {/* Overlay */}
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-cmd-overlay"
          onClick={() => setOpen(false)}
        />

        {/* Dialog */}
        <div className="fixed inset-x-0 top-[8%] z-50 mx-3 sm:mx-auto max-w-xl">
          <div className="bg-terminal-elevated border border-terminal-border rounded-xl shadow-overlay animate-cmd-content overflow-hidden flex flex-col max-h-[80dvh]">
            {/* Input wrapper */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-terminal-border shrink-0">
              <span className="text-terminal-green font-mono text-sm font-bold select-none">
                {'>_'}
              </span>
              <Command.Input
                value={inputValue}
                onValueChange={setInputValue}
                placeholder="type a command or search..."
                className="flex-1 bg-transparent text-terminal-text-bright font-mono text-base sm:text-sm outline-none placeholder:text-terminal-text-muted"
              />
            </div>

            {/* Quick-add preview bar */}
            {isQuickAddMode && (
              <div className="flex items-center gap-2 px-4 py-2 border-b border-terminal-border bg-terminal-bg/50 shrink-0">
                {parsed && (
                  <>
                    <span className="px-2 py-0.5 rounded border border-terminal-blue text-terminal-blue font-mono text-xs font-bold">
                      {formatDuration(parsed.durationMin)}
                    </span>
                    {matchedProject ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-terminal-border text-xs font-mono">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: matchedProject.color }}
                        />
                        <span className="text-terminal-text-bright">{matchedProject.name}</span>
                      </span>
                    ) : parsed.projectQuery ? (
                      <span className="px-2 py-0.5 rounded border border-red-500/50 text-red-400 font-mono text-xs">
                        {parsed.projectQuery} <span className="text-red-400/60">- no match</span>
                      </span>
                    ) : (
                      <span className="text-terminal-text-faint font-mono text-xs">type project name...</span>
                    )}
                    {matchedProject && !inputValue.includes('|') && (
                      <span className="text-terminal-text-faint font-mono text-xs">type | then description</span>
                    )}
                    {matchedProject && inputValue.includes('|') && !parsed.description && (
                      <span className="text-terminal-text-faint font-mono text-xs">type description...</span>
                    )}
                    {parsed.description && (
                      <span className="text-terminal-text-muted font-mono text-xs truncate">
                        | {parsed.description}
                      </span>
                    )}
                  </>
                )}
                {!parsed && (
                  <span className="text-terminal-text-faint font-mono text-xs">type project name after duration...</span>
                )}
              </div>
            )}

            {/* List */}
            <Command.List className="max-h-72 overflow-y-auto min-h-0">
              {/* Quick-add confirm item — only when description is provided */}
              {canSubmit && (
                <Command.Item
                  value={`quick-add-${inputValue}`}
                  keywords={[inputValue]}
                  onSelect={handleQuickAdd}
                  className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                >
                  <span className="text-terminal-green font-bold">+</span>
                  <span className="px-1.5 py-0.5 rounded border border-terminal-blue text-xs text-terminal-blue font-bold">
                    {formatDuration(parsed!.durationMin)}
                  </span>
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: matchedProject!.color }}
                  />
                  <span className="text-terminal-text-bright">{matchedProject!.name}</span>
                  <span className="text-terminal-text-muted truncate">| {parsed!.description}</span>
                  <span className="ml-auto text-terminal-green/60 text-xs">↵ add</span>
                </Command.Item>
              )}

              {/* Project fuzzy matches in quick-add mode */}
              {isQuickAddMode && parsed?.projectQuery && !canSubmit && projectMatches.length > 0 && (
                <Command.Group heading="[select project]">
                  {projectMatches.map((project) => (
                    <Command.Item
                      key={`qa-${project.id}`}
                      value={`quick-project-${project.name}`}
                      keywords={[project.name]}
                      onSelect={() => handleProjectSelect(project.name)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded font-mono text-sm text-terminal-text cursor-pointer"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span className="text-terminal-text-bright">{project.name}</span>
                      {clientNameById(project.clientId) && (
                        <span className="text-terminal-text-muted text-xs">
                          {clientNameById(project.clientId)}
                        </span>
                      )}
                      <span className="ml-auto text-terminal-text-faint text-xs">↵ select</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Quick-add hint when no project match yet */}
              {isQuickAddMode && parsed?.projectQuery && projectMatches.length === 0 && (
                <div className="py-6 text-center font-mono text-sm text-terminal-text-muted">
                  no matching projects for "{parsed.projectQuery}"
                </div>
              )}

              {/* Navigation — hidden in quick-add mode */}
              {!isQuickAddMode && (
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
              )}

              {/* Actions — hidden in quick-add mode */}
              {!isQuickAddMode && (
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
              )}

              {/* Projects — hidden in quick-add mode */}
              {!isQuickAddMode && activeProjects.length > 0 && (
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
                        <span className="text-terminal-text-muted text-xs">
                          {clientNameById(project.clientId)}
                        </span>
                      )}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {!isQuickAddMode && (
                <Command.Empty className="py-8 text-center font-mono text-sm text-terminal-text-muted">
                  no results found_
                </Command.Empty>
              )}
            </Command.List>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-terminal-border text-terminal-text-faint font-mono text-xs shrink-0">
              {isQuickAddMode ? (
                <span className="text-terminal-text-muted">
                  syntax:{' '}
                  <span className="text-terminal-blue/60">2h</span>{' '}
                  <span className="text-terminal-text-muted">project</span>{' '}
                  <span className="text-terminal-text-faint">|</span>{' '}
                  <span className="text-terminal-text-muted">description</span>
                </span>
              ) : (
                <span className="text-terminal-text-muted">
                  quick-add:{' '}
                  <span className="text-terminal-blue/60">2h</span>{' '}
                  <span className="text-terminal-text-muted">project</span>{' '}
                  <span className="text-terminal-text-faint">|</span>{' '}
                  <span className="text-terminal-text-muted">description</span>
                </span>
              )}
              <span className="ml-auto hidden sm:flex items-center gap-3">
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
              </span>
            </div>
          </div>
        </div>
      </Command.Dialog>
    </>
  )
}
