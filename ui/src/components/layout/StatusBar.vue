<template>
  <div class="status-bar">
    <div class="left">
      <span v-if="configStore.currentFilePath" :title="configStore.currentFilePath">
        {{ shortenPath(configStore.currentFilePath, 50) }}
      </span>
      <span v-else>无文件</span>
      
      <span v-if="configStore.isDirty" class="dirty-indicator">● 未保存</span>
    </div>
    
    <div class="right">
      <span v-if="configStore.parseError" class="error">JSON 解析错误</span>
      <span v-else-if="configStore.validationErrors.length" class="warning">
        {{ configStore.validationErrors.length }} 个警告
      </span>
      <span v-else class="success">校验通过</span>
      
      <span class="divider">|</span>
      <span>UTF-8</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '../../stores/config';
import { shortenPath } from '../../utils/path';

const configStore = useConfigStore();
</script>

<style scoped>
.status-bar {
  height: 24px;
  background-color: var(--n-color-modal);
  border-top: 1px solid var(--n-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
  color: var(--n-text-color-3);
  user-select: none;
  flex-shrink: 0;
}
.left, .right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dirty-indicator {
  color: var(--n-warning-color);
}
.error { color: var(--n-error-color); }
.warning { color: var(--n-warning-color); }
.success { color: var(--n-success-color); }
.divider { color: var(--n-divider-color); }
</style>
