import { GoLink } from '../types/link';
import { isReservedShortName, RESERVED_NAMES } from '../utils/resolver';

export interface CsvImportRow {
  rowNumber: number;
  shortName: string;
  targetUrl: string;
  description: string;
  category: string;
  isValid: boolean;
  errors: string[];
}

export interface CsvImportPreview {
  totalRows: number;
  validCount: number;
  errorCount: number;
  rows: CsvImportRow[];
}

/**
 * Escapes a single CSV value.
 */
function escapeCsvValue(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports all GoLinks to a clean CSV formatted string.
 */
export function exportLinksToCsv(links: GoLink[]): string {
  const headers = [
    'shortName',
    'targetUrl',
    'description',
    'category',
    'owner',
    'visibility',
    'isActive',
    'clickCount',
    'lastAccessedAt',
    'createdAt',
  ];

  const rows = links.map((link) => [
    link.shortName,
    link.targetUrl,
    link.description || '',
    link.category || 'General',
    link.owner,
    link.visibility,
    link.isActive,
    link.clickCount,
    link.lastAccessedAt || '',
    link.createdAt,
  ]);

  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvValue).join(',')),
  ];

  return csvLines.join('\n');
}

/**
 * Triggers a download of the CSV in the user's browser.
 */
export function downloadCsvFile(content: string, filename = 'golinks_export.csv'): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Robust CSV line parser supporting quoted strings with commas and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Parses and validates raw CSV content for bulk import.
 * Verifies shortName format, duplicate check (both within CSV and existing links),
 * reserved names, and targetUrl validation.
 */
export function parseAndValidateCsv(
  csvContent: string,
  existingLinks: GoLink[]
): CsvImportPreview {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      rows: [],
    };
  }

  // Parse header line
  const headerLine = lines[0];
  const headers = parseCsvLine(headerLine).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  const shortNameIdx = headers.findIndex((h) => h === 'shortname' || h === 'name' || h === 'shortcut');
  const targetUrlIdx = headers.findIndex((h) => h === 'targeturl' || h === 'url' || h === 'destination' || h === 'target');
  const descIdx = headers.findIndex((h) => h === 'description' || h === 'desc');
  const catIdx = headers.findIndex((h) => h === 'category' || h === 'dept' || h === 'department');

  // If no identifiable header, assume first 4 columns: shortName, targetUrl, description, category
  const hasHeaders = shortNameIdx !== -1 && targetUrlIdx !== -1;
  const startLine = hasHeaders ? 1 : 0;
  const finalShortIdx = hasHeaders ? shortNameIdx : 0;
  const finalUrlIdx = hasHeaders ? targetUrlIdx : 1;
  const finalDescIdx = hasHeaders ? descIdx : 2;
  const finalCatIdx = hasHeaders ? catIdx : 3;

  const existingMap = new Set(existingLinks.map((l) => l.shortName.toLowerCase()));
  const seenInBatch = new Set<string>();
  const parsedRows: CsvImportRow[] = [];

  for (let i = startLine; i < lines.length; i++) {
    const rowNum = i + 1;
    const values = parseCsvLine(lines[i]);
    const errors: string[] = [];

    const rawShort = (values[finalShortIdx] || '')
      .toLowerCase()
      .trim()
      .replace(/^go\//i, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const rawUrl = (values[finalUrlIdx] || '').trim();
    const rawDesc = finalDescIdx !== -1 && values[finalDescIdx] ? values[finalDescIdx].trim() : '';
    const rawCat = finalCatIdx !== -1 && values[finalCatIdx] ? values[finalCatIdx].trim() : 'General';

    // Validate shortName
    if (!rawShort) {
      errors.push('Short name is missing.');
    } else {
      if (rawShort.length < 2 || rawShort.length > 50) {
        errors.push('Short name must be 2–50 characters.');
      }
      if (!/^[a-z0-9\-_/]+$/.test(rawShort)) {
        errors.push('Contains invalid characters (only a-z, 0-9, -, _, / allowed).');
      }
      if (isReservedShortName(rawShort)) {
        errors.push(`"${rawShort}" is a reserved system keyword.`);
      }
      if (existingMap.has(rawShort)) {
        errors.push(`Shortcut "go/${rawShort}" already exists in directory.`);
      }
      if (seenInBatch.has(rawShort)) {
        errors.push(`Duplicate shortcut "go/${rawShort}" found within this CSV.`);
      }
    }

    // Validate targetUrl
    if (!rawUrl) {
      errors.push('Target destination URL is missing.');
    } else {
      const urlToCheck = rawUrl.replace(/%s/g, 'test_param');
      try {
        const parsed = new URL(urlToCheck);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          errors.push('URL must begin with http:// or https://');
        }
      } catch {
        errors.push('Invalid URL format.');
      }
    }

    if (rawShort) {
      seenInBatch.add(rawShort);
    }

    parsedRows.push({
      rowNumber: rowNum,
      shortName: rawShort,
      targetUrl: rawUrl,
      description: rawDesc,
      category: rawCat || 'General',
      isValid: errors.length === 0,
      errors,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.length - validCount;

  return {
    totalRows: parsedRows.length,
    validCount,
    errorCount,
    rows: parsedRows,
  };
}
