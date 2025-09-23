<!-- src/components/AppHeader.vue -->
<template>
  <div class="header">
    <div class="header-content">
      <div class="logo">
        <img v-if="isDark" class="logo-icon" src="/favicon_1024_dark.png" alt="icon" />
        <img v-else class="logo-icon" src="/favicon_1024_light.png" alt="icon" />
      </div>
      <div class="logo-center">
        <img class="logo-text" :src="isDark ? '/text_1024_dark.png' : '/text_1024_light.png'" alt="ScanSnap" />
      </div>
      <button class="theme-toggle" @click="$emit('toggle-theme')">{{ isDark ? 'Light' : 'Dark' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDark: boolean
}>()

defineEmits<{
  'toggle-theme': []
}>()
</script>

<style scoped>
.header{ height: var(--headerH); display:flex; align-items:center; border-bottom: 1px solid var(--edge); }
.header-content{ position:relative; display:flex; align-items:center; justify-content:space-between; width:100%; }
.logo{ display:flex; align-items:center; gap:.5rem; }
.logo-icon{ height: var(--logoH); max-height: calc(var(--headerH) - 24px); object-fit: contain; }
.logo-center{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none; }
.logo-text{ height: calc(var(--logoH) * 1.3); max-height: calc(var(--headerH) - 20px); object-fit: contain; }
</style>