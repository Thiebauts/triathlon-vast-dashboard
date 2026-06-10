// Pure computation — safe to import from both Server and Client Components

/**
 * Deep-link hash format: `#<tab>` or `#<tab>/<param>`, where param is the
 * tab's primary selection (results → sport, athletes → athlete name,
 * extra → event date). Examples:
 *   #extra/2026-06-10
 *   #athletes/Jonathan%20Flod
 *   #results/swimming
 * The overview tab maps to no hash at all (the bare dashboard URL).
 */

export const TABS = ['overview', 'results', 'athletes', 'rankings', 'extra'] as const
export type Tab = (typeof TABS)[number]

export function parseHash(hash: string): { tab: Tab; param: string | null } | null {
  const raw = hash.replace(/^#/, '')
  if (!raw) return null
  const [tabPart, ...rest] = raw.split('/')
  if (!(TABS as readonly string[]).includes(tabPart)) return null
  let param: string | null = rest.length ? rest.join('/') : null
  if (param) {
    try {
      param = decodeURIComponent(param)
    } catch {
      // Malformed percent-encoding (hand-edited URL) — keep the raw value
    }
  }
  return { tab: tabPart as Tab, param }
}

export function buildHash(tab: Tab, param?: string | null): string {
  if (tab === 'overview') return ''
  return param ? `#${tab}/${encodeURIComponent(param)}` : `#${tab}`
}
