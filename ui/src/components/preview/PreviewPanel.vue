<template>
  <div class="preview-panel" :class="{ 'compatible-mode': configStore.isCompatibleMode }">
    
    <!-- Compatible Mode Banner -->
    <div v-if="configStore.isCompatibleMode" class="compatible-banner">
      <div class="banner-content">
        <div class="banner-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="banner-text">
          <div class="banner-title">非标准 JSON (提取模式)</div>
          <div class="banner-desc">{{ configStore.compatibleInfo.message }}</div>
        </div>
      </div>
      <button class="extract-btn" @click="configStore.extractWrapper">
        提取内部 JSON
      </button>
    </div>

    <!-- Show RunLog if active, otherwise show Tree -->
    <div class="content-wrapper">
      <div class="pane-content">
        <JsonTree class="tree-area" ref="jsonTreeRef" :style="{ '--code-font-size': appStore.fontSize + 'px' }" />
        <ErrorsPanel v-if="hasErrors" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import JsonTree from './JsonTree.vue';
import ErrorsPanel from './ErrorsPanel.vue';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';

const configStore = useConfigStore();
const appStore = useAppStore();

const hasErrors = computed(() => !!configStore.parseError || configStore.validationErrors.length > 0);
const jsonTreeRef = ref<any>(null);
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pane-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.tree-area {
  flex: 1;
  overflow: hidden;
}

.compatible-mode {
  border: 2px solid #e6a23c;
}

.compatible-banner {
  background-color: #fdf6ec;
  color: #e6a23c;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #faecd8;
  flex-shrink: 0;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-icon {
  display: flex;
  align-items: center;
}

.banner-text {
  display: flex;
  flex-direction: column;
}

.banner-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.2;
}

.banner-desc {
  font-size: 12px;
  opacity: 0.9;
}

.extract-btn {
  background-color: #e6a23c;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.extract-btn:hover {
  background-color: #cf9236;
}
</style>
