import { useEffect, useState, useRef } from 'react'
import type { Client, CreateClientInput, UpdateClientInput } from '@timesheet/shared'
import { useClients } from '../hooks/useClients'
import { api } from '../api/client'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { formatDecimalHours } from '../lib/time'

type ClientWithStats = Client & { projectCount: number; totalMinutes: number }

export function Clients() {
  const { clients, loading, fetch: fetchClients } = useClients()
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed')
  const [editingClient, setEditingClient] = useState<ClientWithStats | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  const typedClients = clients as ClientWithStats[]

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
    await api.del(`/clients/${id}`)
    setDeletingId(null)
    fetchClients()
  }

  async function handleSave(data: CreateClientInput | UpdateClientInput) {
    if (formMode === 'edit' && editingClient) {
      await api.put(`/clients/${editingClient.id}`, data)
    } else {
      await api.post('/clients', data)
    }
    handleClose()
    fetchClients()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-heading text-2xl font-bold text-terminal-text-bright">$ clients</h1>
        <Button variant="filled" onClick={handleCreate}>
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
        <p className="text-terminal-text font-mono animate-blink">loading...</p>
      ) : typedClients.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-terminal-text font-mono">No clients yet. Add your first client.</p>
        </div>
      ) : (
        <div className="border border-terminal-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-terminal-border">
                <th className="text-left text-xs font-mono text-terminal-text px-4 py-3">Name</th>
                <th className="text-left text-xs font-mono text-terminal-text px-4 py-3">Email</th>
                <th className="text-right text-xs font-mono text-terminal-text px-4 py-3">Projects</th>
                <th className="text-right text-xs font-mono text-terminal-text px-4 py-3">Hours</th>
                <th className="text-right text-xs font-mono text-terminal-text px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {typedClients.map((client) => (
                <tr
                  key={client.id}
                  className="group border-b border-terminal-border last:border-b-0 bg-terminal-bg-light hover:border-l-2 hover:border-l-terminal-green transition-all"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {client.logoPath && (
                        <img
                          src={`/api/uploads/${client.logoPath}`}
                          alt=""
                          className="h-6 w-6 rounded object-contain bg-terminal-surface"
                        />
                      )}
                      <span className="text-sm text-terminal-text-bright font-mono">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-terminal-text">
                    {client.email || '\u2014'}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-terminal-text text-right">
                    {client.projectCount}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-terminal-text-bright text-right">
                    {formatDecimalHours(client.totalMinutes)}h
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(client)}
                        className="text-terminal-text hover:text-terminal-blue cursor-pointer p-1"
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
                            className="text-terminal-danger hover:text-terminal-danger/80 cursor-pointer"
                          >
                            confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-terminal-text hover:text-terminal-text-bright cursor-pointer"
                          >
                            cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setDeletingId(client.id)}
                          className="text-terminal-text hover:text-terminal-danger cursor-pointer p-1"
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
          </table>
        </div>
      )}
    </div>
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
      setError(err instanceof Error ? err.message : 'Failed to save')
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
      setError('Logo upload failed')
      return
    }
    const data = await res.json() as { logoPath: string }
    setLogoPreview(data.logoPath)
  }

  async function handleLogoRemove() {
    if (!client) return
    await api.put(`/clients/${client.id}`, { logoPath: null })
    setLogoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const isEditing = client !== null

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-terminal-bg-light border border-terminal-border rounded-lg p-6 mb-6"
    >
      <h2 className="text-sm font-mono text-terminal-green mb-4">
        {isEditing ? `-- Edit: ${client.name}` : '-- New client'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Client name"
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
            className="bg-terminal-surface border border-terminal-border text-terminal-text-bright font-mono px-3 py-2 rounded text-sm focus:outline-none focus:border-terminal-green focus:ring-1 focus:ring-terminal-green/30 placeholder:text-terminal-text/50 resize-y"
          />
        </div>

        {isEditing && (
          <div className="md:col-span-2 flex flex-col gap-2">
            <label className="text-sm text-terminal-text-bright font-mono">Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <img
                  src={`/api/uploads/${logoPreview}`}
                  alt="Logo"
                  className="max-h-16 rounded bg-terminal-surface p-1"
                />
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
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5"
              >
                upload new
              </Button>
              {logoPreview && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleLogoRemove}
                  className="text-xs px-3 py-1.5"
                >
                  remove
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-terminal-danger mt-3 font-mono">{error}</p>}

      <div className="flex items-center gap-3 mt-4">
        <Button type="submit" variant="filled" disabled={saving}>
          {saving ? 'saving...' : 'save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          cancel
        </Button>
      </div>
    </form>
  )
}
