<template>
  <div class="status-bar">
    <div class="left">
      <span v-if="configStore.currentFilePath" :title="configStore.currentFilePath" class="file-path">
        {{ shortenPath(configStore.currentFilePath, 50) }}
      </span>
      <span v-else class="file-path">未打开文件</span>
      
      <span v-if="configStore.isDirty" class="dirty-indicator">
        <n-icon size="10"><svg viewBox="0 0 512 512"><circle cx="256" cy="256" r="256" fill="currentColor"/></svg></n-icon>
        未保存
      </span>
    </div>
    
    <div class="right">
      <!-- Validation Status -->
      <div 
        class="status-item" 
        :class="{ error: hasErrors, success: !hasErrors }"
        @click="scrollToErrors"
        style="cursor: pointer"
      >
        <span v-if="configStore.parseError">JSON 语法错误</span>
        <span v-else-if="configStore.validationErrors.length">
          {{ configStore.validationErrors.length }} 个业务错误
        </span>
        <span v-else>校验通过</span>
      </div>

      <span class="divider">|</span>
      
      <!-- Run Status -->
      <div 
        class="status-item" 
        :class="{ running: runStore.isRunning }"
      >
        <span v-if="runStore.isRunning">运行中...</span>
        <span v-else>就绪</span>
      </div>

      <span class="divider">|</span>

      <!-- Encoding -->
      <span>UTF-8</span>
      
      <span class="divider">|</span>

      <!-- Cursor -->
      <span class="cursor-pos">
        行 {{ configStore.cursorPos.line }}, 列 {{ configStore.cursorPos.col }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useRunStore } from '../../stores/run';
import { shortenPath } from '../../utils/path';

const configStore = useConfigStore();
const runStore = useRunStore();

const hasErrors = computed(() => !!configStore.parseError || configStore.validationErrors.length > 0);

function scrollToErrors() {
  if (hasErrors.value) {
    // Logic to ensure errors are visible
    // They are in the Right Panel -> Tree Tab -> Bottom
    // We can't easily scroll them from here without event bus
    // But at least we can make sure the Tree is visible?
    // In current layout, right panel is always there.
  }
}
</script>

<style scoped>
.status-bar {
  height: 28px;
  background-color: var(--n-color-modal);
  border-top: 1px solid var(--n-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
  color: var(--n-text-color-3);
  user-select: none;
  flex-shrink: 0;
}
.left, .right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.status-item:hover {
  color: var(--n-text-color-2);
}
.dirty-indicator {
  color: var(--n-warning-color);
  display: flex;
  align-items: center;
  gap: 4px;
}
.error { color: var(--n-error-color); }
.success { color: var(--n-success-color); }
.running { color: var(--n-primary-color); font-weight: bold; }
.divider { color: var(--n-divider-color); opacity: 0.5; }
.cursor-pos { min-width: 80px; text-align: right; }
</style>
