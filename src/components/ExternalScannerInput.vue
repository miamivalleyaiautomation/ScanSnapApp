<!-- src/components/ExternalScannerInput.vue -->
<template>
  <div class="external-scanner">
    <div class="scanner-status" :class="{ active: isListening }">
      <div class="status-icon">{{ isListening ? '🟢' : '🔴' }}</div>
      <div class="status-text">
        <div class="status-title">External Scanner {{ isListening ? 'Active' : 'Inactive' }}</div>
        <div class="status-desc">{{ statusMessage }}</div>
      </div>
    </div>
    
    <div class="scanner-display">
      <div class="display-label">Last Scanned:</div>
      <div class="display-value">{{ lastScanned || '—' }}</div>
      <div v-if="bufferContent" class="buffer-preview">
        Buffering: {{ bufferContent }}
      </div>
    </div>

    <div class="scanner-instructions">
      <h4>📋 Instructions:</h4>
      <ul>
        <li>Click "Start Listening" to activate scanner input</li>
        <li>Ensure this window has focus when scanning</li>
        <li>Scanner must be configured to send Enter/Tab after scan</li>
        <li>Most USB/Bluetooth scanners work automatically</li>
      </ul>
    </div>

    <div class="row" style="margin-top:12px">
      <button class="btn" @click="toggleListening" style="flex:1">
        {{ isListening ? 'Stop Listening' : 'Start Listening' }}
      </button>
      <button class="btn ghost" @click="testScan" style="flex:1">
        Test with Sample
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps<{
  enabled: boolean
}>()

const emit = defineEmits<{
  'scanned': [code: string]
}>()

const isListening = ref(false)
const lastScanned = ref('')
const bufferContent = ref('')
const statusMessage = ref('Click "Start Listening" to begin')

let scanBuffer = ''
let bufferTimer: number | undefined

// Auto-start listening when component is enabled
watch(() => props.enabled, (enabled) => {
  if (enabled && !isListening.value) {
    startListening()
  } else if (!enabled && isListening.value) {
    stopListening()
  }
}, { immediate: true })

function startListening() {
  isListening.value = true
  statusMessage.value = 'Waiting for scanner input...'
  scanBuffer = ''
  bufferContent.value = ''
}

function stopListening() {
  isListening.value = false
  statusMessage.value = 'Scanner input disabled'
  scanBuffer = ''
  bufferContent.value = ''
  if (bufferTimer) {
    clearTimeout(bufferTimer)
    bufferTimer = undefined
  }
}

function toggleListening() {
  if (isListening.value) {
    stopListening()
  } else {
    startListening()
  }
}

function handleKeyPress(event: KeyboardEvent) {
  if (!isListening.value) return
  
  // Ignore if user is typing in an input field (unless it's our hidden input)
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
    if (!target.classList.contains('external-scanner-hidden-input')) {
      return
    }
  }

  // Clear existing timer
  if (bufferTimer) {
    clearTimeout(bufferTimer)
  }

  // Handle Enter or Tab as scan terminators
  if (event.key === 'Enter' || event.key === 'Tab') {
    if (scanBuffer.trim()) {
      processScan(scanBuffer.trim())
      scanBuffer = ''
      bufferContent.value = ''
    }
    event.preventDefault()
    return
  }

  // Build up the scan buffer with printable characters
  if (event.key.length === 1) {
    scanBuffer += event.key
    bufferContent.value = scanBuffer
    
    // Auto-submit after 100ms of no input (some scanners don't send Enter)
    bufferTimer = setTimeout(() => {
      if (scanBuffer.trim()) {
        processScan(scanBuffer.trim())
        scanBuffer = ''
        bufferContent.value = ''
      }
    }, 100) as any
    
    event.preventDefault()
  }
}

function processScan(code: string) {
  lastScanned.value = code
  statusMessage.value = `Scanned: ${code}`
  emit('scanned', code)
  
  // Clear status message after 2 seconds
  setTimeout(() => {
    if (isListening.value) {
      statusMessage.value = 'Waiting for scanner input...'
    }
  }, 2000)
}

function testScan() {
  // Simulate a scan with a sample barcode
  const sampleCode = '123456789012'
  processScan(sampleCode)
}

onMounted(() => {
  // Add global keyboard listener
  window.addEventListener('keydown', handleKeyPress)
})

onBeforeUnmount(() => {
  stopListening()
  window.removeEventListener('keydown', handleKeyPress)
})
</script>

<style scoped>
.external-scanner {
  border: 1px solid var(--muted);
  border-radius: 12px;
  background: var(--panel2);
  padding: 16px;
  margin: 8px 0;
}

.scanner-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: var(--panel);
  border: 1px solid var(--muted);
  margin-bottom: 12px;
  transition: all 0.3s;
}

.scanner-status.active {
  border-color: var(--brand);
  background: rgba(59, 130, 246, 0.1);
}

.status-icon {
  font-size: 1.5rem;
}

.status-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text);
}

.status-desc {
  font-size: 0.875rem;
  color: var(--muted);
  margin-top: 2px;
}

.scanner-display {
  padding: 12px;
  background: var(--panel);
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--muted);
}

.display-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--muted);
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.display-value {
  font-size: 1.25rem;
  font-weight: 600;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: var(--text);
}

.buffer-preview {
  margin-top: 8px;
  padding: 4px 8px;
  background: var(--panel2);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--brand);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.scanner-instructions {
  padding: 12px;
  background: var(--panel);
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--muted);
}

.scanner-instructions h4 {
  margin: 0 0 8px 0;
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 600;
}

.scanner-instructions ul {
  margin: 0;
  padding-left: 20px;
}

.scanner-instructions li {
  font-size: 0.875rem;
  color: var(--text-dim);
  margin: 4px 0;
}

.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.ghost{background:transparent;color:var(--text)}
</style>