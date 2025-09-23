<!-- /src/components/CatalogUpload.vue -->
<template>
  <div class="catalog-upload">
    <div class="tabs">
      <button :class="{active: tab==='verify'}" @click="tab='verify'">Verify Catalog</button>
      <button :class="{active: tab==='order'}" @click="tab='order'">Order Catalog</button>
    </div>

    <div v-if="tab==='verify'" class="panel">
      <h3>Verify Catalog</h3>
      <p>Expected CSV headers: <code>Barcode,QTY</code></p>
      <input type="file" accept=".csv,text/csv" @change="onPickVerify" />
    </div>

    <div v-else class="panel">
      <h3>Order Catalog</h3>
      <p>CSV headers flexible. Minimum: <code>Barcode</code>. Optional: <code>QTY</code></p>
      <input type="file" accept=".csv,text/csv" @change="onPickOrder" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { parseCSVObjects, pick, toNumberSafe } from '@/utils/csv';
import type { VerifyCatalogRow, OrderRow } from '@/types/catalog';

const emit = defineEmits<{
  (e: 'verify-loaded', rows: VerifyCatalogRow[]): void;
  (e: 'order-loaded', rows: OrderRow[]): void;
}>();

const tab = ref<'verify' | 'order'>('verify');

async function readFile(file: File): Promise<string> {
  return await file.text();
}

async function onPickVerify(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await readFile(f);
  const { rows } = parseCSVObjects(text);
  const out: VerifyCatalogRow[] = rows.map(r => ({
    barcode: (pick(r, ['barcode', 'bar code', 'code']) ?? '').trim(),
    qty: Math.max(0, Math.floor(toNumberSafe(pick(r, ['qty', 'quantity'])))),
  })).filter(r => r.barcode);
  emit('verify-loaded', out);
  (e.target as HTMLInputElement).value = '';
}

async function onPickOrder(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const text = await readFile(f);
  const { rows } = parseCSVObjects(text);
  const out: OrderRow[] = rows.map(r => ({
    barcode: (pick(r, ['barcode', 'bar code', 'code']) ?? '').trim(),
    qty: toNumberSafe(pick(r, ['qty', 'quantity'])) || undefined,
  })).filter(r => r.barcode);
  emit('order-loaded', out);
  (e.target as HTMLInputElement).value = '';
}
</script>

<style scoped>
.catalog-upload { border:1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.tabs { display:flex; gap:8px; margin-bottom:8px; }
.tabs button { padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#f8fafc; cursor:pointer; }
.tabs button.active { background:#111827; color:white; border-color:#111827; }
.panel h3 { margin: 4px 0 6px; }
code { background:#f3f4f6; padding: 2px 6px; border-radius: 6px; }
</style>
