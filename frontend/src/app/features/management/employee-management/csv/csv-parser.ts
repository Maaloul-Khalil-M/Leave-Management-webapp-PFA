/**
 * RFC 4180 compliant CSV utility for parsing and serializing CSV data
 * without external library dependencies.
 */

export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsv).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsv(text: string): ParsedCsv {
  const rawRows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        currentCell = '';

        // Ignore empty lines
        if (currentRow.some((c) => c.length > 0)) {
          rawRows.push(currentRow);
        }
        currentRow = [];
      } else {
        currentCell += char;
      }
    }
  }

  // Flush remaining cell
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rawRows.push(currentRow);
    }
  }

  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rawRows[0].map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let r = 1; r < rawRows.length; r++) {
    const rowValues = rawRows[r];
    const rowObj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      rowObj[headers[h]] = rowValues[h] ?? '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}
