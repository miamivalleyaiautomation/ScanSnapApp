<template>
  <div class="setup-wrap">
    <h1 class="setup-title">Setup</h1>

    <section class="setting-row">
      <label class="switch-line">
        <input
          type="checkbox"
          :checked="settings.manualEntryEnabled"
          @change="onToggle"
        />
        <span>Show manual entry under “TAP TO SCAN”</span>
      </label>
      <p class="muted">Disable to hide the manual code input on the scan screen.</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settingsStore'
const settings = useSettingsStore()

function onToggle(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  settings.setManualEntryEnabled(checked)
}
</script>

<style scoped>
.setup-wrap { padding:1rem; display:flex; flex-direction:column; gap:1rem }
.setup-title { margin:0 0 .5rem; font-size:1.4rem; font-weight:800 }
.setting-row { padding:.75rem 0; border-bottom:1px solid var(--line,#161b22) }
.switch-line { display:flex; align-items:center; gap:.6rem; font-weight:600 }
.muted { font-size:.9rem; opacity:.7; margin:.25rem 0 0 }
</style>
