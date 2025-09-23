<!-- src/components/ManualBarcodeEntry.vue -->
<template>
  <div class="manual-entry">
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
        placeholder="Manual barcode entry..." 
        @keyup.enter="process"
        class="barcode-input"
      />
      
      <input 
        type="number" 
        v-model.number="qty" 
        min="1" 
        class="qty-input"
      />
      
      <button @click="process" :disabled="!barcode">Add</button>
    </div>
    
    <div v-if="feedback" :class="['feedback', feedback.type]">
      {{ feedback.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 
  validateCheckDigit,
  stripCheckDigit,
  applyTrims,
  DEFAULT_TRIMS,
  type Format
} from '@/utils/barcode';

const emit = defineEmits<{
  'barcode-scanned': [barcode: string, qty: number];
}>();

const barcode = ref('');
const qty = ref(1);
const format = ref<Format | ''>('');
const feedback = ref<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

function detectFormat(code: string): Format {
  const clean = code.trim();
  if (/^\d+$/.test(clean)) {
    if (clean.length === 13) return 'ean_13';
    if (clean.length === 12) return 'upc_a';
    if (clean.length === 8) return 'ean_8';
  }
  return 'code_128'; // default
}

function process() {
  if (!barcode.value.trim()) return;
  
  const fmt = format.value || detectFormat(barcode.value);
  let processed = barcode.value.trim();
  
  // Apply trimming
  processed = applyTrims(processed, fmt as Format, DEFAULT_TRIMS);
  
  // Validate check digit for EAN/UPC
  if (fmt === 'ean_13' || fmt === 'upc_a' || fmt === 'ean_8') {
    const isValid = validateCheckDigit(processed, fmt as Format);
    if (!isValid) {
      feedback.value = { 
        message: `Warning: Invalid check digit for ${fmt.toUpperCase()}`, 
        type: 'warning' 
      };
    } else {
      feedback.value = { 
        message: `✓ Valid ${fmt.toUpperCase()}`, 
        type: 'success' 
      };
    }
  } else {
    feedback.value = { message: '✓ Added', type: 'success' };
  }
  
  // Emit the processed barcode
  emit('barcode-scanned', processed, Math.max(1, qty.value || 1));
  
  // Clear input
  barcode.value = '';
  qty.value = 1;
  
  // Clear feedback after 2 seconds
  setTimeout(() => { feedback.value = null; }, 2000);
}
</script>

<style scoped>
.manual-entry {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 12px;
  margin-bottom: 12px;
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
}

.barcode-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: monospace;
}

.qty-input {
  width: 60px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

button {
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: #111827;
  color: white;
  cursor: pointer;
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
}

.feedback.success {
  background: #e8f7ee;
  color: #166534;
}

.feedback.warning {
  background: #fef9c3;
  color: #92400e;
}

.feedback.error {
  background: #fee2e2;
  color: #991b1b;
}
</style>