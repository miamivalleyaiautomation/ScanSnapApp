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
      
      <!-- User info and subscription badge -->
      <div class="header-right">
        <div v-if="userData" class="user-info">
          <span class="subscription-badge" :class="subscriptionStatus">
            {{ subscriptionStatus.toUpperCase() }}
          </span>
          <span class="user-name">{{ userData.first_name || userData.email }}</span>
        </div>
        <button class="theme-toggle" @click="$emit('toggle-theme')">{{ isDark ? 'Light' : 'Dark' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isDark: boolean
  userData?: any
  subscriptionStatus?: string
}>()

defineEmits<{
  'toggle-theme': []
}>()
</script>

<style scoped>
/* ... existing styles ... */

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
}

.subscription-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.subscription-badge.basic {
  background: #6b7280;
  color: white;
}

.subscription-badge.plus {
  background: #3b82f6;
  color: white;
}

.subscription-badge.pro {
  background: #8b5cf6;
  color: white;
}

.subscription-badge.pro_dpms {
  background: #ec4899;
  color: white;
}

.user-name {
  color: var(--text-dim);
}
</style>