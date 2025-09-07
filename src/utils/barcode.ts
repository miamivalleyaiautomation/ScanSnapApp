// FILE: src/utils/barcode.ts

export type Symbology = 'CODE_128' | 'EAN_13' | 'EAN_8' | 'UPC_A' | 'UPC_E'
export type TrimRules = Record<Symbology, { prefix: number; suffix: number }>

/**
 * vue-qrcode-reader format strings for the supported symbologies.
 * Keep in sync with <QrcodeStream :formats="...">.
 */
export const SYM_TO_VQRR: Record<Symbology, string> = {
  CODE_128: 'code_128',
  EAN_13: 'ean_13',
  EAN_8: 'ean_8',
  UPC_A: 'upc_a',
  UPC_E: 'upc_e',
}

/** Basic list used by Setup (matches imports in App.vue). */
export const ALL_SYMS: Symbology[] = ['CODE_128', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E']

/** Default trims; EAN/UPC often printed with side guards you may want to trim. */
export const DEFAULT_TRIMS: TrimRules = {
  CODE_128: { prefix: 0, suffix: 0 },
  EAN_13: { prefix: 1, suffix: 1 },
  EAN_8: { prefix: 0, suffix: 0 },
  UPC_A: { prefix: 1, suffix: 1 },
  UPC_E: { prefix: 1, suffix: 1 },
}

/* ---------- EAN/UPC check digit helpers ---------- */

export function computeEAN13CheckDigit(code12: string): number {
  // Why: EAN-13 (and UPC-A) share the same CD algorithm (weight 1/3 alternating).
  const a = code12.padStart(12, '0').split('').map(Number)
  const sum = a.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

export function computeEAN8CheckDigit(code7: string): number {
  const d = code7.split('').map(Number)
  const sum = d[0] * 3 + d[1] * 1 + d[2] * 3 + d[3] * 1 + d[4] * 3 + d[5] * 1 + d[6] * 3
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

/**
 * Best-effort validation for EAN/UPC; non-numeric values are considered OK
 * to avoid blocking alphanumeric symbologies like CODE_128.
 */
export function validateCheckDigit(code: string, sym: Symbology): boolean {
  if (!/^\d+$/.test(code)) return true
  if (sym === 'EAN_13' || sym === 'UPC_A') {
    if (code.length < 12) return true
    const body = code.slice(0, -1)
    const cd = Number(code.at(-1))
    return cd === computeEAN13CheckDigit(body)
  }
  if (sym === 'EAN_8') {
    if (code.length !== 8) return true
    const cd = Number(code.at(-1))
    return cd === computeEAN8CheckDigit(code.slice(0, 7))
  }
  return true
}

/** Optionally strip trailing check digit for EAN/UPC-like codes. */
export function stripCheckDigit(code: string, sym: Symbology, doStrip: boolean): string {
  if (!doStrip) return code
  if (sym === 'EAN_13' || sym === 'UPC_A' || sym === 'EAN_8' || sym === 'UPC_E') {
    return code.length > 1 ? code.slice(0, -1) : code
  }
  return code
}

/** Apply prefix/suffix trimming based on Setup rules. */
export function applyTrims(raw: string, sym: Symbology, trims: TrimRules): string {
  const t = trims[sym]
  const left = Math.max(0, Math.min(raw.length, t.prefix))
  const right = Math.max(0, Math.min(raw.length - left, t.suffix))
  return raw.slice(left, raw.length - right)
}
