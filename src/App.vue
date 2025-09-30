<template>
  <div class="container">
    <!-- Header -->
    <AppHeader :isDark="isDark" @toggle-theme="toggleTheme" />
    
   <!-- Session Status Bar (when logged in) -->
<div v-if="session && !error" style="
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid var(--brand);
  border-radius: 10px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
">
  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
    <span style="font-size: 1.25rem;">👤</span>
    <div>
      <div style="font-weight: 600; font-size: 0.95rem;">
        {{ session.firstName }} {{ session.lastName }}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-dim);">
        {{ session.email }}
      </div>
    </div>
    <span style="
      padding: 4px 10px;
      background: var(--brand);
      color: white;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    ">
      {{ getSubscriptionLabel() }}
    </span>
  </div>
  <div style="display: flex; gap: 8px; align-items: center;">
    <a 
      :href="session.dashboardUrl" 
      style="
        padding: 6px 14px;
        background: var(--brand);
        color: white;
        border-radius: 999px;
        text-decoration: none;
        font-size: 0.85rem;
        font-weight: 600;
      "
    >
      Dashboard →
    </a>
    <button 
      @click="handleLogout" 
      style="
        padding: 6px 14px;
        background: transparent;
        color: var(--bad);
        border: 1px solid var(--bad);
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
      "
    >
      Logout
    </button>
  </div>
</div>
    <!-- Loading State -->
    <div v-if="isLoading && !session && !error" style="...">
      Checking session...
    </div>
    
    <!-- LOGIN REQUIRED STATE - Replace the "Standalone Mode Info Bar" section -->
    <div v-if="!session && !isLoading && (requiresLogin || !hasSessionInUrl)" style="
      padding: 16px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(251, 146, 60, 0.1));
      border: 1px solid var(--bad);
      text-align: center;
    ">
      <h3 style="color: var(--bad); margin: 0 0 8px 0; font-size: 1.125rem;">
        🔒 Login Required
      </h3>
      <p style="color: var(--text-dim); margin: 0 0 16px 0; font-size: 0.875rem;">
        You must be logged in to use ScanSnap. Your data stays on your device, but we need to verify your subscription.
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a 
          href="https://scansnap.io/login?redirect_url=/dashboard" 
          style="
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            background: var(--brand);
            color: white;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.875rem;
          "
        >
          Login to ScanSnap →
        </a>
        <a 
          href="https://scansnap.io/signup" 
          style="
            display: inline-flex;
            align-items: center;
            padding: 10px 20px;
            background: transparent;
            color: var(--brand);
            border: 1px solid var(--brand);
            border-radius: 999px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.875rem;
          "
        >
          Create Account
        </a>
      </div>
    </div>

<!-- Error State (for actual errors) -->
<div v-else-if="error && hasSessionInUrl" style="
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--bad);
  color: var(--bad);
  font-size: 0.875rem;
">
  <strong>Session Error:</strong> {{ error }}
  <a href="https://scansnap.io/dashboard" style="color: var(--brand); margin-left: 8px;">
    Return to dashboard →
  </a>
</div>

    <!-- Main App Content (only when logged in) -->
    <template v-if="session && !error && !isLoading">
      <!-- Tabs -->
      <TabNavigation v-model="tab" />

      <!-- SCAN TAB -->
      <div v-if="tab==='scan'" class="panel scan-panel">
        <div class="scan-layout">
          <!-- LEFT SIDE: Camera/Scanner -->
          <div class="scan-left">
            <!-- Camera Mode -->
            <template v-if="scannerMode === 'camera'">
              <!-- Scanner Controls -->
              <ScannerControls 
                :scanning="scanning"
                :devices="devices"
                :selectedDeviceId="selectedDeviceId"
                :manualCode="manualCode"
                @toggle-camera="toggleCamera"
                @request-permission="requestPermission"
                @device-change="onDeviceChange"
                @update:manualCode="manualCode = $event"
                @process-manual-code="processManualCode"
              />

              <!-- Camera View -->
              <CameraView
                ref="cameraViewRef"
                :scanning="scanning"
                :torchSupported="torchSupported"
                :torchOn="torchOn"
                :toast="toast"
                :cameraConstraints="cameraConstraints"
                :activeFormats="activeFormats"
                :paintTrack="paintTrack"
                @toggle-torch="toggleTorch"
                @camera-ready="onCameraReady"
                @error="onError"
              />

              <!-- Tap-to-add -->
              <div class="row" style="margin-top:8px">
                <button class="btn" style="flex:1" :disabled="!canTap" @click="tapToAdd">{{ tapLabel }}</button>
              </div>
            </template>

            <!-- External Scanner Mode -->
            <template v-else>
              <ExternalScannerInput
                :enabled="tab === 'scan' && scannerMode === 'external'"
                @scanned="handleExternalScan"
              />
              
              <!-- Manual entry still available for external scanners -->
              <div class="row" style="margin-top:8px">
                <input 
                  class="input" 
                  v-model="manualCode" 
                  @keyup.enter="processManualCode"
                  placeholder="Or enter barcode manually..." 
                  style="flex:1"
                />
                <button class="btn ghost" @click="processManualCode" :disabled="!manualCode.trim()">Add</button>
              </div>
            </template>
          </div>

          <!-- RIGHT SIDE: Modes and Data -->
          <div class="scan-right">
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
              <button class="tab" :class="{active:mode==='quick'}" @click="setMode('quick')">
                QUICK LIST
              </button>
              <button 
                class="tab" 
                :class="{active:mode==='verify', disabled: !hasFeature('verify')}" 
                @click="hasFeature('verify') ? setMode('verify') : showSubscriptionAlert('verify')"
                :title="!hasFeature('verify') ? 'Requires Plus subscription or higher' : ''"
              >
                CATALOG VERIFY
                <span v-if="!hasFeature('verify')" style="font-size: 0.7rem; display: block;">🔒 Plus+</span>
              </button>
              <button 
                class="tab" 
                :class="{active:mode==='builder', disabled: !hasFeature('builder')}" 
                @click="hasFeature('builder') ? setMode('builder') : showSubscriptionAlert('builder')"
                :title="!hasFeature('builder') ? 'Requires Plus subscription or higher' : ''"
              >
                ORDER BUILDER
                <span v-if="!hasFeature('builder')" style="font-size: 0.7rem; display: block;">🔒 Plus+</span>
              </button>
            </div>

            <!-- Mode Components -->
            <div class="mode-content">
              <QuickListMode
                v-if="mode==='quick'"
                :entries="quickEntries"
                @change-qty="(code, delta) => changeQty('quick', code, delta)"
                @remove-item="(code) => removeItem('quick', code)"
                @export="(type) => exportQuick(type)"
                @clear="clearMode('quick')"
              />

              <VerifyMode
                v-if="mode==='verify'"
                :verifyRows="verifyRows"
                @remove-verify="removeVerify"
                @export="(type) => exportVerify(type)"
                @clear="clearMode('verify')"
              />

              <BuilderMode
                v-if="mode==='builder'"
                :builderRows="builderRows"
                @set-desc="setBuilderDesc"
                @focus-desc="editingCode = $event"
                @blur-desc="onDescBlur"
                @change-qty="(code, delta) => changeQty('builder', code, delta)"
                @remove-item="(code) => removeItem('builder', code)"
                @export="(type) => exportBuilder(type)"
                @clear="clearMode('builder')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- CATALOG TAB -->
      <CatalogTab
        v-else-if="tab==='catalog'"
        :catalogSize="catalog.size"
        :columns="columns"
        :barcodeCol="barcodeCol"
        :descCol="descCol"
        :search="search"
        :searchBarcode="searchBarcode"
        :importStats="importStats"
        :filteredCatalog="filteredCatalog"
        :hasImportFeature="hasFeature('catalog_import')"
        @file-change="onFile"
        @update:barcodeCol="barcodeCol = $event"
        @update:descCol="descCol = $event"
        @update:search="search = $event"
        @update:searchBarcode="searchBarcode = $event"
        @clear-catalog="clearCatalog"
      />

      <!-- SETUP TAB -->
      <SetupTab
        v-else
        :scannerMode="scannerMode"
        :validateCD="validateCD"
        :stripCD="stripCD"
        :beep="beep"
        :linearOn="linearOn"
        :matrixOn="matrixOn"
        :formatList="formatList"
        :trims="trims"
        :enabled="enabled"
        @update:scannerMode="scannerMode = $event"
        @update:validateCD="validateCD = $event"
        @update:stripCD="stripCD = $event"
        @update:beep="beep = $event"
        @toggle-linear="toggleLinear"
        @toggle-matrix="toggleMatrix"
        @enable-all="enableAll"
        @disable-all="disableAll"
        @clear-all-trims="clearAllTrims"
        @update-trim="(format, field, value) => { trims[format][field] = value }"
        @update-enabled="(format, value) => { enabled[format] = value }"
     />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { exportCSV, exportXLSX, exportPDF } from './utils/exporters'
import {
  ALL_FORMATS, DEFAULT_TRIMS, LINEAR_GROUP, MATRIX_GROUP,
  type Format, type TrimRules, stripCheckDigit, validateCheckDigit, applyTrims
} from './utils/barcode'

// Import components
import AppHeader from './components/AppHeader.vue'
import TabNavigation from './components/TabNavigation.vue'
import ScannerControls from './components/ScannerControls.vue'
import CameraView from './components/CameraView.vue'
import ExternalScannerInput from './components/ExternalScannerInput.vue'
import QuickListMode from './components/QuickListMode.vue'
import VerifyMode from './components/VerifyMode.vue'
import BuilderMode from './components/BuilderMode.vue'
import CatalogTab from './components/CatalogTab.vue'
import SetupTab from './components/SetupTab.vue'

// Session management
import { useSession } from './composables/useSession'
const { session, hasFeature, isLoading, error, getSubscriptionLabel, clearSession } = useSession()

function handleLogout() {
  // Clear the session
  clearSession()
  
  // Force the login screen to show by updating reactive state
  error.value = 'Login required to use ScanSnap'
  
  // Clear the URL to remove any session parameters
  const url = new URL(window.location.href)
  url.searchParams.delete('session')
  url.search = 'login-required=true'
  window.history.replaceState({}, document.title, url.toString())
  
  // Show feedback
  showToast('Logged out successfully')
}

// Check if session was expected from URL
const hasSessionInUrl = ref(false)
const requiresLogin = ref(false)

// Initialize hasSessionInUrl immediately
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search)
  hasSessionInUrl.value = urlParams.has('session')
  requiresLogin.value = urlParams.has('login-required') || urlParams.has('no-session')
}

// LocalStorage keys
const LS = {
  tab: 'ui.tab',
  mode: 'ui.mode',
  scannerMode: 'ui.scannerMode',
  quick: 'data.quickList',
  verify: 'data.verifyRows',
  builder: 'data.builder',
  catalog: 'data.catalog',
  barcodeCol: 'catalog.barcodeCol',
  descCol: 'catalog.descCol',
  enabled: 'setup.enabled',
  trims: 'setup.trims',
  stripCD: 'setup.stripCD',
  validateCD: 'setup.validateCD',
  beep: 'setup.beep',
  theme: 'ui.theme'
}

/* Theme */
const isDark = ref(!(localStorage.getItem(LS.theme) === 'light'))
watch(isDark, v => { 
  document.documentElement.classList.toggle('light', !v)
  localStorage.setItem(LS.theme, v ? 'dark' : 'light')
})
document.documentElement.classList.toggle('light', !isDark.value)
function toggleTheme() { 
  isDark.value = !isDark.value 
}

/* Tabs & Modes */
const tab = ref<'scan'|'catalog'|'setup'>((localStorage.getItem(LS.tab) as any) || 'scan')
const mode = ref<'quick'|'verify'|'builder'>((localStorage.getItem(LS.mode) as any) || 'quick')
const scannerMode = ref<'camera'|'external'>((localStorage.getItem(LS.scannerMode) as any) || 'camera')

watch(tab, v => localStorage.setItem(LS.tab, v))
watch(mode, v => localStorage.setItem(LS.mode, v))
watch(scannerMode, v => localStorage.setItem(LS.scannerMode, v))

function setMode(m: typeof mode.value) { 
  mode.value = m 
}

function showSubscriptionAlert(feature: string) {
  const featureNames: Record<string, string> = {
    'verify': 'Catalog Verify',
    'builder': 'Order Builder'
  }
  const featureName = featureNames[feature] || feature
  showToast(`🔒 ${featureName} requires Plus subscription or higher`, 2000)
}

/* Camera & devices */
const scanning = ref(false)
const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string|undefined>(undefined)
const cameraViewRef = ref<InstanceType<typeof CameraView> | null>(null)
const videoTrack = ref<MediaStreamTrack | null>(null)
const torchSupported = ref(false)
const torchOn = ref(false)

/* Manual code entry */
const manualCode = ref('')

const cameraConstraints = computed<MediaTrackConstraints>(() =>
  selectedDeviceId.value ? { deviceId: selectedDeviceId.value } : { facingMode: 'environment' }
)

async function requestPermission() { 
  try { 
    const s = await navigator.mediaDevices.getUserMedia({ video: true })
    s.getTracks().forEach(t => t.stop())
  } catch {} 
}

async function onCameraReady() {
  try {
    const list = await navigator.mediaDevices.enumerateDevices()
    devices.value = list.filter(d => d.kind === 'videoinput')
  } catch {}
  
  await nextTick()
  
  try {
    const vid = cameraViewRef.value?.videoBox?.querySelector('video') as HTMLVideoElement | null
    const track = (vid?.srcObject as MediaStream | undefined)?.getVideoTracks?.()[0] || null
    videoTrack.value = track || null
    torchSupported.value = !!(track && typeof track.getCapabilities === 'function' && (track.getCapabilities as any)().torch !== undefined)
  } catch { 
    torchSupported.value = false 
  }
}

function onDeviceChange() { 
  if (scanning.value) { 
    scanning.value = false
    setTimeout(() => { 
      scanning.value = true
      torchOn.value = false 
    }, 0)
  }
}

function toggleCamera() {
  if (scanning.value) {
    scanning.value = false
    if (videoTrack.value) { 
      try { 
        (videoTrack.value as any).applyConstraints?.({ advanced: [{ torch: false }] })
      } catch {} 
    }
    torchOn.value = false
    clearPreview()
  } else {
    scanning.value = true
  }
}

async function toggleTorch() {
  if (!videoTrack.value) return
  const want = !torchOn.value
  try { 
    await (videoTrack.value as any).applyConstraints?.({ advanced: [{ torch: want }] })
    torchOn.value = want 
  } catch { 
    torchOn.value = false 
  }
}

/* Setup: formats, trims, checks */
const formatList: Format[] = [...ALL_FORMATS]
const enabled = reactive<Record<Format, boolean>>(JSON.parse(localStorage.getItem(LS.enabled) || '{}') || {})

// Enable all linear codes by default (if no saved preferences)
formatList.forEach(f => { 
  if (enabled[f] === undefined) {
    // Enable all linear codes by default
    enabled[f] = LINEAR_GROUP.includes(f)
  }
})

watch(enabled, () => localStorage.setItem(LS.enabled, JSON.stringify(enabled)), { deep: true })

// Initialize trims - all set to 0
const trims = reactive<TrimRules>(Object.assign({}, DEFAULT_TRIMS, JSON.parse(localStorage.getItem(LS.trims) || '{}')))
watch(trims, () => localStorage.setItem(LS.trims, JSON.stringify(trims)), { deep: true })

// Default stripCD to true (strip check digits by default)
const stripCD = ref(localStorage.getItem(LS.stripCD) !== null ? localStorage.getItem(LS.stripCD) === '1' : true)
const validateCD = ref(localStorage.getItem(LS.validateCD) === '1')
const beep = ref(localStorage.getItem(LS.beep) !== '0')

watch(stripCD, v => localStorage.setItem(LS.stripCD, v ? '1' : '0'))
watch(validateCD, v => localStorage.setItem(LS.validateCD, v ? '1' : '0'))
watch(beep, v => localStorage.setItem(LS.beep, v ? '1' : '0'))

/* Active formats for the camera */
const activeFormats = computed(() => {
  const list = formatList.filter(f => enabled[f])
  return list.length ? list : ['qr_code']
})

/* Group toggles */
const linearOn = computed(() => LINEAR_GROUP.every(f => enabled[f]))
const matrixOn = computed(() => MATRIX_GROUP.every(f => enabled[f]))

function toggleLinear(e: Event) { 
  const on = (e.target as HTMLInputElement).checked
  LINEAR_GROUP.forEach(f => { enabled[f] = on })
}

function toggleMatrix(e: Event) { 
  const on = (e.target as HTMLInputElement).checked
  MATRIX_GROUP.forEach(f => { enabled[f] = on })
}

function enableAll() { 
  formatList.forEach(f => { enabled[f] = true })
}

function disableAll() { 
  formatList.forEach(f => { enabled[f] = false })
}

function clearAllTrims() { 
  for (const f of formatList) { 
    trims[f].prefix = 0
    trims[f].suffix = 0 
  }
}

/* Catalog data */
const catalog = reactive(new Map<string, string>())
const rawRows = ref<Record<string, unknown>[]>([])
const columns = ref<string[]>([])
const barcodeCol = ref<string>(localStorage.getItem(LS.barcodeCol) || '')
const descCol = ref<string>(localStorage.getItem(LS.descCol) || '')
const search = ref('')
const searchBarcode = ref('')
const importStats = reactive({ total: 0, inserted: 0, blank: 0, duplicates: 0 })

watch(barcodeCol, v => localStorage.setItem(LS.barcodeCol, v))
watch(descCol, v => localStorage.setItem(LS.descCol, v))

const catalogEntries = computed<[string, string][]>(() => Array.from(catalog.entries()))
watch(catalogEntries, arr => { 
  localStorage.setItem(LS.catalog, JSON.stringify(arr))
}, { deep: true })

function normalize(s: string) { 
  return s.toLowerCase().replace(/[\s_\-]+/g, '').trim()
}

function guessCols(headers: string[]) {
  const H = headers.slice()
  const pri = [
    ['barcode', 'barcodes'], ['upc', 'upca', 'upce', 'upccode'],
    ['ean', 'ean13', 'ean8', 'gtin', 'gtin13', 'gtin12', 'gtin14', 'gtin8'],
    ['qrcode', 'qr'], ['code128', 'code39', 'code93', 'datamatrix', 'aztec'],
    ['code', 'productcode', 'bar_code', 'bar-code'], ['sku', 'item', 'itemcode', 'productid', 'id']
  ]
  const pick = (alts: string[]) => H.find(h => alts.includes(normalize(h)))
  barcodeCol.value = pick(pri.flat()) || H.find(h => /barcode/i.test(h)) || H[0] || ''
  descCol.value = H.find(h => /(description|desc|name|title)/i.test(h)) || ''
}

function rebuildCatalogFromSelections() {
  catalog.clear()
  importStats.total = rawRows.value.length
  importStats.inserted = 0
  importStats.blank = 0
  importStats.duplicates = 0
  
  const seen = new Set<string>()
  for (const r of rawRows.value) {
    const code = String((r as any)[barcodeCol.value] ?? '').trim()
    if (!code) { 
      importStats.blank++
      continue 
    }
    const desc = descCol.value ? String((r as any)[descCol.value] ?? '').trim() : ''
    if (seen.has(code)) importStats.duplicates++
    else seen.add(code)
    catalog.set(code, desc)
  }
  importStats.inserted = catalog.size
  syncBuilderDescriptionsFromCatalog()
}

watch([barcodeCol, descCol], rebuildCatalogFromSelections)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  // Check if user has catalog import feature
  if (!hasFeature('catalog_import')) {
    showToast('🔒 Catalog import requires Plus subscription or higher', 2000)
    ;(e.target as HTMLInputElement).value = '' // Clear the file input
    return
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase()
  let rows: Record<string, unknown>[] = []
  
  if (ext === 'csv') {
    rows = await new Promise<Record<string, unknown>[]>((res, rej) => {
      Papa.parse<Record<string, unknown>>(file, { 
        header: true, 
        skipEmptyLines: 'greedy', 
        dynamicTyping: false, 
        complete: r => res(r.data as any[]), 
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

const filteredCatalog = computed(() => {
  const qCode = searchBarcode.value.trim()
  const qAny = search.value.trim().toLowerCase()
  const out: {barcode: string, description: string}[] = []
  
  for (const [code, desc] of catalog) {
    if (qCode) {
      if (code.includes(qCode)) out.push({ barcode: code, description: desc })
    } else if (qAny) {
      if (code.toLowerCase().includes(qAny) || (desc || '').toLowerCase().includes(qAny)) {
        out.push({ barcode: code, description: desc })
      }
    } else {
      out.push({ barcode: code, description: desc })
    }
  }
  return out
})

function clearCatalog() {
  rawRows.value = []
  catalog.clear()
  columns.value = []
  barcodeCol.value = ''
  descCol.value = ''
  search.value = ''
  searchBarcode.value = ''
  importStats.total = importStats.inserted = importStats.blank = importStats.duplicates = 0
  localStorage.removeItem(LS.catalog)
}

/* Lists + persistence */
const quickList = reactive(new Map<string, number>())
const verifyRows = reactive<{code: string, ok: boolean}[]>([])
const builder = reactive(new Map<string, {qty: number, desc?: string}>())

const quickEntries = computed<[string, number][]>(() => Array.from(quickList.entries()))
const builderEntries = computed<[string, {qty: number, desc?: string}][]>(() => Array.from(builder.entries()))

watch(quickEntries, arr => { 
  localStorage.setItem(LS.quick, JSON.stringify(arr))
}, { deep: true })

watch(verifyRows, arr => { 
  localStorage.setItem(LS.verify, JSON.stringify(arr))
}, { deep: true })

watch(builderEntries, arr => { 
  localStorage.setItem(LS.builder, JSON.stringify(arr))
}, { deep: true })

onMounted(() => {
  try { 
    const Q = JSON.parse(localStorage.getItem(LS.quick) || '[]') as [string, number][]
    for (const [c, q] of Q) quickList.set(c, q)
  } catch {}
  
  try { 
    const V = JSON.parse(localStorage.getItem(LS.verify) || '[]') as {code: string, ok: boolean}[]
    verifyRows.splice(0, verifyRows.length, ...(V || []))
  } catch {}
  
  try { 
    const B = JSON.parse(localStorage.getItem(LS.builder) || '[]') as [string, {qty: number, desc?: string}][]
    for (const [c, v] of B) builder.set(c, v)
  } catch {}
  
  try { 
    const C = JSON.parse(localStorage.getItem(LS.catalog) || '[]') as [string, string][]
    catalog.clear()
    for (const [c, d] of C) catalog.set(c, d)
  } catch {}
  
  syncBuilderDescriptionsFromCatalog()
  startGuard()
  
  // Check if current mode is accessible, otherwise switch to 'quick'
  setTimeout(() => {
    if ((mode.value === 'verify' && !hasFeature('verify')) || 
        (mode.value === 'builder' && !hasFeature('builder'))) {
      mode.value = 'quick'
      console.log('Switched to Quick List mode due to subscription limitations')
    }
  }, 1000) // Small delay to allow session to load
})

onBeforeUnmount(stopGuard)

/* Fill Builder desc from Catalog only when missing/Unknown */
function syncBuilderDescriptionsFromCatalog() {
  for (const [code, item] of builder.entries()) {
    const isUnknown = !item.desc || /^unknown$/i.test(item.desc.trim())
    if (isUnknown) {
      const found = catalog.get(code)
      if (found && found.trim() !== '') {
        builder.set(code, { ...item, desc: found })
      }
    }
  }
}

/* Live preview + guard */
type Detected = { 
  boundingBox?: {x: number; y: number; width: number; height: number}
  rawValue?: string
  format?: string 
}

const live = reactive<{ raw: string | null; fmt?: Format }>({ raw: null, fmt: undefined })
let lastTrackAt = 0
let lastCodeAt = 0
let guardId: number | undefined

function startGuard() {
  stopGuard()
  guardId = window.setInterval(() => {
    if (!scanning.value) { 
      clearPreview()
      return 
    }
    const now = performance.now()
    if ((now - lastTrackAt) > 600 || (now - lastCodeAt) > 350) clearPreview()
  }, 150)
}

function stopGuard() { 
  if (guardId) { 
    clearInterval(guardId)
    guardId = undefined 
  }
}

function clearPreview() { 
  live.raw = null
  live.fmt = undefined 
}

const previewCode = computed<string>(() => {
  const raw = live.raw?.trim()
  if (!raw) return ''
  let code = raw
  const f = live.fmt
  if (f) {
    if (validateCD.value && !validateCheckDigit(code, f)) return ''
    code = applyTrims(code, f, trims)
    code = stripCheckDigit(code, f, stripCD.value)
  }
  return code
})

const canTap = computed(() => scanning.value && !!previewCode.value)
const tapLabel = computed(() => previewCode.value ? `Tap to add ${previewCode.value}` : 'Tap to add')

function paintTrack(codes: Detected[], ctx: CanvasRenderingContext2D) {
  lastTrackAt = performance.now()
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  let bestText: string | null = null
  let bestFmt: Format | undefined = undefined
  let bestArea = 0

  if (codes?.length) {
    const root = getComputedStyle(document.documentElement)
    const brand = (root.getPropertyValue('--brand') || '#2e7d32').trim()
    const bg = (root.getPropertyValue('--overlayBg') || 'rgba(0,0,0,.65)').trim()
    const fg = (root.getPropertyValue('--overlayFg') || '#fff').trim()

    ctx.save()
    ctx.lineWidth = 3
    ctx.strokeStyle = brand
    ctx.fillStyle = bg
    ctx.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    
    for (const c of codes) {
      const bb = c?.boundingBox
      if (!bb) continue
      const area = Math.max(0, bb.width) * Math.max(0, bb.height)
      ctx.strokeRect(bb.x, bb.y, bb.width, bb.height)

      if (c?.rawValue) {
        if (area > bestArea) {
          bestArea = area
          bestText = String(c.rawValue).trim() || null
          bestFmt = (String(c.format || '').toLowerCase() || undefined) as Format | undefined
        }
        const text = String(c.rawValue)
        const pad = 4
        const m = ctx.measureText(text)
        const tw = m.width + pad * 2
        const th = 18 + pad * 2
        const tx = Math.max(2, bb.x)
        const ty = Math.max(th + 2, bb.y)
        ctx.fillRect(tx, ty - th, tw, th)
        ctx.fillStyle = fg
        ctx.fillText(text, tx + pad, ty - 6)
        ctx.fillStyle = bg
      }
    }
    ctx.restore()
  }

  if (bestText) {
    if (live.raw !== bestText) {
      live.raw = bestText
      live.fmt = bestFmt
    }
    lastCodeAt = lastTrackAt
  }
}

/* Commit + exports + controls */
const editingCode = ref<string | null>(null)

const builderRows = computed(() =>
  [...builder.entries()].map(([code, v]) => {
    const stored = (v.desc && !/^unknown$/i.test(v.desc.trim())) ? v.desc : ''
    const show = (editingCode.value === code) ? stored : (stored || catalog.get(code) || '')
    return { code, qty: v.qty, desc: show }
  })
)

const last = reactive<{code: string | null, qty: number}>({ code: null, qty: 0 })

function tapToAdd() {
  const code = previewCode.value
  if (!code) return
  commitCode(code)
  showToast(`✔ Added ${code}`)
}

function commitCode(code: string) {
  if (beep.value) playBeep()
  
  if (mode.value === 'quick') {
    quickList.set(code, (quickList.get(code) || 0) + 1)
    setLast(code, quickList.get(code) as number)
  } else if (mode.value === 'verify') {
    const ok = catalog.has(code)
    const i = verifyRows.findIndex(r => r.code === code)
    if (i >= 0) { 
      verifyRows[i] = { code, ok } 
    } else { 
      verifyRows.push({ code, ok }) 
    }
    setLast(code, 1)
  } else {
    const ex = builder.get(code)
    if (ex) {
      ex.qty += 1
      if (!ex.desc || /^unknown$/i.test(ex.desc.trim())) {
        const found = catalog.get(code)
        if (found && found.trim() !== '') ex.desc = found
        else ex.desc = 'Unknown'
      }
      builder.set(code, ex)
      setLast(code, ex.qty)
    } else {
      const initialDesc = catalog.get(code) || 'Unknown'
      builder.set(code, { qty: 1, desc: initialDesc })
      setLast(code, 1)
    }
  }
}

function processManualCode() {
  const raw = manualCode.value.trim()
  if (!raw) return
  
  let code = raw
  let detectedFormat: Format | undefined = undefined
  
  if (/^\d{13}$/.test(raw)) {
    detectedFormat = 'ean_13'
  } else if (/^\d{12}$/.test(raw)) {
    detectedFormat = 'upc_a'
  } else if (/^\d{8}$/.test(raw)) {
    detectedFormat = 'ean_8'
  } else if (/^\d{7}$/.test(raw)) {
    detectedFormat = 'upc_e'
  }
  
  if (detectedFormat) {
    if (validateCD.value && !validateCheckDigit(code, detectedFormat)) {
      showToast(`❌ Invalid check digit for ${code}`)
      return
    }
    code = applyTrims(code, detectedFormat, trims)
    code = stripCheckDigit(code, detectedFormat, stripCD.value)
  }
  
  commitCode(code)
  showToast(`✔ Added ${code}`)
  manualCode.value = ''
}

function handleExternalScan(code: string) {
  // Process external scanner input
  let processedCode = code.trim()
  
  // Try to detect format and apply processing
  let detectedFormat: Format | undefined = undefined
  if (/^\d{13}$/.test(processedCode)) {
    detectedFormat = 'ean_13'
  } else if (/^\d{12}$/.test(processedCode)) {
    detectedFormat = 'upc_a'
  } else if (/^\d{8}$/.test(processedCode)) {
    detectedFormat = 'ean_8'
  } else if (/^\d{7}$/.test(processedCode)) {
    detectedFormat = 'upc_e'
  }
  
  if (detectedFormat) {
    if (validateCD.value && !validateCheckDigit(processedCode, detectedFormat)) {
      showToast(`❌ Invalid check digit for ${processedCode}`)
      return
    }
    processedCode = applyTrims(processedCode, detectedFormat, trims)
    processedCode = stripCheckDigit(processedCode, detectedFormat, stripCD.value)
  }
  
  commitCode(processedCode)
  showToast(`✔ Scanned ${processedCode}`)
}

function setBuilderDesc(code: string, desc: string) {
  const cur = builder.get(code) || { qty: 0, desc: '' }
  builder.set(code, { ...cur, desc })
}

function onDescBlur(code: string, val: string) {
  editingCode.value = null
  const trimmed = val.trim()
  if (trimmed === '') setBuilderDesc(code, 'Unknown')
}

function onError(err: any) { 
  console.warn(err) 
}

function setLast(code: string, qty: number) { 
  last.code = code
  last.qty = qty 
}

function incLast() { 
  if (!last.code) return
  if (mode.value === 'quick') { 
    changeQty('quick', last.code, +1) 
  } else { 
    changeQty('builder', last.code, +1) 
  }
}

function decLast() { 
  if (!last.code) return
  if (mode.value === 'quick') { 
    changeQty('quick', last.code, -1) 
  } else { 
    changeQty('builder', last.code, -1) 
  }
}

function changeQty(which: 'quick' | 'builder', code: string, delta: number) {
  if (which === 'quick') {
    const v = Math.max(0, (quickList.get(code) || 0) + delta)
    if (v === 0) quickList.delete(code)
    else quickList.set(code, v)
    if (last.code === code) last.qty = v
  } else {
    const cur = builder.get(code)
    if (!cur) return
    const v = Math.max(0, cur.qty + delta)
    if (v === 0) builder.delete(code)
    else builder.set(code, {...cur, qty: v})
    if (last.code === code) last.qty = v
  }
}

function removeItem(which: 'quick' | 'builder', code: string) { 
  if (which === 'quick') quickList.delete(code)
  else builder.delete(code)
}

function removeVerify(code: string) { 
  const i = verifyRows.findIndex(r => r.code === code)
  if (i >= 0) verifyRows.splice(i, 1)
}

function clearMode(which: 'quick' | 'verify' | 'builder') { 
  if (which === 'quick') quickList.clear()
  if (which === 'verify') verifyRows.splice(0)
  if (which === 'builder') builder.clear()
}

/* Exports */
function exportQuick(type: 'csv' | 'xlsx' | 'pdf') {
  const rows = [...quickList.entries()].map(([code, qty]) => [code, qty])
  if (type === 'csv') exportCSV('quick-list.csv', rows, ['Barcode', 'QTY'])
  if (type === 'xlsx') exportXLSX('quick-list.xlsx', rows, ['Barcode', 'QTY'])
  if (type === 'pdf') exportPDF('quick-list.pdf', rows, ['Barcode', 'QTY'])
}

function exportVerify(type: 'csv' | 'xlsx' | 'pdf') {
  const rows = verifyRows.map(r => [r.code, r.ok ? 'KNOWN' : 'UNKNOWN'])
  if (type === 'csv') exportCSV('catalog-verify.csv', rows, ['Barcode', 'Status'])
  if (type === 'xlsx') exportXLSX('catalog-verify.xlsx', rows, ['Barcode', 'Status'])
  if (type === 'pdf') exportPDF('catalog-verify.pdf', rows, ['Barcode', 'Status'])
}

function exportBuilder(type: 'csv' | 'xlsx' | 'pdf') {
  const rows = builderRows.value.map(r => [r.code, (r.desc && r.desc.trim() !== '' ? r.desc : 'Unknown'), r.qty])
  if (type === 'csv') exportCSV('order-builder.csv', rows, ['Barcode', 'Description', 'QTY'])
  if (type === 'xlsx') exportXLSX('order-builder.xlsx', rows, ['Barcode', 'Description', 'QTY'])
  if (type === 'pdf') exportPDF('order-builder.pdf', rows, ['Barcode', 'Description', 'QTY'])
}

/* Toast + Beep */
const toast = reactive({ show: false, text: '' })
let toastTimer: number | undefined

function showToast(text: string, ms = 900) { 
  toast.text = text
  toast.show = true
  if (toastTimer) clearTimeout(toastTimer as any)
  toastTimer = setTimeout(() => { 
    toast.show = false 
  }, ms) as any
}

function playBeep() { 
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any
  const ctx = new Ctx()
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.connect(g)
  g.connect(ctx.destination)
  o.frequency.value = 880
  g.gain.value = 0.1
  o.start()
  setTimeout(() => { 
    o.stop()
    ctx.close() 
  }, 120)
}
</script>

<style scoped>
:root {
  --overlayBg: rgba(0,0,0,.65);
  --overlayFg: #fff;
  --fg: #e8e8e8;
  --edge: rgba(255,255,255,.14);
  --headerH: 71px;
  --logoH: 36px;
  --qtyCol: 260px;
  --statusCol: 96px;
  --delCol: 56px;
}

.light { 
  --overlayBg: rgba(255,255,255,.8);
  --overlayFg: #000;
  --fg: #111;
  --edge: rgba(0,0,0,.14);
}

@media (max-width: 420px) { 
  :root { 
    --qtyCol: 220px;
    --statusCol: 84px;
  }
}

.panel {
  background: var(--panel);
  border: 1px solid var(--muted);
  border-radius: var(--radius);
  padding: 14px;
  box-shadow: var(--shadow);
  overflow-x: hidden;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.row > * {
  min-width: 0;
}

.btn {
  border: 1px solid var(--muted);
  background: var(--brand);
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
  cursor: pointer;
}

.btn.ghost {
  background: transparent;
  color: var(--text);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}

.kbd {
  border: 1px solid var(--muted);
  border-radius: 6px;
  padding: 4px 6px;
  background: var(--panel2);
  color: var(--text);
}

.icon-btn {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--muted);
  background: var(--panel2);
  cursor: pointer;
  color: var(--text);
}

.chips {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
  width: 100%;
}

.chips .tab {
  flex: 1 1 0;
}

.tab {
  flex: 1 1 0;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--pill-border);
  background: var(--panel2);
  cursor: pointer;
  text-align: center;
  color: var(--text);
  position: relative;
}

.tab.active {
  outline: 2px solid var(--brand);
  background: transparent;
}

.tab.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

:root.light .tab.active { 
  border-color: var(--brand);
}

.input {
  border: 1px solid var(--muted);
  background: var(--panel2);
  border-radius: 10px;
  padding: 10px;
  color: var(--text);
  max-width: 100%;
}

/* Desktop side-by-side layout for SCAN tab */
@media (min-width: 1024px) {
  .scan-panel {
    height: calc(100vh - var(--headerH) - 100px);
    overflow: hidden;
  }
  
  .scan-layout {
    display: flex;
    gap: 20px;
    height: 100%;
  }
  
  .scan-left {
    flex: 0 0 50%;
    display: flex;
    flex-direction: column;
    min-width: 400px;
  }
  
  .scan-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }
  
  .mode-content {
    flex: 1;
    overflow-y: auto;
    margin-top: 10px;
    padding-right: 10px;
  }
  
  /* Adjust camera view for desktop */
  .scan-left :deep(.video) {
    height: calc(100vh - 350px);
    max-height: 500px;
    aspect-ratio: unset;
  }
}

/* Mobile layout */
@media (max-width: 1023px) {
  .scan-layout {
    display: block;
  }
  
  .scan-left,
  .scan-right {
    width: 100%;
  }
  
  .mode-content {
    margin-top: 10px;
  }
}
</style>