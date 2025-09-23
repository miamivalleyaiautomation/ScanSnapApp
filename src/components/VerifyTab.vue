<template>
  <section class="verify-tab">
    <header class="header">
      <h2>Verify</h2>
      <div class="actions">
        <button @click="exportCSV">Export CSV</button>
        <button @click="exportPDF">Export PDF</button>
        <button class="muted" @click="resetScans">Reset Scans</button>
      </div>
    </header>

    <div class="counters">
      <StatusBadge status="OK" /> <b>{{ totals.ok }}</b>
      <StatusBadge status="PARTIAL" /> <b>{{ totals.partial }}</b>
      <StatusBadge status="BAD" /> <b>{{ totals.bad }}</b>
    </div>

    <div class="upload">
      <CatalogUpload
        @verify-loaded="onVerifyLoaded"
        @order-loaded="onOrderLoaded"
      />
    </div>

    <div class="scanner-helper">
      <label>
        Simulate scan:
        <input v-model="simulate" placeholder="scan barcode…" @keyup.enter="simulateScan" />
        <input type="number" v-model.number="simulateQty" min="1" style="width:80px" />
        <button @click="simulateScan">Add</button>
      </label>
      <small>Hook your real scanner to call <code>handleScan(code, qty?)</code>.</small>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Barcode</th>
            <th>Required</th>
            <th>Scanned</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.barcode" :class="rowClass(r.status)">
            <td><StatusBadge :status="r.status" /></td>
            <td class="mono">{{ r.barcode }}</td>
            <td class="num">{{ r.required }}</td>
            <td class="num">{{ r.scanned }}</td>
          </tr>
          <tr v-if="rows.length===0">
            <td colspan="4" class="empty">Upload a Verify Catalog to begin.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, defineExpose } from 'vue';
import StatusBadge from './StatusBadge.vue';
import CatalogUpload from './CatalogUpload.vue';
import { useVerifyStore } from '../stores/verifyStore';  // Changed from '@/stores/verifyStore'
import type { Status } from '../types/catalog';  // Changed from '@/types/catalog'

const store = useVerifyStore();
const rows = computed(() => store.rows.value);
const totals = computed(() => store.totals.value);

const simulate = ref('');
const simulateQty = ref(1);

function rowClass(s: Status) {
  return s === 'OK' ? 'ok' : s === 'PARTIAL' ? 'partial' : 'bad';
}

function onVerifyLoaded(items: { barcode: string; qty: number }[]) {
  store.loadVerifyCatalog(items);
}

function onOrderLoaded(items: { barcode: string; qty?: number }[]) {
  store.loadOrderCatalog(items);
}

function handleScan(code: string, qty = 1) {
  const status = store.recordScan(code, qty);
  // Why: you may want to beep/color flash here based on `status`.
  return status;
}

function simulateScan() {
  if (!simulate.value) return;
  handleScan(simulate.value, Math.max(1, simulateQty.value || 1));
  simulate.value = '';
  simulateQty.value = 1;
}

function resetScans() {
  store.resetScans();
}

function exportCSV() { store.exportVerifyToCSV('verify.csv'); }
async function exportPDF() { await store.exportVerifyToPDF('verify.pdf'); }

defineExpose({ handleScan });
</script>

<style scoped>
.verify-tab { display:flex; flex-direction:column; gap:12px; }
.header { display:flex; align-items:center; justify-content:space-between; }
.actions { display:flex; gap:8px; }
.actions button { padding:6px 10px; border-radius:8px; border:1px solid #e5e7eb; background:#111827; color:white; cursor:pointer; }
.actions button.muted { background:#f8fafc; color:#111827; }
.counters { display:flex; align-items:center; gap:10px; }
.upload { border-top:1px solid #e5e7eb; padding-top:8px; }
.scanner-helper { display:flex; align-items:center; gap:10px; }
.scanner-helper input { margin-left:6px; padding:6px 8px; border:1px solid #e5e7eb; border-radius:8px; }
.table-wrap { max-height: 60vh; overflow:auto; border:1px solid #e5e7eb; border-radius:12px; }
table { width:100%; border-collapse:separate; border-spacing:0; }
th, td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
th { text-align:left; background:#f8fafc; position:sticky; top:0; }
td.num { text-align:right; }
td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
tr.ok { background:#f6fff9; }
tr.bad { background:#fff7f7; }
tr.partial { background:#fffdea; }
.empty { text-align:center; color:#6b7280; }
</style>