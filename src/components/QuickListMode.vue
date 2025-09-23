<!-- src/components/QuickListMode.vue -->
<template>
  <div>
    <table class="table">
      <colgroup><col class="col-barcode" /><col class="col-qty" /></colgroup>
      <thead><tr><th>Barcode</th><th class="right">QTY</th></tr></thead>
      <tbody>
        <tr v-for="([code, qty]) in entries" :key="code">
          <td class="barcode-col"><div class="barcode-text">{{ code }}</div></td>
          <td class="qty-cell">
            <div class="qty-pack">
              <div class="qty-wrap">
                <button class="icon-btn" @click="$emit('change-qty', code, -1)">−</button>
                <span class="qty-num">{{ qty }}</span>
                <button class="icon-btn" @click="$emit('change-qty', code, +1)">＋</button>
              </div>
              <button class="icon-btn" @click="$emit('remove-item', code)" aria-label="Delete">✖</button>
            </div>
          </td>
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
defineProps<{
  entries: [string, number][]
}>()

defineEmits<{
  'change-qty': [code: string, delta: number]
  'remove-item': [code: string]
  'export': [type: 'csv' | 'xlsx' | 'pdf']
  'clear': []
}>()
</script>

<style scoped>
.table{ width:100%; border-collapse:collapse; table-layout:fixed; }
.table th,.table td{ padding:8px 10px; vertical-align:middle; }
.table col.col-barcode{ width:auto; }
.table col.col-qty{ width:var(--qtyCol); }

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
td.qty-cell{ padding-right:6px; }
.qty-pack{ display:flex; justify-content:flex-end; align-items:center; gap:10px; }
.qty-wrap{ display:inline-flex; align-items:center; gap:6px; }
.qty-num{ min-width:26px; text-align:center; }

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