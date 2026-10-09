// Pure computation — safe to import from both Server and Client Components
import type { Lang } from './types'

/** Formats an ISO date (YYYY-MM-DD) as a long local date, e.g. "7 October 2026". */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(y, m - 1, d))
}
