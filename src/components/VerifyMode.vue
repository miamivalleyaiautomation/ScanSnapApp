<!-- src/components/VerifyMode.vue -->
<template>
  <div>
    <div class="verify-summary top">
      <span class="count">✅ {{ knownCount }}</span>
      <span class="count">❌ {{ unknownCount }}</span>
    </div>

    <table class="table">
      <colgroup><col class="col-barcode" /><col class="col-status" /><col class="col-del" /></colgroup>
      <thead><tr><th>Barcode</th><th class="center">Status</th><th></th></tr></thead>
      <tbody>
        <tr v-for="r in verifyRows" :key="r.code">
          <td class="barcode-col"><div class="barcode-text">{{ r.code }}</div></td>
          <td class="center">
            <span v-if="r.ok" class="status-emoji" aria-label="Known">✅</span>
            <span v-else class="status-emoji" aria-label="Unknown">❌</span>
          </td>
          <td class="right"><button class="icon-btn" @click="$emit('remove-verify', r.code)" aria-label="Delete">✖</button></td>
        </tr>
      </tbody>
    </table>

    <div class="row" style="margin-top:10px">
      <button class="btn ghost" @click="$emit('export', 'csv')">Export CSV</button>
      <button class="btn ghost" @click="$emit('export', 'xlsx')">Export Excel</button>
      <button class="btn ghost" @click="$emit('export', 'pdf')">Export PDF</button>
      <button class="btn warn" style="margin-left:auto" @click="$emit('clear')">Clear</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  verifyRows: {code: string, ok: boolean}[]
}>()

defineEmits<{
  'remove-verify': [code: string]
  'export': [type: 'csv' | 'xlsx' | 'pdf']
  'clear': []
}>()

const knownCount = computed(() => props.verifyRows.filter(r=>r.ok).length)
const unknownCount = computed(() => props.verifyRows.filter(r=>!r.ok).length)
</script>

<style scoped>
.verify-summary{ display:flex; gap:10px; margin:6px 0; }
.verify-summary.top{ margin-top:8px; }
.verify-summary .count { color: var(--fg); font-weight: 700; }

.status-emoji{ font-size:1.1rem; }

.table{ width:100%; border-collapse:collapse; table-layout:fixed; }
.table th,.table td{ padding:8px 10px; vertical-align:middle; }
.table col.col-barcode{ width:auto; }
.table col.col-status{ width:var(--statusCol); }
.table col.col-del{ width:var(--delCol); }

.barcode-col{ width:auto; }
.barcode-text{
  display:inline-block;
  min-width:20ch;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  font-variant-numeric: tabular-nums;
}

.right{ text-align:right; }
.center{ text-align:center; }

.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.ghost{background:transparent;color:var(--text)}
.btn.warn{background:var(--bad)}
.icon-btn{
  display:inline-grid;place-items:center;width:36px;height:36px;border-radius:10px;
  border:1px solid var(--muted);background:var(--panel2);cursor:pointer;color:var(--text)
}
</style>