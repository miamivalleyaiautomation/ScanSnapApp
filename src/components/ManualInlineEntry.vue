<!-- src/components/ManualInlineEntry.vue -->
<template>
  <form class="ss-inline" @submit.prevent="submit">
    <label for="manual-inline-code" class="ss-label">Manual entry</label>
    <div class="ss-row">
      <input
        id="manual-inline-code"
        ref="codeRef"
        v-model.trim="code"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="Type or paste code, then Enter"
        @keydown.enter.prevent="submit"
      />
      <button type="submit" class="ss-btn">Add</button>
    </div>
    <p v-if="error" class="ss-error">{{ error }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'submit', payload: { code: string; source: 'manual-inline' }): void
}>()

const codeRef = ref<HTMLInputElement | null>(null)
const code = ref('')
const error = ref('')

function submit() {
  const value = (code.value ?? '').trim()
  if (!value) {
    error.value = 'Please enter a code.'
    codeRef.value?.focus()
    return
  }
  error.value = ''
  emit('submit', { code: value, source: 'manual-inline' })
  code.value = ''
  requestAnimationFrame(() => codeRef.value?.focus())
}
</script>

<style scoped>
.ss-inline { display:flex; flex-direction:column; gap:.4rem; margin-top:.75rem }
.ss-label { font-size:.9rem; opacity:.8 }
.ss-row { display:flex; gap:.5rem }
.ss-row input {
  flex:1 1 auto; padding:.65rem .8rem; border-radius:.7rem;
  border:1px solid var(--line,#161b22);
  background:var(--bg,#0b0d10); color:var(--fg,#e8eaed);
}
.ss-btn {
  padding:.55rem .9rem; border-radius:.7rem; border:none; cursor:pointer;
  background:var(--brand-grad, linear-gradient(135deg, var(--brand0,#00d1ff), var(--brand1,#4a90e2)));
  color:#fff; font-weight:600; box-shadow:var(--shadow,0 4px 14px rgba(0,0,0,.12));
}
.ss-error { color:#ff6b6b; font-size:.85rem; margin:0 }
</style>
