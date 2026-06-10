// Pure computation — safe to import from both Server and Client Components

/**
 * Quote a CSV cell. Cells starting with `=`, `+`, `-`, `@`, tab, or CR are
 * prefixed with a leading single-quote so spreadsheet apps treat them as text
 * instead of evaluating them as formulas (CVE-style "CSV injection").
 */
export function csvEscape(value: unknown): string {
  const s = String(value ?? '').replace(/"/g, '""')
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(s)
  return needsFormulaGuard ? `"'${s}"` : `"${s}"`
}
