import { useState, useEffect, useMemo, useCallback } from 'react'
import type { EntryWithProject } from '../types'
import type { DescriptionSuggestion } from '@timesheet/shared'
import { fuzzySearch } from '../lib/fuzzy'
import { ProjectBadge } from './ProjectBadge'
import { Input } from './ui/Input'
import { api } from '../api/client'

interface Suggestion {
  description: string
  projectId: string | null
  projectName: string | null
  projectColor: string | null
  clientName: string | null
}

interface DescriptionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  entries?: EntryWithProject[]
  onSubmit?: () => void
  onProjectSelect?: (projectId: string) => void
  placeholder?: string
  className?: string
}

interface UniqueDescription {
  description: string
  entry: EntryWithProject
}

export function DescriptionAutocomplete({
  value,
  onChange,
  entries,
  onSubmit,
  onProjectSelect,
  placeholder,
  className,
}: DescriptionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([])

  // Fetch suggestions from backend API with debounce
  useEffect(() => {
    if (value.length < 2) {
      setApiSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api.get<DescriptionSuggestion[]>(
          `/entries/descriptions?q=${encodeURIComponent(value)}`
        )
        setApiSuggestions(results)
      } catch {
        // fall back to local-only results silently
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  // Deduplicate descriptions, keeping the most recent entry for each unique description
  const uniqueDescriptions = useMemo(() => {
    if (!entries) return []
    const map = new Map<string, EntryWithProject>()
    // Entries are not guaranteed to be sorted, so we track the most recent by date
    for (const entry of entries) {
      if (!entry.description) continue
      const existing = map.get(entry.description)
      if (!existing || entry.date > existing.date) {
        map.set(entry.description, entry)
      }
    }
    const result: UniqueDescription[] = []
    for (const [description, entry] of map) {
      result.push({ description, entry })
    }
    return result
  }, [entries])

  // Use API suggestions when available, fall back to local fuzzy search
  const suggestions: Suggestion[] = useMemo(() => {
    if (apiSuggestions.length > 0) {
      return apiSuggestions.filter((s) => s.description !== value)
    }
    const matches = fuzzySearch(value, uniqueDescriptions, (item) => item.description)
    return matches
      .filter((m) => m.item.description !== value)
      .map((m) => ({
        description: m.item.description,
        projectId: m.item.entry.projectId,
        projectName: m.item.entry.project?.name ?? null,
        projectColor: m.item.entry.project?.color ?? null,
        clientName: m.item.entry.client?.name ?? null,
      }))
  }, [apiSuggestions, value, uniqueDescriptions])

  const handleSelect = useCallback(
    (suggestion: Suggestion) => {
      onChange(suggestion.description)
      if (suggestion.projectId) {
        onProjectSelect?.(suggestion.projectId)
      }
      setIsOpen(false)
      setSelectedIndex(0)
    },
    [onChange, onProjectSelect],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isOpen && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % suggestions.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          handleSelect(suggestions[selectedIndex])
          return
        }
        if (e.key === 'Escape') {
          setIsOpen(false)
          return
        }
      } else {
        if (e.key === 'Enter') {
          onSubmit?.()
          return
        }
      }
    },
    [isOpen, suggestions, selectedIndex, handleSelect, onSubmit],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
      setIsOpen(true)
      setSelectedIndex(0)
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    setIsOpen(false)
    setSelectedIndex(0)
  }, [])

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }, [suggestions])

  // Re-open when suggestions appear and input is focused
  const showDropdown = isOpen && suggestions.length > 0

  return (
    <div className={`relative ${className ?? ''}`}>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
      {showDropdown && (
        <div className="absolute z-10 bg-terminal-bg-light border border-terminal-border rounded-lg shadow-2xl mt-1 max-h-64 overflow-y-auto w-full">
          {suggestions.map((suggestion, index) => {
            const isSelected = index === selectedIndex
            return (
              <div
                key={suggestion.description}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(suggestion)
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-terminal-green/8 border-l-2 border-l-terminal-green'
                    : 'border-l-2 border-l-transparent'
                }`}
              >
                <span className="text-sm text-terminal-text-bright truncate mr-3">
                  {suggestion.description}
                </span>
                {suggestion.projectName && (
                  <ProjectBadge
                    name={suggestion.projectName}
                    color={suggestion.projectColor ?? '#888'}
                    clientName={suggestion.clientName}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
