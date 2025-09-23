// src/stores/verifyStore.ts
import { reactive, computed } from 'vue';
import type { VerifyCatalogRow, OrderRow, VerifyRow, Status } from '@/types/catalog';
import { exportVerifyCSV, exportVerifyPDF } from '@/utils/exporters';

type State = {
  verifyCatalog: Map<string, number>;   // barcode -> required qty
  scanned: Map<string, number>;         // barcode -> scanned qty
  unknownScans: Map<string, number>;    // not in catalog
  orderCatalog: Map<string, number>;    // optional future use
};

const state = reactive<State>({
  verifyCatalog: new Map(),
  scanned: new Map(),
  unknownScans: new Map(),
  orderCatalog: new Map(),
});

function computeStatus(required: number, scanned: number, inCatalog: boolean): Status {
  if (!inCatalog) return 'BAD';
  if (scanned === required) return 'OK';
  if (scanned > required) return 'BAD';
  return 'PARTIAL';
}

export function useVerifyStore() {
  const rows = computed<VerifyRow[]>(() => {
    const keys = new Set<string>([
      ...state.verifyCatalog.keys(),
      ...state.scanned.keys(),
      ...state.unknownScans.keys(),
    ]);

    const list: VerifyRow[] = [];
    keys.forEach((barcode) => {
      const inCatalog = state.verifyCatalog.has(barcode);
      const required = inCatalog ? (state.verifyCatalog.get(barcode) ?? 0) : 0;
      const scannedKnown = state.scanned.get(barcode) ?? 0;
      const scannedUnknown = state.unknownScans.get(barcode) ?? 0;
      const scanned = inCatalog ? scannedKnown : scannedUnknown;
      const status = computeStatus(required, scanned, inCatalog);
      list.push({ barcode, required, scanned, status, inCatalog });
    });

    // Stable sort: BAD first, then PARTIAL, then OK; then by barcode
    const order: Record<Status, number> = { BAD: 0, PARTIAL: 1, OK: 2 };
    return list.sort((a, b) => order[a.status] - order[b.status] || a.barcode.localeCompare(b.barcode));
  });

  const totals = computed(() => {
    let ok = 0, partial = 0, bad = 0;
    rows.value.forEach(r => {
      if (r.status === 'OK') ok++;
      else if (r.status === 'PARTIAL') partial++;
      else bad++;
    });
    return { ok, partial, bad, total: rows.value.length };
  });

  function resetScans() {
    state.scanned.clear();
    state.unknownScans.clear();
  }

  function resetAll() {
    state.verifyCatalog.clear();
    resetScans();
    state.orderCatalog.clear();
  }

  function loadVerifyCatalog(items: VerifyCatalogRow[]) {
    state.verifyCatalog.clear();
    for (const { barcode, qty } of items) {
      const k = String(barcode).trim();
      if (!k) continue;
      const q = Math.max(0, Math.floor(qty ?? 0));
      state.verifyCatalog.set(k, q);
    }
    // prune scanned entries no longer in catalog
    for (const key of Array.from(state.scanned.keys())) {
      if (!state.verifyCatalog.has(key)) {
        state.unknownScans.set(key, (state.unknownScans.get(key) ?? 0) + (state.scanned.get(key) ?? 0));
        state.scanned.delete(key);
      }
    }
  }

  function loadOrderCatalog(items: OrderRow[]) {
    state.orderCatalog.clear();
    for (const { barcode, qty } of items) {
      const k = String(barcode).trim();
      if (!k) continue;
      const q = Math.max(0, Math.floor(qty ?? 0));
      state.orderCatalog.set(k, q);
    }
  }

  function recordScan(barcode: string, qty = 1): Status {
    const k = String(barcode).trim();
    if (!k) return 'BAD';
    if (state.verifyCatalog.has(k)) {
      state.scanned.set(k, (state.scanned.get(k) ?? 0) + qty);
      const required = state.verifyCatalog.get(k) ?? 0;
      const scanned = state.scanned.get(k) ?? 0;
      return computeStatus(required, scanned, true);
    } else {
      state.unknownScans.set(k, (state.unknownScans.get(k) ?? 0) + qty);
      return 'BAD';
    }
  }

  function exportVerifyToCSV(filename = 'verify.csv') {
    exportVerifyCSV(filename, rows.value);
  }

  async function exportVerifyToPDF(filename = 'verify.pdf') {
    await exportVerifyPDF(filename, rows.value);
  }

  return {
    state,
    rows,
    totals,
    loadVerifyCatalog,
    loadOrderCatalog,
    recordScan,
    resetScans,
    resetAll,
    exportVerifyToCSV,
    exportVerifyToPDF,
  };
}