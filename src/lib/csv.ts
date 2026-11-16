/**
 * One CSV cell: quoted, with quotes doubled, and with a leading apostrophe
 * on values a spreadsheet would treat as a formula (CSV injection).
 */
export function csvCell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
