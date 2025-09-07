// FILE: src/utils/exporters.ts
import * as XLSX from 'xlsx'
// @ts-ignore
import jsPDF from 'jspdf'
// @ts-ignore
import autoTable from 'jspdf-autotable'

/** CSV */
export function exportCSV(filename: string, rows: (string | number)[][], headers?: string[]) {
  const all = headers ? [headers, ...rows] : rows
  const csv = all.map(r => r.map(cell => {
    const s = String(cell ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename)
}

/** XLSX */
export function exportXLSX(filename: string, rows: (string | number)[][], headers?: string[]) {
  const data = headers ? [headers, ...rows] : rows
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename)
}

/** PDF (always light): header (favicon+wordmark+divider) + footer (timestamp left, page/total right) on every page */
export async function exportPDF(
  filename: string,
  rows: (string | number)[][],
  headers?: string[]
) {
  const iconUrl = '/favicon_1024_light.png'
  const textUrl = '/text_1024_light.png'
  const [iconData, textData] = await Promise.all([toDataURL(iconUrl), toDataURL(textUrl)])

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // layout
  const marginL = 12
  const marginR = 12
  const headerTop = 10
  const iconH = 10
  const textH = 13
  const headerBottomY = Math.max(headerTop + textH, headerTop + iconH) + 3
  const footerBottom = 8
  const footerY = pageH - footerBottom
  const tableTop = headerBottomY + 4
  const tableBottom = 12

  // colors (light)
  const dividerGray = 180
  const textGray = 30

  // QTY column right align if header named QTY
  const colStyles: Record<number, any> = {}
  const qtyIdx = headers ? headers.findIndex(h => h.trim().toLowerCase() === 'qty') : -1
  if (qtyIdx >= 0) colStyles[qtyIdx] = { halign: 'right' }

  autoTable(doc, {
    theme: 'grid',
    head: headers ? [headers] : undefined,
    body: rows,
    startY: tableTop,
    margin: { left: marginL, right: marginR, top: tableTop, bottom: tableBottom },
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    columnStyles: colStyles,
    didDrawPage: () => {
      // Header
      try {
        const iconW = iconH
        doc.addImage(iconData, 'PNG', marginL, headerTop, iconW, iconH)
        const textW = 60
        const textX = (pageW - textW) / 2
        doc.addImage(textData, 'PNG', textX, headerTop, textW, textH)
      } catch {}
      doc.setDrawColor(dividerGray)
      doc.setLineWidth(0.3)
      doc.line(marginL, headerBottomY, pageW - marginR, headerBottomY)

      // Footer
      doc.setTextColor(textGray)
      doc.setFontSize(8)
      const ts = formatStamp(new Date())
      doc.text(ts, marginL, footerY)
      const page = String(doc.getCurrentPageInfo().pageNumber || (doc as any).internal.getNumberOfPages?.() || 1)
      const total = String((doc as any).internal.getNumberOfPages?.() || doc.getNumberOfPages?.() || 1)
      const rightText = `${page}/${total}`
      const txtW = doc.getTextWidth(rightText)
      doc.text(rightText, pageW - marginR - txtW, footerY)
    }
  })

  doc.save(filename)
}

/* helpers */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
async function toDataURL(url: string): Promise<string> {
  const res = await fetch(url)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
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
