<template>
  <div class="preview-panel">
    <n-tabs type="segment" animated class="preview-tabs">
      <n-tab-pane name="tree" tab="结构预览">
        <div class="pane-content">
          <JsonTree class="tree-area" />
          <ErrorsPanel v-if="hasErrors" />
        </div>
      </n-tab-pane>
      <n-tab-pane name="logs" tab="运行日志">
        <RunLogPanel />
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NTabs, NTabPane } from 'naive-ui';
import JsonTree from './JsonTree.vue';
import ErrorsPanel from './ErrorsPanel.vue';
import RunLogPanel from './RunLogPanel.vue';
import { useConfigStore } from '../../stores/config';

const configStore = useConfigStore();
const hasErrors = computed(() => !!configStore.parseError || configStore.validationErrors.length > 0);
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.preview-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}
:deep(.n-tabs-pane-wrapper) {
  flex: 1;
  overflow: hidden;
}
:deep(.n-tab-pane) {
  height: 100%;
  padding: 0 !important;
}
.pane-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tree-area {
  flex: 1;
  overflow: hidden;
}
</style>
