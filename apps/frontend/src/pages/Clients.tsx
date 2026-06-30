import { useEffect, useMemo, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Client, CreateClientInput, UpdateClientInput } from '@timesheet/shared'
import { useClients } from '../hooks/useClients'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { toast } from '../store/toasts'
import { hexToRgba } from '../lib/color'
import { formatDecimalHours } from '../lib/time'

type ClientWithStats = Client & { projectCount: number; totalMinutes: number }

// Deterministic avatar accent per client name — mirrors the chart palette hues so
// the initials chip and the inline hours bar share one identity color per client.
const AVATAR_COLORS = ['#39ff14', '#00d9ff', '#bd93f9', '#f1fa8c', '#2ed573', '#ff5555']

function colorForName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function ClientAvatar({ name, logoPath }: { name: string; logoPath?: string | null }) {
  if (logoPath) {
    return (
      <img
        src={`/api/uploads/${logoPath}`}
        alt=""
        className="h-8 w-8 shrink-0 rounded object-contain bg-terminal-surface"
      />
    )
  }
  const color = colorForName(name)
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded font-mono text-xs font-bold"
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.14),
        border: `1px solid ${hexToRgba(color, 0.4)}`,
      }}
    >
      {initials(name)}
    </span>
  )
}

export function Clients() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { clients, loading, error, fetch: fetchClients } = useClients()
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    const action = searchParams.get('action')
    if (action === 'create') {
      setFormMode('create')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const typedClients = clients as ClientWithStats[]

  // Scale for the inline hours bars + the totals footer — derived, no extra fetch.
  const maxMinutes = useMemo(
    () => Math.max(1, ...typedClients.map((c) => c.totalMinutes)),
    [typedClients]
  )
  const totals = useMemo(
    () => ({
      projects: typedClients.reduce((sum, c) => sum + c.projectCount, 0),
      minutes: typedClients.reduce((sum, c) => sum + c.totalMinutes, 0),
    }),
    [typedClients]
  )

  function handleCreate() {
    setFormMode('create')
    setEditingClient(null)
  }

  function handleEdit(client: ClientWithStats) {
    setFormMode('edit')
    setEditingClient(client)
  }

  function handleClose() {
    setFormMode('closed')
    setEditingClient(null)
  }

  async function handleDelete(id: string) {
    try {
      await api.del(`/clients/${id}`)
      toast({ variant: 'success', message: 'Client deleted' })
      fetchClients()
    } catch {
      toast({ variant: 'danger', message: 'Failed to delete client' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSave(data: CreateClientInput | UpdateClientInput) {
    if (formMode === 'edit' && editingClient) {
      await api.put(`/clients/${editingClient.id}`, data)
      toast({ variant: 'success', message: 'Client updated' })
    } else {
      await api.post('/clients', data)
      toast({ variant: 'success', message: 'Client created' })
    }
    handleClose()
    fetchClients()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading text-2xl font-bold text-terminal-text-bright font-mono">clients</h1>
        <Button variant="filled" className="active:translate-y-px" onClick={handleCreate}>
          + new
        </Button>
      </div>

      {formMode !== 'closed' && (
        <ClientForm
          client={editingClient}
          onSave={handleSave}
          onCancel={handleClose}
        />
      )}

      {loading ? (
        <ClientsSkeleton />
      ) : error ? (
        <ErrorState message="Failed to load clients." onRetry={fetchClients} />
      ) : typedClients.length === 0 ? (
        <EmptyState
          prompt="no clients yet"
          message="Add your first client to start grouping projects and tracking billable hours."
          action={{ label: '+ new client', onClick: handleCreate }}
        />
      ) : (
        <Card padding="none" className="overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-terminal-surface text-left text-[11px] uppercase tracking-wide text-terminal-text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="hidden sm:table-cell px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 text-center font-medium">Projects</th>
                  <th className="px-4 py-3 text-right font-medium">Hours</th>
                  <th className="hidden md:table-cell px-4 py-3 w-40 font-medium"></th>
                  <th className="px-4 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {typedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="group border-t border-terminal-border bg-terminal-bg-light transition-colors hover:border-l-2 hover:border-l-terminal-green focus-within:ring-1 focus-within:ring-inset focus-within:ring-terminal-green/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <ClientAvatar name={client.name} logoPath={client.logoPath} />
                        <span className="text-terminal-text-bright">{client.name}</span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-terminal-text-muted">
                      {client.email || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="muted">{client.projectCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-data text-terminal-text-bright whitespace-nowrap">
                      {formatDecimalHours(client.totalMinutes)}h
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <ProgressBar
                        value={client.totalMinutes}
                        max={maxMinutes}
                        color={colorForName(client.name)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 transition-opacity ${
                          deletingId === client.id
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
                        }`}
                      >
                        <button
                          onClick={() => handleEdit(client)}
                          className="rounded p-1 text-terminal-text-muted transition-colors cursor-pointer hover:text-terminal-blue focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                          title="Edit"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        {deletingId === client.id ? (
                          <span className="flex items-center gap-1 text-xs font-mono">
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="rounded px-1 text-terminal-danger transition-colors cursor-pointer hover:text-terminal-danger/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-danger/60"
                            >
                              confirm
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="rounded px-1 text-terminal-text-muted transition-colors cursor-pointer hover:text-terminal-text-bright focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-green/60"
                            >
                              cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingId(client.id)}
                            className="rounded p-1 text-terminal-text-muted transition-colors cursor-pointer hover:text-terminal-danger focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-terminal-danger/60"
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-terminal-border bg-terminal-surface">
                  <td colSpan={2} className="px-4 py-3 font-medium text-terminal-text-bright">
                    Total
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant="muted">{totals.projects}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-data font-medium text-terminal-green whitespace-nowrap">
                    {formatDecimalHours(totals.minutes)}h
                  </td>
                  <td className="hidden md:table-cell px-4 py-3" />
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ClientsSkeleton() {
  return (
    <Card padding="none" className="overflow-hidden animate-fade-in">
      <div className="divide-y divide-terminal-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="hidden sm:block h-3 w-40" />
            <Skeleton className="h-5 w-8 rounded-sm ml-auto" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="hidden md:block h-2 w-40" />
          </div>
        ))}
      </div>
    </Card>
  )
}

function ClientForm({
  client,
  onSave,
  onCancel,
}: {
  client: ClientWithStats | null
  onSave: (data: CreateClientInput | UpdateClientInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(client?.name ?? '')
  const [email, setEmail] = useState(client?.email ?? '')
  const [address, setAddress] = useState(client?.address ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [logoPreview, setLogoPreview] = useState(client?.logoPath ?? null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        email: email.trim() || null,
        address: address.trim() || null,
      })
    } catch (err) {
      toast({
        variant: 'danger',
        message: err instanceof Error ? err.message : 'Failed to save client',
      })
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!client) return
    const formData = new FormData()
    formData.append('logo', file)
    const res = await fetch(`/api/clients/${client.id}/logo`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (!res.ok) {
      toast({ variant: 'danger', message: 'Logo upload failed' })
      return
    }
    const data = await res.json() as { logoPath: string }
    setLogoPreview(data.logoPath)
    toast({ variant: 'success', message: 'Logo uploaded' })
  }

  async function handleLogoRemove() {
    if (!client) return
    try {
      await api.put(`/clients/${client.id}`, { logoPath: null })
      setLogoPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      toast({ variant: 'success', message: 'Logo removed' })
    } catch {
      toast({ variant: 'danger', message: 'Failed to remove logo' })
    }
  }

  const isEditing = client !== null

  return (
    <Card accent padding="lg" as="form" onSubmit={handleSubmit} className="mb-6 animate-fade-in">
      <div className="mb-4 text-label-caps text-terminal-text-muted text-xs tracking-[0.08em]">
        <span className="text-terminal-green"># </span>
        {isEditing ? `edit: ${client.name}` : 'new client'}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
          error={error || undefined}
          required
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Optional"
        />
        <div className="md:col-span-2 flex flex-col gap-1">
          <label className="text-sm text-terminal-text-bright font-mono">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Optional — used verbatim in PDF export"
            rows={3}
            className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-prose px-3 py-2 rounded text-sm transition-colors duration-150 focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text-muted resize-y"
          />
        </div>

        {isEditing && (
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-sm text-terminal-text-bright font-mono">Logo</label>
            <div className="flex items-center gap-4 rounded-lg border border-dashed border-terminal-border bg-terminal-inset p-4">
              {logoPreview ? (
                <img
                  src={`/api/uploads/${logoPreview}`}
                  alt="Logo"
                  className="max-h-16 rounded bg-terminal-surface p-1"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-terminal-surface font-mono text-xs text-terminal-text-faint">
                  none
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleLogoUpload(file)
                }}
                className="hidden"
              />
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs px-3 py-1.5 active:translate-y-px"
                  >
                    upload new
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleLogoRemove}
                      className="text-xs px-3 py-1.5 active:translate-y-px"
                    >
                      remove
                    </Button>
                  )}
                </div>
                <span className="text-[11px] text-terminal-text-muted font-mono">PNG, JPG, or SVG</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <Button type="submit" variant="filled" className="active:translate-y-px" disabled={saving}>
          {saving ? 'saving...' : 'save'}
        </Button>
        <Button type="button" variant="outline" className="active:translate-y-px" onClick={onCancel}>
          cancel
        </Button>
      </div>
    </Card>
  )
}
