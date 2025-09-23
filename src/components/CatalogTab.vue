<!-- src/components/CatalogTab.vue -->
<template>
  <div class="panel">
    <h3 style="margin-top:2px">Import Catalog</h3>
    <div class="row">
      <input class="input" type="file" accept=".csv,.xls,.xlsx" @change="$emit('file-change', $event)" />
      <input class="input" :value="searchBarcode" @input="$emit('update:searchBarcode', $event.target.value)" placeholder="Search barcode..." />
      <input class="input" :value="search" @input="$emit('update:search', $event.target.value)" placeholder="Search description or barcode..." />
      <div class="kbd">{{ catalogSize }} items</div>
      <button class="btn warn" style="margin-left:auto" @click="$emit('clear-catalog')">Clear Catalog</button>
    </div>

    <div v-if="columns.length" class="row" style="margin-top:10px">
      <div>Barcode column:</div>
      <select class="input" :value="barcodeCol" @change="$emit('update:barcodeCol', $event.target.value)">
        <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
      </select>
      <div>Description column:</div>
      <select class="input" :value="descCol" @change="$emit('update:descCol', $event.target.value)">
        <option value="">(none)</option>
        <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="mini" v-if="importStats.total">
      <span class="kbd">Rows: {{ importStats.total }}</span>
      <span class="kbd">Inserted: {{ importStats.inserted }}</span>
      <span class="kbd">Blank barcodes: {{ importStats.blank }}</span>
      <span class="kbd">Duplicates collapsed: {{ importStats.duplicates }}</span>
    </div>

    <table class="table catalog">
      <colgroup><col class="col-barcode" /><col /></colgroup>
      <thead><tr><th class="barcode">Barcode</th><th class="desc">Description</th></tr></thead>
      <tbody>
        <tr v-for="row in filteredCatalog" :key="row.barcode">
          <td class="barcode"><div class="barcode-text">{{ row.barcode }}</div></td>
          <td class="desc"><div class="cell">{{ row.description }}</div></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  catalogSize: number
  columns: string[]
  barcodeCol: string
  descCol: string
  search: string
  searchBarcode: string
  importStats: { total: number; inserted: number; blank: number; duplicates: number }
  filteredCatalog: {barcode: string; description: string}[]
}>()

defineEmits<{
  'file-change': [event: Event]
  'update:barcodeCol': [value: string]
  'update:descCol': [value: string]
  'update:search': [value: string]
  'update:searchBarcode': [value: string]
  'clear-catalog': []
}>()
</script>

<style scoped>
.panel{
  background:var(--panel);border:1px solid var(--muted);border-radius:var(--radius);
  padding:14px;box-shadow:var(--shadow);overflow-x:hidden
}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.row > *{min-width:0}
.mini{display:flex;align-items:center;gap:8px;margin:8px 0}
.kbd{border:1px solid var(--muted);border-radius:6px;padding:4px 6px;background:var(--panel2);color:var(--text)}
.input{
  border:1px solid var(--muted);background:var(--panel2);
  border-radius:10px;padding:10px;color:var(--text);max-width:100%;
}
.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.warn{background:var(--bad)}

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

.table.catalog colgroup col:first-child{ width:42% }
.table.catalog colgroup col:last-child{  width:58% }
.table.catalog .cell{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.barcode-text{
  display:inline-block;
  min-width:20ch;
  max-width:100%;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  font-variant-numeric: tabular-nums;
}

@media (max-width:560px){
  .table.catalog colgroup col:first-child{ width:48% !important }
  .table.catalog colgroup col:last-child{  width:52% !important }
}
</style>