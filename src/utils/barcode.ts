// FILE: src/utils/barcode.ts
// Removed: codabar, databar, databar_limited, databar_expanded, itf, maxi_code, pdf417

export type Format =
  | 'aztec'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'data_matrix'
  | 'dx_film_edge'
  | 'ean_13'
  | 'ean_8'
  | 'micro_qr_code'
  | 'qr_code'
  | 'rm_qr_code'
  | 'upc_a'
  | 'upc_e'

export const ALL_FORMATS: Format[] = [
  'aztec',
  'code_128',
  'code_39',
  'code_93',
  'data_matrix',
  'dx_film_edge',
  'ean_13',
  'ean_8',
  'micro_qr_code',
  'qr_code',
  'rm_qr_code',
  'upc_a',
  'upc_e'
]

// Linear = 1D barcodes that remain
export const LINEAR_GROUP: Format[] = [
  'code_128',
  'code_39',
  'code_93',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'dx_film_edge'
]

// Matrix = 2D barcodes that remain
export const MATRIX_GROUP: Format[] = [
  'qr_code',
  'micro_qr_code',
  'rm_qr_code',
  'data_matrix',
  'aztec'
]

export type TrimRules = Record<Format, { prefix: number; suffix: number }>

export const DEFAULT_TRIMS: TrimRules = ALL_FORMATS
  .reduce((acc, f) => { acc[f] = { prefix: 0, suffix: 0 }; return acc }, {} as TrimRules)

// Typical retail defaults
DEFAULT_TRIMS.ean_13 = { prefix: 1, suffix: 1 }
DEFAULT_TRIMS.upc_a  = { prefix: 1, suffix: 1 }
DEFAULT_TRIMS.upc_e  = { prefix: 1, suffix: 1 }
DEFAULT_TRIMS.ean_8  = { prefix: 0, suffix: 0 }

/* ---------- EAN/UPC helpers ---------- */
export function computeEAN13CheckDigit(code12: string): number {
  const a = code12.padStart(12, '0').split('').map(Number)
  const sum = a.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}
export function computeEAN8CheckDigit(code7: string): number {
  const d = code7.split('').map(Number)
  const sum = d[0]*3 + d[1]*1 + d[2]*3 + d[3]*1 + d[4]*3 + d[5]*1 + d[6]*3
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

/* Validation: strict only for EAN/UPC; others pass-through */
export function validateCheckDigit(code: string, fmt: Format): boolean {
  if (!/^\d+$/.test(code)) return true
  if (fmt === 'ean_13' || fmt === 'upc_a') {
    if (code.length < 12) return true
    const body = code.slice(0, -1)
    const cd = Number(code.at(-1))
    return cd === computeEAN13CheckDigit(body)
  }
  if (fmt === 'ean_8') {
    if (code.length !== 8) return true
    const cd = Number(code.at(-1))
    return cd === computeEAN8CheckDigit(code.slice(0, 7))
  }
  return true
}

/* Optional check-digit stripping */
export function stripCheckDigit(code: string, fmt: Format, doStrip: boolean): string {
  if (!doStrip) return code
  if (fmt === 'ean_13' || fmt === 'upc_a' || fmt === 'ean_8' || fmt === 'upc_e') {
    return code.length > 1 ? code.slice(0, -1) : code
  }
  return code
}

/* Apply per-format trims */
export function applyTrims(raw: string, fmt: Format, trims: TrimRules): string {
  const t = trims[fmt]
  const left = Math.max(0, Math.min(raw.length, t.prefix))
  const right = Math.max(0, Math.min(raw.length - left, t.suffix))
  return raw.slice(left, raw.length - right)
}
