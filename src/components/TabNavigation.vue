<template>
  <div class="tabs">
    <button class="tab" :class="{active:modelValue==='scan'}" @click="$emit('update:modelValue', 'scan')">SCAN</button>
    <button 
      class="tab" 
      :class="{active:modelValue==='catalog', disabled:!canUseCatalog}" 
      @click="handleCatalogClick"
      :title="!canUseCatalog ? 'Requires Plus subscription' : ''"
    >
      CATALOG
      <span v-if="!canUseCatalog" class="lock-icon">🔒</span>
    </button>
    <button class="tab" :class="{active:modelValue==='setup'}" @click="$emit('update:modelValue', 'setup')">SETUP</button>
  </div>
</template>

<script setup lang="ts">
import authService from '@/services/auth.service'

defineProps<{
  modelValue: 'scan' | 'catalog' | 'setup'
  canUseCatalog?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'scan' | 'catalog' | 'setup']
}>()

function handleCatalogClick() {
  if (!authService.canUseFeature('catalog_import')) {
    if (confirm('Catalog import requires Plus subscription. Would you like to upgrade?')) {
      authService.redirectToUpgrade()
    }
    return
  }
  emit('update:modelValue', 'catalog')
}
</script>

<style scoped>
/* ... existing styles ... */

.tab.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lock-icon {
  margin-left: 4px;
  font-size: 0.875rem;
}
</style>