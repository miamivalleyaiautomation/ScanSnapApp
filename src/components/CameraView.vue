<!-- src/components/CameraView.vue -->
<template>
  <div class="video" ref="videoBox">
    <button
      v-if="scanning && torchSupported"
      class="icon-btn"
      style="position:absolute;top:8px;left:8px;z-index:4"
      :style="torchOn ? 'background:var(--brand);color:#fff;border-color:transparent' : ''"
      @click="$emit('toggle-torch')" 
      :title="torchOn ? 'Torch Off' : 'Torch On'" 
      aria-label="Toggle torch"
    >🔦</button>

    <div v-if="toast.show" class="toast" role="status" aria-live="polite">{{ toast.text }}</div>

    <QrcodeStream
      v-if="scanning"
      :constraints="cameraConstraints"
      :formats="activeFormats"
      :track="paintTrack"
      @camera-on="$emit('camera-ready')"
      @error="$emit('error', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { QrcodeStream } from 'vue-qrcode-reader'
import { ref } from 'vue'
import type { Format } from '../utils/barcode'

defineProps<{
  scanning: boolean
  torchSupported: boolean
  torchOn: boolean
  toast: { show: boolean; text: string }
  cameraConstraints: MediaTrackConstraints
  activeFormats: Format[]
  paintTrack: Function
}>()

defineEmits<{
  'toggle-torch': []
  'camera-ready': []
  'error': [error: any]
}>()

const videoBox = ref<HTMLElement | null>(null)

defineExpose({ videoBox })
</script>

<style scoped>
.video{
  position:relative;width:100%;aspect-ratio:16/9;
  border:1px solid var(--muted);border-radius:12px;overflow:hidden;background:#000
}

/* Desktop: Full height camera view */
@media (min-width: 1024px) {
  .video {
    aspect-ratio: unset;
    height: 100%;
    min-height: 400px;
  }
}

:deep(canvas){ position:absolute; inset:0; z-index:3; }
:deep(video){ 
  position:relative; 
  z-index:1; 
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-btn{
  display:inline-grid;place-items:center;width:36px;height:36px;border-radius:10px;
  border:1px solid var(--muted);background:var(--panel2);cursor:pointer;color:var(--text)
}

.toast{
  position:absolute;
  left:50%; bottom:10px; transform:translateX(-50%);
  background: var(--brand);
  color:#fff;
  padding:6px 10px;
  border-radius:999px;
  font-weight:600;
  box-shadow:0 4px 12px rgba(0,0,0,.25);
  z-index:5;
}
</style>