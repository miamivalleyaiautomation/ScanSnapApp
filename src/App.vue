<!-- FILE: src/App.vue -->
<template>
  <!-- unchanged template from your current working file -->
  <!-- (Everything renders exactly as you have it now.) -->
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'
import { ref, reactive, computed, watch, nextTick, onMounted } from 'vue'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { exportCSV, exportXLSX, exportPDF } from './utils/exporters'
import {
  ALL_FORMATS, DEFAULT_TRIMS,
  LINEAR_GROUP, MATRIX_GROUP,
  type Format, type TrimRules,
  stripCheckDigit, validateCheckDigit, applyTrims
} from './utils/barcode'

/* ---------- LOCAL STORAGE KEYS (single source of truth) ---------- */
const LS = {
  tab: 'ui.tab',
  mode: 'ui.mode',
  quick: 'data.quickList',
  verify: 'data.verifyRows',
  builder: 'data.builder',
  catalog: 'data.catalog',
  barcodeCol: 'catalog.barcodeCol',
  descCol: 'catalog.descCol',
  enabled: 'setup.enabled',     // already used below
  trims: 'setup.trims',         // already used below
  stripCD: 'setup.stripCD',     // already used below
  validateCD: 'setup.validateCD',
  beep: 'setup.beep',
  theme: 'ui.theme'
}

/* ---------- Theme ---------- */
const isDark = ref(!(localStorage.getItem(LS.theme) === 'light'))
watch(isDark, v => {
  document.documentElement.classList.toggle('light', !v)
  localStorage.setItem(LS.theme, v ? 'dark' : 'light')
})
document.documentElement.classList.toggle('light', !isDark.value)
function toggleTheme(){ isDark.value = !isDark.value }

/* ---------- Tabs & Modes (persist) ---------- */
const tab = ref<'scan'|'catalog'|'setup'>((localStorage.getItem(LS.tab) as any) || 'scan')
const mode = ref<'quick'|'verify'|'builder'>((localStorage.getItem(LS.mode) as any) || 'quick')
watch(tab,  v => localStorage.setItem(LS.tab,  v))
watch(mode, v => localStorage.setItem(LS.mode, v))
function setMode(m: typeof mode.value){ mode.value = m }

/* ---------- Camera & devices (unchanged behavior) ---------- */
const scanning = ref(false)
const paused = ref(false)
const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string|undefined>(undefined)
const videoBox = ref<HTMLElement | null>(null)
const videoTrack = ref<MediaStreamTrack | null>(null)
const torchSupported = ref(false)
const torchOn = ref(false)

const cameraConstraints = computed<MediaTrackConstraints>(() =>
  selectedDeviceId.value ? { deviceId: selectedDeviceId.value } : { facingMode: 'environment' }
)
async function requestPermission(){ try{ const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t=>t.stop()) }catch{} }
async function onCameraReady(){
  try{ const list = await navigator.mediaDevices.enumerateDevices(); devices.value = list.filter(d=>d.kind==='videoinput') }catch{}
  await nextTick()
  try{
    const vid = videoBox.value?.querySelector('video') as HTMLVideoElement | null
    const track = (vid?.srcObject as MediaStream | undefined)?.getVideoTracks?.()[0] || null
    videoTrack.value = track || null
    torchSupported.value = !!(track && typeof track.getCapabilities === 'function' && (track.getCapabilities() as any).torch !== undefined)
  }catch{ torchSupported.value = false }
}
function onDeviceChange(){ if(scanning.value){ scanning.value=false; setTimeout(()=>{ scanning.value=true; torchOn.value=false }) } }
function toggleCamera(){
  if(scanning.value){
    scanning.value=false
    if(videoTrack.value){ try{ (videoTrack.value as any).applyConstraints?.({ advanced:[{ torch:false }] }) }catch{} }
    torchOn.value=false
  }else{ scanning.value=true }
}
async function toggleTorch(){
  if(!videoTrack.value) return
  const want = !torchOn.value
  try{ await (videoTrack.value as any).applyConstraints?.({ advanced:[{ torch: want }] }); torchOn.value = want }catch{ torchOn.value = false }
}

/* ---------- Setup: formats, trims, checks (already persistent) ---------- */
const formatList: Format[] = [...ALL_FORMATS]
const enabled = reactive<Record<Format, boolean>>(JSON.parse(localStorage.getItem(LS.enabled)||'{}') || {})
formatList.forEach(f => enabled[f] = enabled[f] ?? (f==='qr_code' || f==='code_128' || f==='ean_13' || f==='upc_a'))
watch(enabled, () => localStorage.setItem(LS.enabled, JSON.stringify(enabled)), { deep:true })

const trims = reactive<TrimRules>(Object.assign({}, DEFAULT_TRIMS, JSON.parse(localStorage.getItem(LS.trims)||'{}')))
watch(trims, () => localStorage.setItem(LS.trims, JSON.stringify(trims)), { deep:true })

const stripCD = ref(localStorage.getItem(LS.stripCD)==='1')
const validateCD = ref(localStorage.getItem(LS.validateCD)==='1')
const beep = ref(localStorage.getItem(LS.beep)!=='0')
watch(stripCD, v => localStorage.setItem(LS.stripCD, v?'1':'0'))
watch(validateCD, v => localStorage.setItem(LS.validateCD, v?'1':'0'))
watch(beep, v => localStorage.setItem(LS.beep, v?'1':'0'))

const activeFormats = computed(() => { const list = formatList.filter(f => enabled[f]); return list.length ? list : ['qr_code'] })
const linearOn = computed(() => LINEAR_GROUP.every(f => enabled[f]))
const matrixOn = computed(() => MATRIX_GROUP.every(f => enabled[f]))
function toggleLinear(e: Event){ const on = (e.target as HTMLInputElement).checked; LINEAR_GROUP.forEach(f => enabled[f] = on) }
function toggleMatrix(e: Event){ const on = (e.target as HTMLInputElement).checked; MATRIX_GROUP.forEach(f => enabled[f] = on) }
function enableAll(){ formatList.forEach(f => enabled[f] = true) }
function disableAll(){ formatList.forEach(f => enabled[f] = false) }

/* ---------- Catalog (persist Map + chosen columns) ---------- */
const catalog = reactive(new Map<string,string>())
const rawRows = ref<Record<string, unknown>[]>([]) // kept volatile (Map is what we persist)
const columns = ref<string[]>([])
const barcodeCol = ref<string>(localStorage.getItem(LS.barcodeCol) || '')
const descCol = ref<string>(localStorage.getItem(LS.descCol) || '')
const search = ref('')           // not persisted (UX preference)
const searchBarcode = ref('')    // not persisted (UX preference)

watch(barcodeCol, v => localStorage.setItem(LS.barcodeCol, v))
watch(descCol, v => localStorage.setItem(LS.descCol, v))

/* Persist catalog Map as entries array */
const catalogEntries = computed<[string, string][]>(() => Array.from(catalog.entries()))
watch(catalogEntries, arr => { localStorage.setItem(LS.catalog, JSON.stringify(arr)) }, { deep:true })

function normalize(s: string){ return s.toLowerCase().replace(/[\s_\-]+/g,'').trim() }
function guessCols(headers: string[]){
  const H = headers.slice()
  const pri = [
    ['barcode','barcodes'],
    ['upc','upca','upce','upccode'],
    ['ean','ean13','ean8','gtin','gtin13','gtin12','gtin14','gtin8'],
    ['qrcode','qr'],
    ['code128','code39','code93','datamatrix','aztec'],
    ['code','productcode','bar_code','bar-code'],
    ['sku','item','itemcode','productid','id'],
  ]
  const pick = (alts: string[]) => H.find(h => alts.includes(normalize(h)))
  barcodeCol.value = pick(pri.flat()) || H.find(h => /barcode/i.test(h)) || H[0] || ''
  descCol.value = H.find(h => /(description|desc|name|title)/i.test(h)) || ''
}
function rebuildCatalogFromSelections(){
  catalog.clear()
  const seen = new Set<string>()
  for(const r of rawRows.value){
    const code = String((r as any)[barcodeCol.value] ?? '').trim()
    if(!code) continue
    const desc = descCol.value ? String((r as any)[descCol.value] ?? '').trim() : ''
    if(!seen.has(code)) seen.add(code)
    catalog.set(code, desc)
  }
}
watch([barcodeCol, descCol], rebuildCatalogFromSelections)

async function onFile(e: Event){
  const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return
  const ext = file.name.split('.').pop()?.toLowerCase()
  let rows: Record<string, unknown>[] = []
  if(ext === 'csv'){
    rows = await new Promise<Record<string, unknown>[]>((res, rej)=>{
      Papa.parse<Record<string, unknown>>(file, {
        header: true, skipEmptyLines:'greedy', dynamicTyping:false,
        complete: r => res(r.data as Record<string, unknown>[]), error: rej
      })
    })
  } else {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type:'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw:false, defval:'', blankrows:false })
  }
  rawRows.value = rows
  const headers = Object.keys(rows[0] ?? {})
  columns.value = headers
  guessCols(headers)
  rebuildCatalogFromSelections()
}

const filteredCatalog = computed(() => {
  const qCode = searchBarcode.value.trim()
  const qAny = search.value.trim().toLowerCase()
  const out: {barcode:string, description:string}[] = []
  for (const [code, desc] of catalog) {
    if (qCode) { if (code.includes(qCode)) out.push({ barcode: code, description: desc }) }
    else if (qAny) { if (code.toLowerCase().includes(qAny) || (desc||'').toLowerCase().includes(qAny)) out.push({ barcode: code, description: desc }) }
    else out.push({ barcode: code, description: desc })
  }
  return out
})
function clearCatalog(){
  rawRows.value = []; catalog.clear(); columns.value = []
  barcodeCol.value = ''; descCol.value = ''; search.value = ''; searchBarcode.value = ''
  localStorage.removeItem(LS.catalog)
}

/* ---------- Lists (persist) ---------- */
const quickList = reactive(new Map<string, number>())
const verifyRows = reactive<{code:string, ok:boolean}[]>([])
const builder = reactive(new Map<string, {qty:number, desc?:string}>())

/* Persist Maps/arrays by watching their entry snapshots */
const quickEntries = computed<[string, number][]>(() => Array.from(quickList.entries()))
const builderEntries = computed<[string, {qty:number, desc?:string}][]>(() => Array.from(builder.entries()))
watch(quickEntries, arr => { localStorage.setItem(LS.quick, JSON.stringify(arr)) }, { deep:true })
watch(verifyRows, arr => { localStorage.setItem(LS.verify, JSON.stringify(arr)) }, { deep:true })
watch(builderEntries, arr => { localStorage.setItem(LS.builder, JSON.stringify(arr)) }, { deep:true })

/* Restore everything on first load */
onMounted(() => {
  try{
    const Q = JSON.parse(localStorage.getItem(LS.quick) || '[]') as [string, number][]
    for(const [c,q] of Q) quickList.set(c, q)
  }catch{}
  try{
    const V = JSON.parse(localStorage.getItem(LS.verify) || '[]') as {code:string,ok:boolean}[]
    verifyRows.splice(0, verifyRows.length, ...V)
  }catch{}
  try{
    const B = JSON.parse(localStorage.getItem(LS.builder) || '[]') as [string, {qty:number, desc?:string}][]
    for(const [c,v] of B) builder.set(c, v)
  }catch{}
  try{
    const C = JSON.parse(localStorage.getItem(LS.catalog) || '[]') as [string, string][]
    catalog.clear(); for(const [c,d] of C) catalog.set(c, d)
  }catch{}
})

/* ---------- Scan flow (unchanged) ---------- */
const knownCount = computed(() => verifyRows.filter(r=>r.ok).length)
const unknownCount = computed(() => verifyRows.filter(r=>!r.ok).length)
const builderRows = computed(() => [...builder.entries()].map(([code, v]) => ({ code, qty:v.qty, desc:v.desc || catalog.get(code) || '' })))
const last = reactive<{code:string|null, qty:number}>({ code:null, qty:0 })

let lastAt = 0
function throttle(): boolean { const now = Date.now(); if(now - lastAt < 300) return true; lastAt = now; return false }
function onDetect(payload: any){ const first = (payload as any[])[0]; const text = String(first?.rawValue ?? '').trim(); const fmt = String(first?.format ?? '').toLowerCase() as Format | undefined; if(!text || throttle()) return; processScan(text, fmt) }
function processScan(raw: string, fmt?: Format){
  let code = raw
  if(fmt){ if(validateCD.value && !validateCheckDigit(code, fmt)) return; code = applyTrims(code, fmt, trims); code = stripCheckDigit(code, fmt, stripCD.value) }
  if(!code) return
  if(beep.value) playBeep()
  if(mode.value==='quick'){ quickList.set(code, (quickList.get(code) || 0) + 1); setLast(code, quickList.get(code)!) }
  else if(mode.value==='verify'){ const ok = catalog.has(code); const i = verifyRows.findIndex(r=>r.code===code); if(i>=0) verifyRows[i] = { code, ok }; else verifyRows.push({ code, ok }); setLast(code, 1) }
  else { const entry = builder.get(code) || { qty:0, desc: catalog.get(code) }; entry.qty += 1; if(!entry.desc) entry.desc = catalog.get(code); builder.set(code, entry); setLast(code, entry.qty) }
  paused.value = true; setTimeout(() => { paused.value = false }, 180)
}
function onError(err:any){ console.warn(err) }
function setLast(code:string, qty:number){ last.code = code; last.qty = qty }
function incLast(){ if(!last.code) return; if(mode.value==='quick'){ changeQty('quick', last.code, +1) } else { changeQty('builder', last.code, +1) } }
function decLast(){ if(!last.code) return; if(mode.value==='quick'){ changeQty('quick', last.code, -1) } else { changeQty('builder', last.code, -1) } }

function changeQty(which:'quick'|'builder', code:string, delta:number){
  if(which==='quick'){
    const v = Math.max(0, (quickList.get(code)||0) + delta)
    if(v===0) quickList.delete(code); else quickList.set(code, v)
    if(last.code===code) last.qty = v
  } else {
    const cur = builder.get(code); if(!cur) return
    const v = Math.max(0, cur.qty + delta)
    if(v===0) builder.delete(code); else builder.set(code, {...cur, qty:v})
    if(last.code===code) last.qty = v
  }
}
function removeItem(which:'quick'|'builder', code:string){ if(which==='quick') quickList.delete(code); else builder.delete(code) }
function removeVerify(code:string){ const i = verifyRows.findIndex(r=>r.code===code); if(i>=0) verifyRows.splice(i,1) }
function clearMode(which:'quick'|'verify'|'builder'){ if(which==='quick') quickList.clear(); if(which==='verify') verifyRows.splice(0); if(which==='builder') builder.clear() }

/* ---------- Exporters (unchanged) ---------- */
function exportQuick(type:'csv'|'xlsx'|'pdf'){ const rows = [...quickList.entries()].map(([code,qty]) => [code, qty]); if(type==='csv') exportCSV('quick-list.csv', rows, ['Barcode','QTY']); if(type==='xlsx') exportXLSX('quick-list.xlsx', rows, ['Barcode','QTY']); if(type==='pdf') exportPDF('quick-list.pdf', rows, ['Barcode','QTY']) }
function exportVerify(type:'csv'|'xlsx'|'pdf'){ const rows = verifyRows.map(r => [r.code, r.ok ? 'KNOWN' : 'UNKNOWN']); if(type==='csv') exportCSV('catalog-verify.csv', rows, ['Barcode','Status']); if(type==='xlsx') exportXLSX('catalog-verify.xlsx', rows, ['Barcode','Status']); if(type==='pdf') exportPDF('catalog-verify.pdf', rows, ['Barcode','Status']) }
function exportBuilder(type:'csv'|'xlsx'|'pdf'){ const rows = builderRows.value.map(r => [r.code, r.desc || '', r.qty]); if(type==='csv') exportCSV('order-builder.csv', rows, ['Barcode','Description','QTY']); if(type==='xlsx') exportXLSX('order-builder.xlsx', rows, ['Barcode','Description','QTY']); if(type==='pdf') exportPDF('order-builder.pdf', rows, ['Barcode','Description','QTY']) }

/* ---------- Beep ---------- */
function playBeep(){ const ctx = new (window.AudioContext || (window as any).webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = 0.1; o.start(); setTimeout(()=>{ o.stop(); ctx.close() }, 120) }
</script>
