'use client'
import { useId, useMemo, useRef, useState } from 'react'
import { t, tf } from '@/lib/translations'
import { matchesSearch } from '@/lib/search'
import type { Lang } from '@/lib/types'

const MAX_RESULTS = 8

interface Props {
  athleteNames: string[]
  lang: Lang
  onSelect: (name: string) => void
}

/**
 * Header search: type part of a name (accents optional) and pick an athlete
 * to open their profile. Follows the ARIA combobox pattern so it works with
 * the keyboard (↑ ↓ Enter Escape) and screen readers.
 */
export function AthleteSearch({ athleteNames, lang, onSelect }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const trimmed = query.trim()
  const matches = useMemo(
    () => (trimmed.length < 2 ? [] : athleteNames.filter((n) => matchesSearch(n, trimmed)).slice(0, MAX_RESULTS)),
    [athleteNames, trimmed],
  )
  const showList = open && trimmed.length >= 2

  const choose = (name: string) => {
    setQuery('')
    setOpen(false)
    setActive(0)
    // Leave the field: the phone keyboard closes and the page gets the focus
    inputRef.current?.blur()
    onSelect(name)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % matches.length)
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault()
      setActive((i) => (i + matches.length - 1) % matches.length)
    } else if (e.key === 'Enter' && showList && matches[active]) {
      e.preventDefault()
      choose(matches[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative w-full" role="search" aria-label={t('search_athletes', lang)}>
      <label htmlFor={`${id}-input`} className="sr-only">{t('search_athletes', lang)}</label>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        <circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />
      </svg>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches[active] ? `${id}-opt-${active}` : undefined}
        placeholder={t('search_athletes', lang)}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        // Delay so a click on an option lands before the list closes
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        className="h-12 w-full rounded border border-[#8a8e94] bg-white pl-11 pr-3 text-[15px] text-navy placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      <ul id={listId} role="listbox" aria-label={t('search_athletes', lang)} hidden={!showList}
        className="absolute left-0 right-0 top-[52px] z-30 m-0 list-none rounded-[4px_4px_24px_4px] border border-line bg-white p-1.5 shadow-lg">
        {matches.map((name, i) => (
          <li key={name} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}
            // mousedown, not click: fires before the input's blur closes the list
            onMouseDown={(e) => { e.preventDefault(); choose(name) }}
            onMouseEnter={() => setActive(i)}
            className={`flex min-h-11 cursor-pointer items-center rounded border-l-4 px-2.5 text-[15px] font-semibold text-navy ${i === active ? 'border-brand bg-mist' : 'border-transparent'}`}>
            {name}
          </li>
        ))}
        {showList && matches.length === 0 && (
          <li role="option" aria-selected={false} aria-disabled="true" className="px-2.5 py-2 text-[15px] text-muted">{t('search_no_match', lang)}</li>
        )}
      </ul>
      <span className="sr-only" aria-live="polite">{!showList ? '' : matches.length > 0 ? tf('search_results_count', lang, { n: matches.length }) : t('search_no_match', lang)}</span>
    </div>
  )
}
