<!-- src/components/ScannerControls.vue -->
<template>
  <div>
    <div class="row nowrap" style="margin-bottom:8px">
      <button class="btn" style="flex:1" @click="$emit('toggle-camera')">{{ scanning ? 'Stop Camera' : 'Start Camera' }}</button>
      <button class="btn ghost" style="flex:1" @click="$emit('request-permission')">Camera Permission</button>
    </div>

    <div class="row" style="margin-bottom:8px">
      <select class="input" :value="selectedDeviceId" @change="$emit('device-change', $event)" style="flex:1">
        <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'camera' }}</option>
      </select>
    </div>

    <!-- Manual code entry -->
    <div class="row" style="margin-bottom:8px">
      <input 
        class="input" 
        v-model="localManualCode" 
        @keyup.enter="handleManualAdd"
        placeholder="Enter barcode manually..." 
        style="flex:1"
      />
      <button class="btn ghost" @click="handleManualAdd" :disabled="!localManualCode.trim()">Add</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  scanning: boolean
  devices: MediaDeviceInfo[]
  selectedDeviceId: string | undefined
  manualCode: string
}>()

const emit = defineEmits<{
  'toggle-camera': []
  'request-permission': []
  'device-change': [event: Event]
  'update:manualCode': [value: string]
  'process-manual-code': []
}>()

const localManualCode = ref(props.manualCode)

watch(() => props.manualCode, (val) => {
  localManualCode.value = val
})

watch(localManualCode, (val) => {
  emit('update:manualCode', val)
})

function handleManualAdd() {
  if (localManualCode.value.trim()) {
    emit('process-manual-code')
  }
}
</script>

<style scoped>
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row > *{min-width:0}
.nowrap{flex-wrap:nowrap}
.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.ghost{background:transparent;color:var(--text)}
.input{
  border:1px solid var(--muted);background:var(--panel2);
  border-radius:10px;padding:10px;color:var(--text);max-width:100%;
}
</style>