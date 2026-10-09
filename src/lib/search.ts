// Pure computation — safe to import from both Server and Client Components

// Letters NFD leaves whole (no combining mark to strip), seen in athlete names.
const UNDECOMPOSED: Record<string, string> = { ø: 'o', æ: 'ae', œ: 'oe', ß: 'ss', đ: 'd', ł: 'l' }

/**
 * Case- and accent-insensitive form of a name for search matching, so
 * "arnstrom" finds "Erik Arnström" and "thiebaut" finds "Thiébaut Schirmer"
 * — people search on phones without typing å/ä/ö/é. Apply to both sides.
 */
export function foldForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[øæœßđł]/g, (c) => UNDECOMPOSED[c])
}

/** Whether `name` matches the search `query` (accent- and case-insensitive). */
export function matchesSearch(name: string, query: string): boolean {
  return foldForSearch(name).includes(foldForSearch(query.trim()))
}
