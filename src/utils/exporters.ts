// FILE: src/utils/exporters.ts
import * as XLSX from 'xlsx';
// @ts-ignore - jspdf ships TS but default import is fine in Vite
import jsPDF from 'jspdf';
// @ts-ignore - plugin augments jsPDF at runtime
import autoTable from 'jspdf-autotable';
import type { VerifyRow } from '@/types/catalog';

/** CSV export (generic) */
export function exportCSV(
  filename: string,
  rows: (string | number)[][],
  headers?: string[],
  opts?: { bom?: boolean; newline?: '\n' | '\r\n' }
) {
  const newline = opts?.newline ?? '\r\n';
  const useBOM = opts?.bom !== false;

  const all = headers ? [headers, ...rows] : rows;
  const csvBody = all
    .map(r =>
      r
        .map(cell => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(',')
    )
    .join(newline);

  const parts: (string | BlobPart)[] = [];
  if (useBOM) parts.push('\ufeff'); // Why: Excel delimiter/encoding detection
  parts.push(csvBody);

  triggerDownload(new Blob(parts, { type: 'text/csv;charset=utf-8;' }), filename);
}

/** XLSX export (generic) */
export function exportXLSX(filename: string, rows: (string | number)[][], headers?: string[]) {
  const wb = XLSX.utils.book_new();
  const sheetRows = headers ? [headers, ...rows] : rows;
  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  XLSX.utils.book_append_sheet(wb, ws, 'ScanSnap');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    new Blob([wbout], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  );
}

/** PDF export (generic table with branding) */
export async function exportPDF(filename: string, rows: (string | number)[][], headers?: string[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' } as any);

  const pageW = (doc as any).internal.pageSize.getWidth?.() || 210;
  const marginL = 12,
    marginR = 12;
  const headerTop = 10;
  const footerY = 287;
  const headerBottomY = 24;
  const footerLineY = 280;

  const iconH = 8;
  const textH = 7;
  const dividerGray = 180;
  const textGray = 100;

  const iconImg = await loadImageInfo('/favicon_1024_dark.png');
  const textImg = await loadImageInfo('/text_1024_dark.png');
  const iconW = scaleWidth(iconImg, iconH);
  const textW = scaleWidth(textImg, textH);

  const headRow = headers ?? [];
  const bodyRows = rows.map(r => r.map(c => String(c ?? '')));

  (autoTable as any)(doc, {
    head: headRow.length ? [headRow] : undefined,
    body: bodyRows,
    startY: headerBottomY + 4,
    margin: { left: marginL, right: marginR },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    didDrawPage: (data: any) => {
      // Header images + dividers (Why: brand + readability when printed)
      try {
        doc.addImage(iconImg.dataURL, 'PNG', marginL, headerTop, iconW, iconH);
        const tx = (pageW - textW) / 2;
        doc.addImage(textImg.dataURL, 'PNG', tx, headerTop, textW, textH);
      } catch {}
      doc.setDrawColor(dividerGray);
      doc.setLineWidth(0.3);
      doc.line(marginL, headerBottomY, pageW - marginR, headerBottomY);
      doc.line(marginL, footerLineY, pageW - marginR, footerLineY);
      doc.setTextColor(textGray);
      doc.setFontSize(8);
      const ts = formatStamp(new Date());
      doc.text(ts, marginL, footerY);
      const totalPages =
        (doc as any).internal.getNumberOfPages?.() || doc.getNumberOfPages?.() || 1;
      const pageNum = data?.pageNumber ?? (doc as any).getCurrentPageInfo?.().pageNumber ?? 1;
      const rightText = `${pageNum}/${totalPages}`;
      const tw = doc.getTextWidth(rightText);
      doc.text(rightText, pageW - marginR - tw, footerY);
    },
  } as any);

  triggerDownload((doc as any).output('blob'), filename);
}

/* ---------- Verify-specific convenience exporters ---------- */

export function exportVerifyCSV(filename: string, items: VerifyRow[]) {
  const headers = ['Barcode', 'Required', 'Scanned', 'Status'];
  const rows = items.map(r => [r.barcode, r.required, r.scanned, r.status]);
  exportCSV(filename, rows, headers);
}

export async function exportVerifyPDF(filename: string, items: VerifyRow[]) {
  const headers = ['Barcode', 'Required', 'Scanned', 'Status'];
  const rows = items.map(r => [r.barcode, String(r.required), String(r.scanned), r.status]);
  await exportPDF(filename, rows, headers);
}

/* ---------- helpers ---------- */

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function loadImageInfo(url: string): Promise<{ dataURL: string; width: number; height: number }> {
  const res = await fetch(url);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  try {
    const img = await loadHTMLImage(objUrl);
    const dataURL = await blobToDataURL(blob);
    return { dataURL, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
  } finally {
    URL.revokeObjectURL(objUrl);
  }
}
function loadHTMLImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
function scaleWidth(meta: { width: number; height: number }, targetH: number): number {
  if (!meta.height || !meta.width) return targetH;
  const ratio = meta.width / meta.height;
  return targetH * ratio;
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function formatStamp(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}
