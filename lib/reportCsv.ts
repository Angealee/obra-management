// Pure CSV assembly for the Reports module. No DOM, no server imports —
// unit-tested in tests/reportCsv.test.ts; the browser download itself lives in
// app/dashboard/reports/ReportActions.tsx.

export type CsvCell = string | number | null | undefined

/** RFC-4180 escaping: quote when the value contains a comma, quote, or newline. */
export function toCsvValue(value: CsvCell): string {
  const s = value == null ? '' : String(value)
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  return [headers, ...rows]
    .map(row => row.map(toCsvValue).join(','))
    .join('\r\n')
}
