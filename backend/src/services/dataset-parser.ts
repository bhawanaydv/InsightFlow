import path from 'node:path';
import { parse as parseCsv } from 'csv-parse/sync';
import { readSheet } from 'read-excel-file/node';
import { HttpError } from '../utils/http-error.js';

export type ParsedDataset = { columns: string[]; rows: Record<string, unknown>[]; detectedTypes: Record<string, string> };
const allowedMimeTypes = new Set([
  'text/csv', 'application/csv', 'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream',
]);

function inferType(values: unknown[]) {
  const present = values.filter((value) => value !== null && value !== undefined && String(value).trim() !== '');
  if (present.length === 0) return 'empty';
  if (present.every((value) => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))))) return 'number';
  if (present.every((value) => ['true', 'false'].includes(String(value).toLowerCase()))) return 'boolean';
  if (present.every((value) => !Number.isNaN(Date.parse(String(value))) && /[-/:T]/.test(String(value)))) return 'date';
  return 'text';
}

function uniqueHeaders(values: unknown[]) {
  const used = new Set<string>();
  return values.map((value, index) => {
    const base = String(value ?? '').trim() || `Column ${index + 1}`;
    let candidate = base;
    let count = 2;
    while (used.has(candidate)) candidate = `${base} (${count++})`;
    used.add(candidate);
    return candidate;
  });
}

export async function parseDataset(buffer: Buffer, filename: string, mimeType?: string): Promise<ParsedDataset> {
  const ext = path.extname(filename).toLowerCase();
  if (!['.csv', '.xlsx'].includes(ext)) throw new HttpError(415, 'Upload a CSV or XLSX file.');
  if (mimeType && !allowedMimeTypes.has(mimeType.toLowerCase())) throw new HttpError(415, 'This file type is not supported. Upload a CSV or XLSX file.');
  if (buffer.length === 0) throw new HttpError(400, 'The uploaded file is empty.');

  let columns: string[];
  let rows: Record<string, unknown>[];
  try {
    if (ext === '.csv') {
      rows = parseCsv(buffer, { bom: true, columns: (headers: string[]) => uniqueHeaders(headers), skip_empty_lines: true, trim: true, relax_column_count: false, max_record_size: 1_000_000 });
      columns = rows.length ? Object.keys(rows[0]!) : [];
    } else {
      if (buffer.subarray(0, 2).toString() !== 'PK') throw new Error('Invalid XLSX signature');
      const matrix = await readSheet(buffer);
      const headers = uniqueHeaders(matrix.shift() ?? []);
      columns = headers;
      rows = matrix.filter((row) => row.some((cell) => cell !== null && String(cell).trim() !== '')).map((row) => Object.fromEntries(headers.map((header, i) => {
        const value = row[i];
        return [header, value instanceof Date ? value.toISOString() : value ?? null];
      })));
      if (rows.length > 100_000) throw new HttpError(400, 'This file has more than 100,000 rows.');
    }
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'We could not read this file. Check that it is a valid CSV or XLSX file.');
  }
  if (columns.length === 0) throw new HttpError(400, 'The file does not contain a header row.');
  if (columns.length > 500) throw new HttpError(400, 'This file has more than 500 columns.');
  if (rows.length > 100_000) throw new HttpError(400, 'This file has more than 100,000 rows.');
  const detectedTypes = Object.fromEntries(columns.map((column) => [column, inferType(rows.slice(0, 100).map((row) => row[column]))]));
  return { columns, rows, detectedTypes };
}

export async function validateUpload(buffer: Buffer, filename: string, mimeType: string, maxBytes: number) {
  if (buffer.length > maxBytes) throw new HttpError(413, `This file is larger than the ${Math.round(maxBytes / 1024 / 1024)} MB upload limit.`);
  return await parseDataset(buffer, filename, mimeType);
}
