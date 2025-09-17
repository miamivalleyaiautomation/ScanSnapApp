export type Status = 'OK' | 'PARTIAL' | 'BAD';

export interface VerifyRow {
  barcode: string;
  required: number;   // from Verify Catalog
  scanned: number;    // accumulated from scans
  status: Status;
  inCatalog: boolean; // false => unknown barcode
}

export interface VerifyCatalogRow {
  barcode: string;
  qty: number;
}

export interface OrderRow {
  barcode: string;
  qty?: number; // optional; kept for future "Order" logic
}