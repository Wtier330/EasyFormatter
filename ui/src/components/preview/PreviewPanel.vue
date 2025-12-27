<template>
  <div class="preview-panel">
    <!-- Show RunLog if active, otherwise show Tree -->
    <div class="content-wrapper">
      <div v-show="!appStore.showRunLog" class="pane-content">
        <JsonTree class="tree-area" ref="jsonTreeRef" />
        <ErrorsPanel v-if="hasErrors" />
      </div>
      
      <div v-show="appStore.showRunLog" class="pane-content">
        <RunLogPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import JsonTree from './JsonTree.vue';
import ErrorsPanel from './ErrorsPanel.vue';
import RunLogPanel from './RunLogPanel.vue';
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
</style>
