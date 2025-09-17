// Minimal, BOM-safe CSV parser for small files.
export interface CSVParseResult<T> {
  headers: string[];
  rows: T[];
}

export function stripBOM(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

export function parseCSVRaw(text: string): string[][] {
  const t = stripBOM(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  const pushCell = () => { row.push(cur); cur = ''; };
  const pushRow = () => { out.push(row); row = []; };

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQuotes) {
      if (ch === '"' && t[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') pushCell();
      else if (ch === '\n') { pushCell(); pushRow(); }
      else cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { pushCell(); pushRow(); }
  return out;
}

export function parseCSVObjects(text: string): CSVParseResult<Record<string, string>> {
  const rows = parseCSVRaw(text);
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map(h => h.trim());
  const objs = rows.slice(1)
    .filter(r => r.some(c => c.trim().length > 0))
    .map(r => {
      const o: Record<string, string> = {};
      headers.forEach((h, i) => { o[h] = (r[i] ?? '').trim(); });
      return o;
    });
  return { headers, rows: objs };
}

export function pick(obj: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const found = Object.keys(obj).find(h => h.toLowerCase() === k.toLowerCase());
    if (found) return obj[found];
  }
  return undefined;
}

export function toNumberSafe(s: string | undefined): number {
  if (s == null) return 0;
  const n = Number(String(s).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}