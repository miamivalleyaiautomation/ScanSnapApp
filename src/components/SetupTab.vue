<!-- src/components/SetupTab.vue -->
<template>
  <div class="panel">
    <h3>Scanner Input Mode</h3>
    <div class="row" style="margin-bottom:15px">
      <label class="radio-option">
        <input 
          type="radio" 
          name="scannerMode" 
          value="camera" 
          :checked="scannerMode === 'camera'"
          @change="$emit('update:scannerMode', 'camera')"
        />
        <span class="radio-label">📷 Built-in Camera</span>
        <span class="radio-desc">Use device camera for scanning</span>
      </label>
      <label class="radio-option">
        <input 
          type="radio" 
          name="scannerMode" 
          value="external" 
          :checked="scannerMode === 'external'"
          @change="$emit('update:scannerMode', 'external')"
        />
        <span class="radio-label">🔌 External Scanner</span>
        <span class="radio-desc">USB/Bluetooth barcode reader</span>
      </label>
    </div>

    <h3>Checks & Trims</h3>
    <div class="row" style="margin-bottom:10px">
      <label><input type="checkbox" :checked="validateCD" @change="$emit('update:validateCD', $event.target.checked)" /> Validate EAN/UPC check digit</label>
      <label><input type="checkbox" :checked="stripCD" @change="$emit('update:stripCD', $event.target.checked)" /> Strip EAN/UPC check digit</label>
      <label><input type="checkbox" :checked="beep" @change="$emit('update:beep', $event.target.checked)" /> Beep on success</label>
    </div>

    <h3>Scanner Formats</h3>
    <div class="row nowrap" style="margin-bottom:6px">
      <button class="btn ghost" @click="$emit('enable-all')">Enable all</button>
      <button class="btn ghost" @click="$emit('disable-all')">Disable all</button>
    </div>
    <div class="row nowrap" style="margin-bottom:8px">
      <label class="kbd no-wrap"><input type="checkbox" :checked="linearOn" @change="$emit('toggle-linear', $event)" /> linear_codes</label>
      <label class="kbd no-wrap"><input type="checkbox" :checked="matrixOn" @change="$emit('toggle-matrix', $event)" /> matrix_codes</label>
    </div>

    <div class="row nowrap" style="margin-bottom:8px">
      <button class="btn warn" @click="$emit('clear-all-trims')">Clear all trims</button>
    </div>

    <table class="table setup">
      <thead><tr><th>Format</th><th>Trim Prefix</th><th>Trim Suffix</th><th class="center">Enabled</th></tr></thead>
      <tbody>
        <tr v-for="f in formatList" :key="f">
          <td class="ellipsis">{{ f }}</td>
          <td><input class="input input-compact" type="number" min="0" :value="trims[f].prefix" @input="updateTrim(f, 'prefix', $event)" /></td>
          <td><input class="input input-compact" type="number" min="0" :value="trims[f].suffix" @input="updateTrim(f, 'suffix', $event)" /></td>
          <td class="center"><input type="checkbox" :checked="enabled[f]" @change="updateEnabled(f, $event)" /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Format, TrimRules } from '../utils/barcode'

const props = defineProps<{
  scannerMode: 'camera' | 'external'
  validateCD: boolean
  stripCD: boolean
  beep: boolean
  linearOn: boolean
  matrixOn: boolean
  formatList: Format[]
  trims: TrimRules
  enabled: Record<Format, boolean>
}>()

const emit = defineEmits<{
  'update:scannerMode': [value: 'camera' | 'external']
  'update:validateCD': [value: boolean]
  'update:stripCD': [value: boolean]
  'update:beep': [value: boolean]
  'toggle-linear': [event: Event]
  'toggle-matrix': [event: Event]
  'enable-all': []
  'disable-all': []
  'clear-all-trims': []
  'update-trim': [format: Format, field: 'prefix' | 'suffix', value: number]
  'update-enabled': [format: Format, value: boolean]
}>()

function updateTrim(format: Format, field: 'prefix' | 'suffix', event: Event) {
  const value = Number((event.target as HTMLInputElement).value) || 0
  emit('update-trim', format, field, value)
}

function updateEnabled(format: Format, event: Event) {
  const value = (event.target as HTMLInputElement).checked
  emit('update-enabled', format, value)
}
</script>

<style scoped>
.panel{
  background:var(--panel);border:1px solid var(--muted);border-radius:var(--radius);
  padding:14px;box-shadow:var(--shadow);overflow-x:hidden
}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row > *{min-width:0}
.nowrap{flex-wrap:nowrap}
.no-wrap{white-space:nowrap}

.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.ghost{background:transparent;color:var(--text)}
.btn.warn{background:var(--bad)}

.input{
  border:1px solid var(--muted);background:var(--panel2);
  border-radius:10px;padding:10px;color:var(--text);max-width:100%;
}
.input-compact{width:84px;max-width:100%;padding:8px;border-radius:8px}

.kbd{border:1px solid var(--muted);border-radius:6px;padding:4px 6px;background:var(--panel2);color:var(--text)}

.table{
  width:100%;
  table-layout:fixed;
  border-collapse:separate;border-spacing:0;margin-top:10px;
}
.table th,.table td{
  padding:10px;border-bottom:1px solid var(--muted);text-align:left;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.table th{color:var(--text-dim);font-weight:600}

.table.setup{table-layout:fixed}
.table.setup th:nth-child(1), .table.setup td:nth-child(1){width:52%}
.table.setup th:nth-child(2), .table.setup td:nth-child(2){width:16%}
.table.setup th:nth-child(3), .table.setup td:nth-child(3){width:16%}
.table.setup th:nth-child(4), .table.setup td:nth-child(4){width:16%}
.table.setup td.ellipsis{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.table.setup td.center,.table.setup th.center{text-align:center}
.table.setup th,.table.setup td{padding:8px 6px}

@media (max-width:560px){
  .input-compact{width:72px;padding:6px}
  .table.setup th:nth-child(1), .table.setup td:nth-child(1){width:auto}
  .table.setup th:nth-child(2), .table.setup td:nth-child(2){width:22%}
  .table.setup th:nth-child(3), .table.setup td:nth-child(3){width:22%}
  .table.setup th:nth-child(4), .table.setup td:nth-child(4){width:18%}
}

/* Radio option styles */
.radio-option {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--muted);
  border-radius: 10px;
  background: var(--panel2);
  cursor: pointer;
  transition: all 0.2s;
  flex: 1;
  position: relative;
}

.radio-option:hover {
  border-color: var(--brand);
}

.radio-option input[type="radio"] {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.radio-label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 28px;
}

.radio-desc {
  font-size: 0.875rem;
  color: var(--muted);
  margin-left: 28px;
}

.radio-option input[type="radio"]:checked ~ .radio-label {
  color: var(--brand);
  font-weight: 600;
}

.radio-option input[type="radio"]:checked ~ .radio-desc {
  color: var(--text);
}

.radio-option input[type="radio"]:checked {
  accent-color: var(--brand);
}
</style>