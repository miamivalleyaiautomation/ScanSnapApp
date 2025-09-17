<template>
  <span class="status" :class="cls">
    <svg v-if="status === 'OK'" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 11.5L3 8l1.2-1.2L6.5 9.2l5.3-5.3L13 5l-6.5 6.5z"/></svg>
    <svg v-else-if="status === 'BAD'" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round"/></svg>
    <svg v-else viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4"/></svg>
    <span class="label">{{ status }}</span>
  </span>
</template>

<script setup lang="ts">
import type { Status } from '@/types/catalog';
defineProps<{ status: Status }>();

const clsMap: Record<Status, string> = {
  OK: 'ok',
  PARTIAL: 'partial',
  BAD: 'bad',
};
const cls = (props: { status: Status }) => clsMap[props.status];
</script>

<style scoped>
.status {
  display: inline-flex; align-items: center; gap: .4rem;
  font-weight: 600; font-size: .85rem;
  padding: .15rem .5rem; border-radius: .75rem; line-height: 1;
  background: var(--bg, #f1f5f9); color: var(--fg, #0f172a);
}
.status svg { width: 14px; height: 14px; }
.status.ok { --bg:#e8f7ee; --fg:#166534; }
.status.ok svg { color:#16a34a; fill:currentColor; }
.status.bad { --bg:#fee2e2; --fg:#991b1b; }
.status.bad svg { color:#ef4444; }
.status.partial { --bg:#fef9c3; --fg:#92400e; }
.status.partial svg { color:#f59e0b; fill:currentColor; }
.label { letter-spacing: .02em; }
</style>