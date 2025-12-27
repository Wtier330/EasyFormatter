<template>
  <div class="errors-panel" v-if="hasErrors">
    <div class="header">
      <n-icon color="red"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 32c142 0 273 131 273 273c0 142-131 273-273 273c-142 0-273-131-273-273C-17 163 114 32 256 32z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 367.91a20 20 0 1120-20a20 20 0 01-20 20z" fill="currentColor"/></svg></n-icon>
      <span>问题列表 ({{ errorCount }})</span>
    </div>
    <n-list hoverable clickable size="small">
      <!-- Parse Error -->
      <n-list-item v-if="configStore.parseError" class="error-item">
        <div class="msg">{{ configStore.parseError }}</div>
      </n-list-item>
      
      <!-- Validation Errors -->
      <n-list-item 
        v-for="(err, idx) in configStore.validationErrors" 
        :key="idx" 
        class="error-item"
        @click="locate(err.path)"
      >
        <div class="path">{{ err.path }}</div>
        <div class="msg">{{ err.message }}</div>
      </n-list-item>
    </n-list>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NList, NListItem, NIcon } from 'naive-ui';
import { useConfigStore } from '../../stores/config';

const configStore = useConfigStore();

const hasErrors = computed(() => !!configStore.parseError || configStore.validationErrors.length > 0);
const errorCount = computed(() => (configStore.parseError ? 1 : 0) + configStore.validationErrors.length);

function locate(path: string) {
  if (path) {
    // path is like "root.log_configs[0].pattern"
    // Editor locate uses simple key search.
    // Tree locate uses full path expansion.
    // Let's support Editor locate first by extracting the last key.
    const parts = path.split(/[.\[\]]/).filter(p => p && p !== 'root');
    const key = parts[parts.length - 1];
    
    // Request locate in Editor
    if (key) {
       configStore.locateRequest = key;
    }
    
    // TODO: Also expand Tree to this path? 
    // Tree needs to watch locateRequest too?
    // Or we add `expandToPath` in store?
  }
}
</script>

<style scoped>
.errors-panel {
  height: 30%; /* Fixed height at bottom of right panel */
  border-top: 1px solid var(--n-border-color);
  display: flex;
  flex-direction: column;
  background-color: #fff0f0; /* Light red bg */
}
.header {
  padding: 5px 10px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--n-error-color);
  background-color: #fee;
}
.error-item {
  color: var(--n-error-color);
}
.path {
  font-family: monospace;
  font-size: 11px;
  opacity: 0.8;
}
.msg {
  font-size: 12px;
}
</style>
