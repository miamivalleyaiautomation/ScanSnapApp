<!-- src/components/ManualBarcodeEntry.vue -->
<template>
  <div class="manual-entry">
    <label class="entry-label">Manual Barcode Entry:</label>
    <div class="entry-row">
      <select v-model="format" class="format-select">
        <option value="">Auto-detect</option>
        <option value="ean_13">EAN-13</option>
        <option value="upc_a">UPC-A</option>
        <option value="ean_8">EAN-8</option>
        <option value="code_128">Code 128</option>
        <option value="qr_code">QR Code</option>
      </select>
      
      <input 
        v-model="barcode" 
        placeholder="Enter barcode..." 
        @keyup.enter="process"
        class="barcode-input"
      />
      
      <input 
        type="number" 
        v-model.number="qty" 
        min="1" 
        placeholder="Qty"
        class="qty-input"
      />
      
      <button @click="process" :disabled="!barcode">Add</button>
    </div>
    
    <div v-if="feedback" :class="['feedback', feedback.type]">
      {{ feedback.message }}
      <span v-if="lastProcessed" class="processed">
        ({{ lastProcessed.original }} → {{ lastProcessed.processed }})
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// Copy the minimal types and functions we need inline to avoid import issues
type Format = 'ean_13' | 'upc_a' | 'ean_8' | 'code_128' | 'qr_code';

const emit = defineEmits<{
  'barcode-scanned': [barcode: string, qty: number];
}>();

const barcode = ref('');
const qty = ref(1);
const format = ref<Format | ''>('');
const feedback = ref<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
const lastProcessed = ref<{ original: string; processed: string } | null>(null);

// Simple format detection
function detectFormat(code: string): Format {
  const clean = code.trim();
  if (/^\d+$/.test(clean)) {
    if (clean.length === 13) return 'ean_13';
    if (clean.length === 12) return 'upc_a';
    if (clean.length === 8) return 'ean_8';
  }
  return 'code_128';
}

// Simple check digit validation for EAN-13
function validateEAN13(code: string): boolean {
  if (code.length !== 13 || !/^\d+$/.test(code)) return false;
  const digits = code.slice(0, 12).split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(code[12]);
}

// Simple check digit validation for UPC-A
function validateUPCA(code: string): boolean {
  if (code.length !== 12 || !/^\d+$/.test(code)) return false;
  const digits = code.slice(0, 11).split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(code[11]);
}

// Simple check digit validation for EAN-8
function validateEAN8(code: string): boolean {
  if (code.length !== 8 || !/^\d+$/.test(code)) return false;
  const digits = code.slice(0, 7).split('').map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(code[7]);
}

// Simple trimming for EAN-13 (remove first and last digit)
function applyTrim(code: string, fmt: Format): string {
  if (fmt === 'ean_13' && code.length === 13) {
    return code.slice(1, -1); // Remove first and last digit
  }
  if ((fmt === 'upc_a' || fmt === 'upc_e') && code.length > 2) {
    return code.slice(1, -1); // Remove first and last digit
  }
  return code;
}

function process() {
  if (!barcode.value.trim()) return;
  
  const fmt = format.value || detectFormat(barcode.value);
  let processed = barcode.value.trim();
  
  // Validate check digit for EAN/UPC
  let isValid = true;
  if (fmt === 'ean_13') {
    isValid = validateEAN13(processed);
  } else if (fmt === 'upc_a') {
    isValid = validateUPCA(processed);
  } else if (fmt === 'ean_8') {
    isValid = validateEAN8(processed);
  }
  
  // Apply trimming
  const original = processed;
  processed = applyTrim(processed, fmt);
  
  // Store processing info
  lastProcessed.value = { original, processed };
  
  // Show feedback
  if (!isValid) {
    feedback.value = { 
      message: `⚠️ Invalid check digit for ${fmt.toUpperCase().replace('_', '-')}`, 
      type: 'warning' 
    };
  } else {
    feedback.value = { 
      message: `✓ Valid ${fmt.toUpperCase().replace('_', '-')}`, 
      type: 'success' 
    };
  }
  
  // Emit the processed barcode
  emit('barcode-scanned', processed, Math.max(1, qty.value || 1));
  
  // Clear input
  barcode.value = '';
  qty.value = 1;
  
  // Clear feedback after 3 seconds
  setTimeout(() => { 
    feedback.value = null; 
    lastProcessed.value = null;
  }, 3000);
}
</script>

<style scoped>
.manual-entry {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: #fafbfc;
}

.entry-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
  color: #374151;
}

.entry-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.format-select {
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.barcode-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: white;
}

.qty-input {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

button {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid #111827;
  background: #111827;
  color: white;
  cursor: pointer;
  font-weight: 500;
}

button:hover:not(:disabled) {
  background: #1f2937;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.feedback {
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.875rem;
  animation: slideIn 0.15s ease-out;
}

.feedback.success {
  background: #e8f7ee;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.feedback.warning {
  background: #fef9c3;
  color: #92400e;
  border: 1px solid #fde047;
}

.feedback.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.processed {
  font-size: 0.8rem;
  opacity: 0.8;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>