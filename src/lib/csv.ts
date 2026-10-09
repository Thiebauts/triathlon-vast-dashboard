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

/**
 * Assemble CSV lines into file contents. The leading UTF-8 byte-order mark
 * makes Excel decode the file as UTF-8 — without it "TriVäst" opens as
 * "TriVÃ¤st". Other spreadsheet apps ignore the mark.
 */
export function toCsvFile(lines: string[]): string {
  return '\uFEFF' + lines.join('\n')
}
