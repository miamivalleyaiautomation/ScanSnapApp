// FILE: src/utils/exporters.ts
import * as XLSX from 'xlsx'
// @ts-ignore
import jsPDF from 'jspdf'
// @ts-ignore
import autoTable from 'jspdf-autotable'

/** CSV export */
export function exportCSV(filename: string, rows: (string | number)[][], headers?: string[]) {
  const all = headers ? [headers, ...rows] : rows
  const csv = all.map(r => r.map(cell => {
    const s = String(cell ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

/** XLSX export */
export function exportXLSX(filename: string, rows: (string | number)[][], headers?: string[]) {
  const data = headers ? [headers, ...rows] : rows
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

/**
 * PDF export (A4 portrait, always light theme)
 * - Header (every page): favicon left + wordmark centered (aspect-true), divider below.
 * - Footer (every page): divider line, timestamp (left) + page/total (right).
 * - Table header: white bg, bold black text.
 * - QTY column: right-aligned and width estimated from content (not too wide).
 */
export async function exportPDF(
  filename: string,
  rows: (string | number)[][],
  headers?: string[]
) {
  const iconUrl = '/favicon_1024_light.png'
  const textUrl = '/text_1024_light.png'

  // Load images (keep aspect ratio)
  const [iconImg, textImg] = await Promise.all([loadImageInfo(iconUrl), loadImageInfo(textUrl)])

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Layout
  const marginL = 12
  const marginR = 12
  const headerTop = 10
  const iconH = 10
  const textH = 13
  const iconW = scaleWidth(iconImg, iconH)     // keep aspect
  const textW = scaleWidth(textImg, textH)     // keep aspect
  const headerBottomY = Math.max(headerTop + textH, headerTop + iconH) + 3
  const footerBottomPad = 8
  const footerY = pageH - footerBottomPad
  const footerLineY = footerY - 4              // divider sits just above footer text
  const tableTop = headerBottomY + 4
  const tableBottom = 12

  // Colors (light)
  const dividerGray = 180
  const textGray = 30

  // Column styles: detect QTY and right-align + auto width
  const colStyles: Record<number, any> = {}
  const qtyIdx = headers ? headers.findIndex(h => h.trim().toLowerCase() === 'qty') : -1
  if (qtyIdx >= 0) {
    const est = estimateQtyWidth(rows, qtyIdx) // mm
    colStyles[qtyIdx] = { halign: 'right', cellWidth: est }
  }

  autoTable(doc, {
    theme: 'grid',
    head: headers ? [headers] : undefined,
    body: rows,
    startY: tableTop,
    margin: { left: marginL, right: marginR, top: tableTop, bottom: tableBottom },
    styles: {
      fontSize: 9,
      cellPadding: 2.5,
      overflow: 'linebreak',
      lineColor: 220,
      lineWidth: 0.1
    },
    headStyles: {
      fillColor: [255, 255, 255],  // white header background
      textColor: [0, 0, 0],        // black header text
      fontStyle: 'bold',
      halign: 'left',
      lineColor: 180,
      lineWidth: 0.2
    },
    columnStyles: colStyles,
    didParseCell: (data: any) => {
      // Right-align the QTY header text too (visual consistency)
      if (data.section === 'head' && qtyIdx >= 0 && data.column.index === qtyIdx) {
        data.cell.styles.halign = 'right'
      }
    },
    didDrawPage: (data: any) => {
      // ----- Header -----
      try {
        doc.addImage(iconImg.dataURL, 'PNG', marginL, headerTop, iconW, iconH) // favicon
        const tx = (pageW - textW) / 2
        doc.addImage(textImg.dataURL, 'PNG', tx, headerTop, textW, textH)      // wordmark
      } catch {}
      // Header divider
      doc.setDrawColor(dividerGray)
      doc.setLineWidth(0.3)
      doc.line(marginL, headerBottomY, pageW - marginR, headerBottomY)

      // ----- Footer -----
      // Footer divider
      doc.line(marginL, footerLineY, pageW - marginR, footerLineY)

      // Footer text
      doc.setTextColor(textGray)
      doc.setFontSize(8)
      const ts = formatStamp(new Date())
      doc.text(ts, marginL, footerY)

      const totalPages = (doc as any).internal.getNumberOfPages?.() || doc.getNumberOfPages?.() || 1
      const pageNum = data?.pageNumber ?? (doc as any).getCurrentPageInfo?.().pageNumber ?? 1
      const rightText = `${pageNum}/${totalPages}`
      const tw = doc.getTextWidth(rightText)
      doc.text(rightText, pageW - marginR - tw, footerY)
    }
  })

  doc.save(filename)
}

/* ---------- helpers ---------- */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Load an image and return dataURL + natural size (keeps aspect ratio when drawing). */
async function loadImageInfo(url: string): Promise<{ dataURL: string; width: number; height: number }> {
  const res = await fetch(url)
  const blob = await res.blob()
  const objUrl = URL.createObjectURL(blob)
  try {
    const img = await loadHTMLImage(objUrl)
    const dataURL = await blobToDataURL(blob)
    return { dataURL, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height }
  } finally {
    URL.revokeObjectURL(objUrl)
  }
}
function loadHTMLImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
/** Given desired height, compute width preserving aspect ratio. */
function scaleWidth(meta: { width: number; height: number }, targetH: number): number {
  if (!meta.height || !meta.width) return targetH
  const ratio = meta.width / meta.height
  return targetH * ratio
}
/** Estimate a tight QTY column width from data (in mm), clamped to sane bounds. */
function estimateQtyWidth(rows: (string|number)[][], idx: number): number {
  // Why: keep QTY as narrow as needed while leaving room for big barcodes.
  let maxChars = 1
  for (const r of rows) {
    const v = r?.[idx]
    const s = String(v ?? '').trim()
    if (s.length > maxChars) maxChars = s.length
  }
  // approx char width at 9pt + padding; clamp between 14mm and 30mm
  const mm = Math.min(30, Math.max(14, maxChars * 2.2 + 8))
  return mm
}
function pad(n: number): string { return n < 10 ? `0${n}` : String(n) }
function formatStamp(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const ss = pad(d.getSeconds())
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}
