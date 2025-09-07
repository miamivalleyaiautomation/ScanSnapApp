import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportCSV(name: string, rows: (string|number)[][], head?: string[]) {
  const csv = [head ?? [], ...rows]
    .filter(r=>r.length)
    .map(r => r.map(v => {
      const s = String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s
    }).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = name.endsWith('.csv')?name:`${name}.csv`; a.click(); URL.revokeObjectURL(a.href)
}

export function exportXLSX(name: string, rows: (string|number)[][], head?: string[]) {
  const ws = XLSX.utils.aoa_to_sheet(head ? [head, ...rows] : rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, name.endsWith('.xlsx')?name:`${name}.xlsx`)
}

export function exportPDF(name: string, rows: (string|number)[][], head?: string[]) {
  const doc = new jsPDF({orientation:'p',unit:'pt',format:'a4'})
  autoTable(doc, { head: head?[head]:undefined, body: rows, styles:{fontSize:10} })
  doc.save(name.endsWith('.pdf')?name:`${name}.pdf`)
}
