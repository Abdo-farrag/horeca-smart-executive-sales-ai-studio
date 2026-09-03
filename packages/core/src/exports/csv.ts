export type CsvRow = Record<string, unknown>;

const csvValue = (value: unknown): string => {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const escapeCsvCell = (value: unknown): string => {
  const raw = csvValue(value);
  if (/[\",\n\r]/.test(raw)) return `\"${raw.replace(/\"/g, '\"\"')}\"`;
  return raw;
};

export function serializeCsv(rows: CsvRow[]): string {
  if (!rows.length) return '\uFEFF';
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const body = [
    columns.map(escapeCsvCell).join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(',')),
  ].join('\r\n');
  return `\uFEFF${body}`;
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return;
  const safeFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const blob = new Blob([serializeCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
