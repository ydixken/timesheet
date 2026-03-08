import { useState, useMemo, useCallback } from 'react'
import type { EntryWithProject } from '../types'
import { fuzzySearch } from '../lib/fuzzy'
import { ProjectBadge } from './ProjectBadge'
import { Input } from './ui/Input'

interface DescriptionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  entries: EntryWithProject[]
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

  // Deduplicate descriptions, keeping the most recent entry for each unique description
  const uniqueDescriptions = useMemo(() => {
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

  // Run fuzzy search when value changes
  const suggestions = useMemo(() => {
    const matches = fuzzySearch(value, uniqueDescriptions, (item) => item.description)
    // Filter out exact matches of the current input
    return matches.filter((m) => m.item.description !== value)
  }, [value, uniqueDescriptions])

  const handleSelect = useCallback(
    (suggestion: UniqueDescription) => {
      onChange(suggestion.description)
      if (suggestion.entry.projectId) {
        onProjectSelect?.(suggestion.entry.projectId)
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
          handleSelect(suggestions[selectedIndex].item)
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
          {suggestions.map((match, index) => {
            const { description, entry } = match.item
            const isSelected = index === selectedIndex
            return (
              <div
                key={description}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(match.item)
                }}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-terminal-green/8 border-l-2 border-l-terminal-green'
                    : 'border-l-2 border-l-transparent'
                }`}
              >
                <span className="text-sm text-terminal-text-bright truncate mr-3">
                  {description}
                </span>
                {entry.project && (
                  <ProjectBadge
                    name={entry.project.name}
                    color={entry.project.color}
                    clientName={entry.client?.name}
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
