<!-- FILE: src/App.vue -->
<template>
  <main class="app">
    <header class="top">
      <h1>ScanSnap</h1>
      <nav class="nav">
        <button :class="{active: tab==='verify'}" @click="tab='verify'">Verify</button>
        <button :class="{active: tab==='scanner'}" @click="tab='scanner'">Scanner</button>
      </nav>
    </header>

    <section v-if="tab==='verify'">
      <VerifyTab ref="verifyRef" />
    </section>

    <section v-else class="scanner">
      <p>This is your existing scanner area. When a code is read, call:</p>
      <code>verifyRef?.handleScan(decodedValue, qty?)</code>
      <!-- Example manual hook: -->
      <div class="sim">
        <input v-model="manual" placeholder="barcode" @keyup.enter="pushManual" />
        <input type="number" v-model.number="manualQty" min="1" style="width:80px" />
        <button @click="pushManual">Send to Verify</button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import VerifyTab from './components/VerifyTab.vue';

const tab = ref<'verify'|'scanner'>('verify');
const verifyRef = ref<InstanceType<typeof VerifyTab> | null>(null);
const manual = ref(''); const manualQty = ref(1);
function pushManual() {
  if (!manual.value) return;
  verifyRef.value?.handleScan(manual.value, Math.max(1, manualQty.value || 1));
  manual.value=''; manualQty.value=1;
}
</script>

<style scoped>
.app { max-width: 1100px; margin: 0 auto; padding: 16px; }
.top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.nav { display:flex; gap:10px; }
.nav button { padding:6px 10px; border:1px solid #e5e7eb; border-radius:10px; background:#f8fafc; }
.nav button.active { background:#111827; color:#fff; border-color:#111827; }
.sim { display:flex; gap:8px; margin-top:10px; }
</style>
