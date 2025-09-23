<!-- src/components/TabNavigation.vue -->
<template>
  <div class="tabs">
    <button class="tab" :class="{active:modelValue==='scan'}" @click="$emit('update:modelValue', 'scan')">SCAN</button>
    <button class="tab" :class="{active:modelValue==='catalog'}" @click="$emit('update:modelValue', 'catalog')">CATALOG</button>
    <button class="tab" :class="{active:modelValue==='setup'}" @click="$emit('update:modelValue', 'setup')">SETUP</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'scan' | 'catalog' | 'setup'
}>()

defineEmits<{
  'update:modelValue': [value: 'scan' | 'catalog' | 'setup']
}>()
</script>

<style scoped>
.tabs{display:flex;gap:10px;margin:10px 0 14px}
.tab{
  flex:1 1 0;padding:12px 16px;border-radius:12px;
  border:1px solid var(--pill-border);
  background:var(--panel2);cursor:pointer;text-align:center;color:var(--text)
}
.tab.active{outline:2px solid var(--brand);background:transparent}
:root.light .tab.active{ border-color: var(--brand); }
</style>