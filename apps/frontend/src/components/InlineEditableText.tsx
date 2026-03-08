import { useState, useRef, useEffect } from 'react'

interface InlineEditableTextProps {
  value: string
  onSave: (newValue: string) => Promise<void>
  placeholder?: string
  className?: string
}

export function InlineEditableText({ value, onSave, placeholder, className = '' }: InlineEditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Sync external value changes
  useEffect(() => {
    if (!editing) setText(value)
  }, [value, editing])

  async function handleSave() {
    const trimmed = text.trim()
    if (trimmed === value) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch {
      // revert on error
      setText(value)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setText(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') handleCancel()
          e.stopPropagation()
        }}
        onBlur={handleSave}
        onMouseDown={(e) => e.stopPropagation()}
        draggable={false}
        disabled={saving}
        className={`bg-transparent text-sm text-terminal-text-bright font-mono border-b border-b-terminal-green/50 outline-none py-0 px-0 ${className}`}
      />
    )
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      onMouseDown={(e) => e.stopPropagation()}
      draggable={false}
      title="Click to edit"
      className={`text-sm text-terminal-text-bright truncate cursor-text hover:border-b hover:border-b-terminal-green/30 ${className}`}
    >
      {value || <span className="text-terminal-text italic">{placeholder || 'no description'}</span>}
    </span>
  )
}
