 <!-- src/views/VerifyTab.vue -->
<template>
  <div class="verify-wrap">
    <!-- Header / Controls -->
    <div class="verify-head">
      <button class="tap-to-scan" @click="startCamera">TAP TO SCAN</button>
      <!-- (Your other controls stay here) -->
    </div>

    <!-- Manual entry sits *right under* TAP TO SCAN when enabled -->
    <ManualInlineEntry
      v-if="settings.manualEntryEnabled"
      @submit="handleManualInlineSubmit"
    />

    <!-- Camera area -->
    <div class="camera-shell">
      <!-- your existing camera markup -->
      <video ref="videoRef" autoplay playsinline muted class="camera-feed"></video>
      <canvas ref="canvasRef" class="camera-canvas" hidden></canvas>
    </div>

    <!-- Results / table / whatever you already render -->
    <div class="results-shell">
      <slot name="results"></slot>
      <!-- or your existing list/table component -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ManualInlineEntry from '@/components/ManualInlineEntry.vue'
import { useSettingsStore } from '@/stores/settingsStore'

// If you already have a scanning store, import it here.
// import { useVerifyStore } from '@/stores/verifyStore'

const settings = useSettingsStore()

// Refs for camera elements (if you already have them, keep your implementation)
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
let stream: MediaStream | null = null

// IMPORTANT: We forward manual entry to the *same* handler your camera uses.
// Replace these with your project’s real function names if different.
declare const onCodeDetected:
  | ((rawText: string, opts?: { qty?: number; source?: string }) => void)
  | undefined
declare const handleDetected:
  | ((rawText: string, opts?: { qty?: number; source?: string }) => void)
  | undefined

function forwardToScanPath(code: string, source: string) {
  if (typeof handleDetected === 'function') {
    handleDetected(code, { source })
  } else if (typeof onCodeDetected === 'function') {
    onCodeDetected(code, { source })
  } else {
    // Fallback: emit a DOM event (in case your app listens globally)
    window.dispatchEvent(
      new CustomEvent('ss:code-detected', { detail: { code, source } })
    )
  }
}

function handleManualInlineSubmit(payload: { code: string; source: 'manual-inline' }) {
  forwardToScanPath(payload.code, payload.source)
}

/** Your existing camera start logic; kept minimal here */
async function startCamera() {
  try {
    stopCamera()
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    // Your barcode library init / scan loop continues as you already had it
  } catch (err) {
    console.error('Camera start failed:', err)
  }
}
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
}
onMounted(() => {
  // If your previous logic auto-starts, keep it
})
onBeforeUnmount(() => stopCamera())
</script>

<style scoped>
.verify-wrap { display:flex; flex-direction:column; gap:1rem }
.verify-head { display:flex; align-items:center; gap:.75rem }
.tap-to-scan {
  padding:.7rem 1rem; border:none; border-radius:.75rem; cursor:pointer;
  background:var(--brand-grad, linear-gradient(135deg, var(--brand0,#00d1ff), var(--brand1,#4a90e2)));
  color:#fff; font-weight:700; letter-spacing:.02em;
  box-shadow:var(--shadow,0 8px 24px rgba(0,0,0,.15));
}
.camera-shell { position:relative; border:1px solid var(--line,#161b22); border-radius:.75rem; overflow:hidden; }
.camera-feed { width:100%; height:auto; display:block; background:#000; }
.camera-canvas { width:100%; height:auto; display:block; }
.results-shell { }
</style>
