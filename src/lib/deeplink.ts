// Pure computation — safe to import from both Server and Client Components

/**
 * Deep-link hash format: `#<tab>[/<segment>...]`, where the segments are the
 * tab's selections in a fixed order:
 *   #results/<sport>[/<year>[/<category>]]   e.g. #results/swimming/2024/women
 *   #athletes/<name>                         e.g. #athletes/Anton%20S%C3%B6fting
 *   #extra/<date>[/<category>]               e.g. #extra/2026-06-10/women
 *   #rankings[/<year>]                       e.g. #rankings/2024
 * Trailing 'all' segments are omitted when building; a missing segment means
 * the default. The overview tab maps to no hash at all (the bare URL).
 */

export const TABS = ['overview', 'results', 'athletes', 'rankings', 'extra'] as const
export type Tab = (typeof TABS)[number]

export function parseHash(hash: string): { tab: Tab; params: string[] } | null {
  const raw = hash.replace(/^#/, '')
  if (!raw) return null
  const [tabPart, ...rest] = raw.split('/')
  if (!(TABS as readonly string[]).includes(tabPart)) return null
  const params = rest.map((seg) => {
    try {
      return decodeURIComponent(seg)
    } catch {
      // Malformed percent-encoding (hand-edited URL) — keep the raw value
      return seg
    }
  })
  return { tab: tabPart as Tab, params }
}

export function buildHash(tab: Tab, params: Array<string | null | undefined> = []): string {
  if (tab === 'overview') return ''
  const segs = [...params]
  // Trailing defaults add noise: #results/swimming, not #results/swimming/all/all
  while (segs.length && (segs[segs.length - 1] == null || segs[segs.length - 1] === 'all')) {
    segs.pop()
  }
  // A missing middle segment is not expressible — keep its position as 'all'
  const parts = segs.map((s) => encodeURIComponent(s ?? 'all'))
  return parts.length ? `#${tab}/${parts.join('/')}` : `#${tab}`
}
