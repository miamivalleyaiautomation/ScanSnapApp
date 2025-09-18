import { defineStore } from 'pinia'

const KEY_MANUAL_ENTRY = 'ss_manual_entry_enabled'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Default ON so the field shows under TAP TO SCAN
    manualEntryEnabled:
      localStorage.getItem(KEY_MANUAL_ENTRY) === null
        ? true
        : localStorage.getItem(KEY_MANUAL_ENTRY) === 'true',
  }),
  actions: {
    setManualEntryEnabled(val: boolean) {
      this.manualEntryEnabled = val
      localStorage.setItem(KEY_MANUAL_ENTRY, String(val))
    },
  },
})
