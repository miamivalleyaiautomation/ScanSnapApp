<!-- FILE: src/App.vue -->
<template>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo">
        <img v-if="isDark" src="/favicon_1024_dark.png" alt="icon">
        <img v-else src="/favicon_1024_light.png" alt="icon">
        <img class="word" :src="isDark ? '/text_1024_dark.png' : '/text_1024_light.png'" alt="ScanSnap">
      </div>
      <button class="theme-toggle" @click="toggleTheme">{{ isDark ? 'Light' : 'Dark' }}</button>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{active:tab==='scan'}" @click="tab='scan'">SCAN</button>
      <button class="tab" :class="{active:tab==='catalog'}" @click="tab='catalog'">CATALOG</button>
      <button class="tab" :class="{active:tab==='setup'}" @click="tab='setup'">SETUP</button>
    </div>

    <!-- SCAN -->
    <div v-if="tab==='scan'" class="panel">
      <div class="row" style="margin-bottom:8px">
        <button class="btn ghost" @click="requestPermission">Camera Permission</button>
        <button class="btn" :disabled="scanning" @click="scanning=true">Start Camera</button>
        <select class="input" v-model="selectedDeviceId" @change="onDeviceChange">
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'camera' }}</option>
        </select>
      </div>

      <div class="video">
        <QrcodeStream
          v-if="scanning"
          :constraints="cameraConstraints"
          :formats="activeFormats"
          :paused="paused"
          @camera-on="onCameraReady"
          @detect="onDetect"
          @error="onError"
        />
      </div>

      <!-- Recent + Modes -->
      <div class="mini">
        <span class="kbd">Recent</span>
        <span style="font-weight:700">{{ last.code || '—' }}</span>
        <template v-if="last.code">
          <button class="icon-btn" @click="decLast">−</button>
          <span>{{ last.qty }}</span>
          <button class="icon-btn" @click="incLast">＋</button>
        </template>
      </div>
      <div class="chips" style="margin-top:6px">
        <button class="tab" :class="{active:mode==='quick'}" @click="setMode('quick')">QUICK LIST</button>
        <button class="tab" :class="{active:mode==='verify'}" @click="setMode('verify')">CATALOG VERIFY</button>
        <button class="tab" :class="{active:mode==='builder'}" @click="setMode('builder')">ORDER BUILDER</button>
      </div>

      <!-- QUICK LIST -->
      <div v-if="mode==='quick'">
        <table class="table">
          <thead><tr><th>Barcode</th><th style="width:200px">QTY</th><th style="width:64px"></th></tr></thead>
          <tbody>
            <tr v-for="(qty, code) in quickList" :key="code">
              <td>{{ code }}</td>
              <td>
                <button class="icon-btn" @click="changeQty('quick', code, -1)">−</button>
                <span style="margin:0 8px">{{ qty }}</span>
                <button class="icon-btn" @click="changeQty('quick', code, +1)">＋</button>
              </td>
              <td><button class="icon-btn danger" @click="removeItem('quick', code)">🗑</button></td>
            </tr>
          </tbody>
        </table>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" @click="exportQuick('csv')">Export CSV</button>
          <button class="btn ghost" @click="exportQuick('xlsx')">Export Excel</button>
          <button class="btn ghost" @click="exportQuick('pdf')">Export PDF</button>
          <button class="btn warn" style="margin-left:auto" @click="clearMode('quick')">Clear</button>
        </div>
      </div>

      <!-- VERIFY -->
      <div v-if="mode==='verify'">
        <table class="table">
          <thead><tr><th>Barcode</th><th style="width:140px">Status</th><th style="width:64px"></th></tr></thead>
          <tbody>
            <tr v-for="r in verifyRows" :key="r.code">
              <td>{{ r.code }}</td>
              <td>
                <span v-if="r.ok" class="ok">✔ KNOWN</span>
                <span v-else class="bad">✖ UNKNOWN</span>
              </td>
              <td><button class="icon-btn danger" @click="removeVerify(r.code)">🗑</button></td>
            </tr>
          </tbody>
        </table>
        <div class="verify-summary">
          <span class="ok">✔ {{ knownCount }}</span>
          <span class="bad">✖ {{ unknownCount }}</span>
        </div>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" @click="exportVerify('csv')">Export CSV</button>
          <button class="btn ghost" @click="exportVerify('xlsx')">Export Excel</button>
          <button class="btn ghost" @click="exportVerify('pdf')">Export PDF</button>
          <button class="btn warn" style="margin-left:auto" @click="clearMode('verify')">Clear</button>
        </div>
      </div>

      <!-- ORDER BUILDER -->
      <div v-if="mode==='builder'">
        <table class="table">
          <thead><tr><th>Item</th><th style="width:200px">QTY</th><th style="width:64px"></th></tr></thead>
        <tbody>
            <tr v-for="row in builderRows" :key="row.code">
              <td>
                <div style="font-weight:700">{{ row.code }}</div>
                <div style="opacity:.8">{{ row.desc || '—' }}</div>
              </td>
              <td>
                <button class="icon-btn" @click="changeQty('builder', row.code, -1)">−</button>
                <span style="margin:0 8px">{{ row.qty }}</span>
                <button class="icon-btn" @click="changeQty('builder', row.code, +1)">＋</button>
              </td>
              <td><button class="icon-btn danger" @click="removeItem('builder', row.code)">🗑</button></td>
            </tr>
          </tbody>
        </table>
        <div class="row" style="margin-top:10px">
          <button class="btn ghost" @click="exportBuilder('csv')">Export CSV</button>
          <button class="btn ghost" @click="exportBuilder('xlsx')">Export Excel</button>
          <button class="btn ghost" @click="exportBuilder('pdf')">Export PDF</button>
          <button class="btn warn" style="margin-left:auto" @click="clearMode('builder')">Clear</button>
        </div>
      </div>
    </div>

    <!-- CATALOG -->
    <div v-else-if="tab==='catalog'" class="panel">
      <h3 style="margin-top:2px">Import Catalog</h3>
      <div class="row">
        <input class="input" type="file" accept=".csv,.xls,.xlsx" @change="onFile">
        <input class="input" v-model="searchBarcode" placeholder="Search barcode...">
        <input class="input" v-model="search" placeholder="Search description or barcode...">
        <div class="kbd">{{ catalog.size }} items</div>
        <button class="btn warn" style="margin-left:auto" @click="clearCatalog">Clear Catalog</button>
      </div>

      <div v-if="columns.length" class="row" style="margin-top:10px">
        <div>Barcode column:</div>
        <select class="input" v-model="barcodeCol">
          <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
        </select>
        <div>Description column:</div>
        <select class="input" v-model="descCol">
          <option value="">(none)</option>
          <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div class="mini" v-if="importStats.total">
        <span class="kbd">Rows: {{ importStats.total }}</span>
        <span class="kbd">Inserted: {{ importStats.inserted }}</span>
        <span class="kbd">Blank barcodes: {{ importStats.blank }}</span>
        <span class="kbd">Duplicates collapsed: {{ importStats.duplicates }}</span>
      </div>

      <!-- Responsive catalog table: Description wraps first, then Barcode on small screens -->
      <table class="table catalog">
        <colgroup>
          <col style="width: 42%">
          <col style="width: 58%">
        </colgroup>
        <thead>
          <tr>
            <th class="barcode">Barcode</th>
            <th class="desc">Description</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredCatalog" :key="row.barcode">
            <td class="barcode"><div class="cell">{{ row.barcode }}</div></td>
            <td class="desc"><div class="cell">{{ row.description }}</div></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SETUP -->
    <div v-else class="panel">
      <h3>Checks & Trims</h3>
      <div class="row" style="margin-bottom:10px">
        <label><input type="checkbox" v-model="validateCD"> Validate EAN/UPC check digit</label>
        <label><input type="checkbox" v-model="stripCD"> Strip EAN/UPC check digit</label>
        <label><input type="checkbox" v-model="beep"> Beep on success</label>
      </div>

      <h3>Scanner Formats</h3>
      <div class="row nowrap" style="margin-bottom:6px">
        <button class="btn ghost" @click="enableAll">Enable all</button>
        <button class="btn ghost" @click="disableAll">Disable all</button>
      </div>
      <div class="row nowrap" style="margin-bottom:8px">
        <label class="kbd no-wrap"><input type="checkbox" :checked="linearOn" @change="toggleLinear($event)"> linear_codes</label>
        <label class="kbd no-wrap"><input type="checkbox" :checked="matrixOn" @change="toggleMatrix($event)"> matrix_codes</label>
      </div>

      <table class="table setup">
        <thead>
          <tr>
            <th>Format</th>
            <th>Trim Prefix</th>
            <th>Trim Suffix</th>
            <th class="center">Enabled</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in formatList" :key="f">
            <td class="ellipsis">{{ f }}</td>
            <td><input class="input input-compact" type="number" min="0" v-model.number="trims[f].prefix"></td>
            <td><input class="input input-compact" type="number" min="0" v-model.number="trims[f].suffix"></td>
            <td class="center"><input type="checkbox" v-model="enabled[f]"></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'
import { ref, reactive, computed, watch } from 'vue'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { exportCSV, exportXLSX, exportPDF } from './utils/exporters'
import {
  ALL_FORMATS, DEFAULT_TRIMS,
  LINEAR_GROUP, MATRIX_GROUP,
  type Format, type TrimRules,
  stripCheckDigit, validateCheckDigit, applyTrims
} from './utils/barcode'

/* Theme */
const isDark = ref(!(localStorage.getItem('theme') === 'light'))
watch(isDark, v => {
  document.documentElement.classList.toggle('light', !v)
  localStorage.setItem('theme', v ? 'dark' : 'light')
})
document.documentElement.classList.toggle('light', !isDark.value)
function toggleTheme(){ isDark.value = !isDark.value }

/* Tabs & Modes */
const tab = ref<'scan'|'catalog'|'setup'>('scan')
const mode = ref<'quick'|'verify'|'builder'>('quick')
function setMode(m: typeof mode.value){ mode.value = m }

/* Camera & devices */
const scanning = ref(false)
const paused = ref(false)
const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string|undefined>(undefined)
const cameraConstraints = computed<MediaTrackConstraints>(() =>
  selectedDeviceId.value ? { deviceId: selectedDeviceId.value } : { facingMode: 'environment' }
)
async function requestPermission(){
  try{ const s = await navigator.mediaDevices.getUserMedia({ video: true }); s.getTracks().forEach(t=>t.stop()) }catch{}
}
async function onCameraReady(){
  try{
    const list = await navigator.mediaDevices.enumerateDevices()
    devices.value = list.filter(d=>d.kind==='videoinput')
  }catch{}
}
function onDeviceChange(){ if(scanning.value) { scanning.value=false; setTimeout(()=>scanning.value=true) } }

/* Setup: formats, trims, checks */
const formatList: Format[] = [...ALL_FORMATS]
const enabled = reactive<Record<Format, boolean>>(JSON.parse(localStorage.getItem('enabled')||'{}') || {})
formatList.forEach(f => enabled[f] = enabled[f] ?? (f==='qr_code' || f==='code_128' || f==='ean_13' || f==='upc_a'))
watch(enabled, () => localStorage.setItem('enabled', JSON.stringify(enabled)), { deep:true })

const trims = reactive<TrimRules>(Object.assign({}, DEFAULT_TRIMS, JSON.parse(localStorage.getItem('trims')||'{}')))
watch(trims, () => localStorage.setItem('trims', JSON.stringify(trims)), { deep:true })

const stripCD = ref(localStorage.getItem('stripCD')==='1')
const validateCD = ref(localStorage.getItem('validateCD')==='1')
const beep = ref(localStorage.getItem('beep')!=='0')
watch(stripCD, v => localStorage.setItem('stripCD', v?'1':'0'))
watch(validateCD, v => localStorage.setItem('validateCD', v?'1':'0'))
watch(beep, v => localStorage.setItem('beep', v?'1':'0'))

/* Formats for QrcodeStream */
const activeFormats = computed(() => {
  const list = formatList.filter(f => enabled[f])
  return list.length ? list : ['qr_code']
})

/* Group toggles */
const linearOn = computed(() => LINEAR_GROUP.every(f => enabled[f]))
const matrixOn = computed(() => MATRIX_GROUP.every(f => enabled[f]))
function toggleLinear(e: Event){
  const on = (e.target as HTMLInputElement).checked
  LINEAR_GROUP.forEach(f => enabled[f] = on)
}
function toggleMatrix(e: Event){
  const on = (e.target as HTMLInputElement).checked
  MATRIX_GROUP.forEach(f => enabled[f] = on)
}
function enableAll(){ formatList.forEach(f => enabled[f] = true) }
function disableAll(){ formatList.forEach(f => enabled[f] = false) }

/* Catalog */
const rawRows = ref<Record<string, unknown>[]>([])
const catalog = reactive(new Map<string,string>())
const search = ref('')
const searchBarcode = ref('')
const columns = ref<string[]>([])
const barcodeCol = ref<string>('')
const descCol = ref<string>('')

const importStats = reactive({ total: 0, inserted: 0, blank: 0, duplicates: 0 })
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
  const bGuess = pick(pri.flat()) || H.find(h => /barcode/i.test(h)) || H[0]
  const dGuess = H.find(h => /(description|desc|name|title)/i.test(h)) || ''
  barcodeCol.value = bGuess
  descCol.value = dGuess
}

function rebuildCatalogFromSelections(){
  catalog.clear()
  importStats.total = rawRows.value.length
  importStats.inserted = 0
  importStats.blank = 0
  importStats.duplicates = 0

  const seen = new Set<string>()
  for(const r of rawRows.value){
    const code = String((r as any)[barcodeCol.value] ?? '').trim()
    if(!code){ importStats.blank++; continue }
    const desc = descCol.value ? String((r as any)[descCol.value] ?? '').trim() : ''
    if(seen.has(code)){ importStats.duplicates++; } else { seen.add(code) }
    catalog.set(code, desc)
  }
  importStats.inserted = catalog.size
}
watch([barcodeCol, descCol], rebuildCatalogFromSelections)

async function onFile(e: Event){
  const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return
  const ext = file.name.split('.').pop()?.toLowerCase()
  let rows: Record<string, unknown>[] = []

  if(ext === 'csv'){
    rows = await new Promise<Record<string, unknown>[]>((res, rej)=>{
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
        complete: r => res(r.data as Record<string, unknown>[]),
        error: rej
      })
    })
  } else {
    const data = await file.arrayBuffer()
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      raw: false,
      defval: '',
      blankrows: false
    })
  }

  rawRows.value = rows
  const headers = Object.keys(rows[0] ?? {})
  columns.value = headers
  guessCols(headers)
  rebuildCatalogFromSelections()
}

/* Catalog filtering */
const filteredCatalog = computed(() => {
  const qCode = searchBarcode.value.trim()
  const qAny = search.value.trim().toLowerCase()
  const out: {barcode:string, description:string}[] = []
  for (const [code, desc] of catalog) {
    if (qCode) {
      if (code.includes(qCode)) out.push({ barcode: code, description: desc })
    } else if (qAny) {
      if (code.toLowerCase().includes(qAny) || (desc||'').toLowerCase().includes(qAny))
        out.push({ barcode: code, description: desc })
    } else {
      out.push({ barcode: code, description: desc })
    }
  }
  return out
})

function clearCatalog(){
  rawRows.value = []
  catalog.clear()
  columns.value = []
  barcodeCol.value = ''
  descCol.value = ''
  search.value = ''
  searchBarcode.value = ''
  importStats.total = 0
  importStats.inserted = 0
  importStats.blank = 0
  importStats.duplicates = 0
}

/* Scan flow */
const quickList = reactive(new Map<string, number>())
const verifyRows = reactive<{code:string, ok:boolean}[]>([])
const builder = reactive(new Map<string, {qty:number, desc?:string}>())
const knownCount = computed(() => verifyRows.filter(r=>r.ok).length)
const unknownCount = computed(() => verifyRows.filter(r=>!r.ok).length)
const builderRows = computed(() => [...builder.entries()].map(([code, v]) => ({ code, qty:v.qty, desc:v.desc || catalog.get(code) || '' })))
const last = reactive<{code:string|null, qty:number}>({ code:null, qty:0 })

let lastAt = 0
function throttle(): boolean { const now = Date.now(); if(now - lastAt < 300) return true; lastAt = now; return false }
function onDetect(payload: any){
  const first = (payload as any[])[0]
  const text = String(first?.rawValue ?? '').trim()
  const fmt = String(first?.format ?? '').toLowerCase() as Format | undefined
  if(!text || throttle()) return
  processScan(text, fmt)
}
function processScan(raw: string, fmt?: Format){
  let code = raw
  if(fmt){
    if(validateCD.value && !validateCheckDigit(code, fmt)) return
    code = applyTrims(code, fmt, trims)
    code = stripCheckDigit(code, fmt, stripCD.value)
  }
  if(!code) return
  if(beep.value) playBeep()

  if(mode.value==='quick'){
    quickList.set(code, (quickList.get(code) || 0) + 1)
    setLast(code, quickList.get(code)!)
  } else if(mode.value==='verify'){
    const ok = catalog.has(code)
    const i = verifyRows.findIndex(r=>r.code===code)
    if(i>=0) verifyRows[i] = { code, ok }
    else verifyRows.push({ code, ok })
    setLast(code, 1)
  } else {
    const entry = builder.get(code) || { qty:0, desc: catalog.get(code) }
    entry.qty += 1
    if(!entry.desc) entry.desc = catalog.get(code)
    builder.set(code, entry)
    setLast(code, entry.qty)
  }

  paused.value = true
  setTimeout(() => { paused.value = false }, 180)
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

/* Exporters */
function exportQuick(type:'csv'|'xlsx'|'pdf'){
  const rows = [...quickList.entries()].map(([code,qty]) => [code, qty])
  if(type==='csv') exportCSV('quick-list.csv', rows, ['Barcode','QTY'])
  if(type==='xlsx') exportXLSX('quick-list.xlsx', rows, ['Barcode','QTY'])
  if(type==='pdf') exportPDF('quick-list.pdf', rows, ['Barcode','QTY'])
}
function exportVerify(type:'csv'|'xlsx'|'pdf'){
  const rows = verifyRows.map(r => [r.code, r.ok ? 'KNOWN' : 'UNKNOWN'])
  if(type==='csv') exportCSV('catalog-verify.csv', rows, ['Barcode','Status'])
  if(type==='xlsx') exportXLSX('catalog-verify.xlsx', rows, ['Barcode','Status'])
  if(type==='pdf') exportPDF('catalog-verify.pdf', rows, ['Barcode','Status'])
}
function exportBuilder(type:'csv'|'xlsx'|'pdf'){
  const rows = builderRows.value.map(r => [r.code, r.desc || '', r.qty])
  if(type==='csv') exportCSV('order-builder.csv', rows, ['Barcode','Description','QTY'])
  if(type==='xlsx') exportXLSX('order-builder.xlsx', rows, ['Barcode','Description','QTY'])
  if(type==='pdf') exportPDF('order-builder.pdf', rows, ['Barcode','Description','QTY'])
}

/* Beep */
function playBeep(){
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const o = ctx.createOscillator(); const g = ctx.createGain()
  o.connect(g); g.connect(ctx.destination)
  o.frequency.value = 880; g.gain.value = 0.1; o.start(); setTimeout(()=>{ o.stop(); ctx.close() }, 120)
}
</script>
