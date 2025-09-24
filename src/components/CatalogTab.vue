<!-- src/components/CatalogTab.vue -->
<template>
  <div class="panel">
    <h3 style="margin-top:2px">Import Catalog</h3>
    
    <!-- Feature gate message for restricted users -->
    <div v-if="!hasImportFeature" class="feature-gate-message">
      <span class="lock-icon">🔒</span>
      <div>
        <strong>Catalog Import requires Plus subscription or higher</strong>
        <p style="margin: 4px 0 0 0; font-size: 0.875rem; color: var(--text-dim)">
          Upgrade to Plus to import CSV/Excel catalogs for product verification and order building.
        </p>
      </div>
    </div>
    
    <!-- File import section - visible but disabled for restricted users -->
    <div class="row" :class="{ disabled: !hasImportFeature }">
      <input 
        class="input" 
        type="file" 
        accept=".csv,.xls,.xlsx" 
        @change="$emit('file-change', $event)"
        :disabled="!hasImportFeature"
      />
      <input 
        class="input" 
        :value="searchBarcode" 
        @input="$emit('update:searchBarcode', $event.target.value)" 
        placeholder="Search barcode..." 
        :disabled="!hasImportFeature"
      />
      <input 
        class="input" 
        :value="search" 
        @input="$emit('update:search', $event.target.value)" 
        placeholder="Search description or barcode..." 
        :disabled="!hasImportFeature"
      />
      <div class="kbd">{{ catalogSize }} items</div>
      <button 
        class="btn warn" 
        style="margin-left:auto" 
        @click="$emit('clear-catalog')"
        :disabled="!hasImportFeature || catalogSize === 0"
      >
        Clear Catalog
      </button>
    </div>

    <div v-if="columns.length && hasImportFeature" class="row" style="margin-top:10px">
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

    <div class="mini" v-if="importStats.total && hasImportFeature">
      <span class="kbd">Rows: {{ importStats.total }}</span>
      <span class="kbd">Inserted: {{ importStats.inserted }}</span>
      <span class="kbd">Blank barcodes: {{ importStats.blank }}</span>
      <span class="kbd">Duplicates collapsed: {{ importStats.duplicates }}</span>
    </div>

    <!-- Show empty state for restricted users -->
    <div v-if="!hasImportFeature" class="empty-state">
      <p style="text-align: center; color: var(--text-dim); padding: 40px 20px;">
        Import your product catalog to enable barcode verification and automated product descriptions.
        <br><br>
        <a href="https://scansnap.io/pricing" target="_blank" style="color: var(--brand)">
          View subscription plans →
        </a>
      </p>
    </div>
    
    <!-- Catalog table - only shown if user has feature -->
    <table v-else class="table catalog">
      <colgroup><col class="col-barcode" /><col /></colgroup>
      <thead><tr><th class="barcode">Barcode</th><th class="desc">Description</th></tr></thead>
      <tbody>
        <tr v-for="row in filteredCatalog" :key="row.barcode">
          <td class="barcode"><div class="barcode-text">{{ row.barcode }}</div></td>
          <td class="desc"><div class="cell">{{ row.description }}</div></td>
        </tr>
        <tr v-if="filteredCatalog.length === 0 && catalogSize === 0">
          <td colspan="2" style="text-align: center; color: var(--text-dim); padding: 20px;">
            No catalog loaded. Import a CSV or Excel file to get started.
          </td>
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
  hasImportFeature?: boolean
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
.row.disabled{opacity:0.5}
.row.disabled input{cursor:not-allowed}
.mini{display:flex;align-items:center;gap:8px;margin:8px 0}
.kbd{border:1px solid var(--muted);border-radius:6px;padding:4px 6px;background:var(--panel2);color:var(--text)}
.input{
  border:1px solid var(--muted);background:var(--panel2);
  border-radius:10px;padding:10px;color:var(--text);max-width:100%;
}
.input:disabled{
  opacity:0.6;
  cursor:not-allowed;
}
.btn{
  border:1px solid var(--muted);background:var(--brand);color:#fff;
  padding:10px 14px;border-radius:12px;cursor:pointer
}
.btn.warn{background:var(--bad)}
.btn:disabled{
  opacity:0.5;
  cursor:not-allowed;
}

.feature-gate-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--panel2);
  border: 1px solid var(--brand);
  border-radius: 10px;
  margin-bottom: 12px;
}

.lock-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.empty-state {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--muted);
  border-radius: 10px;
  margin-top: 20px;
}

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