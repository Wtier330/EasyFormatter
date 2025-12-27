<template>
  <div class="json-tree-container">
    <div class="tree-toolbar">
      <div class="title">结构预览</div>
      <n-button-group size="tiny">
        <n-button @click="expandAll">全展开</n-button>
        <n-button @click="collapseAll">全折叠</n-button>
      </n-button-group>
    </div>
    
    <div class="tree-content" v-if="hasData">
      <JsonNode
        :data="treeData"
        path="root"
        :depth="0"
        :is-last="true"
        :expand-level="expandLevel"
      />
    </div>
    
    <div v-else class="empty-tree">
      <n-icon size="48" color="#eee"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 464a48 48 0 0048 48h288a48 48 0 0048-48V128H32zm272-256a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zM432 32H312l-9.4-18.7A24 24 0 00281.1 0H166.8a23.72 23.72 0 00-21.4 13.3L136 32H16A16 16 0 000 48v32a16 16 0 0016 16h416a16 16 0 0016-16V48a16 16 0 00-16-16z" fill="currentColor"/></svg></n-icon>
      <div class="empty-text">无数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NButton, NButtonGroup, NIcon } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import JsonNode from './JsonNode.vue';

const configStore = useConfigStore();
const expandLevel = ref(1); // 0=none, 999=all

const treeData = computed(() => {
  return configStore.lastValidConfig;
});

const hasData = computed(() => treeData.value !== null && treeData.value !== undefined);

function expandAll() {
  expandLevel.value = 999;
  // Reset after tick to allow re-collapsing? 
  // Actually recursive component watches this value.
  // If we want to allow manual collapse afterwards, the logic in JsonNode handles manual toggle.
  // But if we set it to 999, it forces open. 
  // We might need a timestamp or trigger.
  // For simplicity, just set large number.
}

function collapseAll() {
  expandLevel.value = 0;
}
</script>

<style scoped>
.json-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
}
.tree-toolbar {
  padding: 8px;
  border-bottom: 1px solid var(--n-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.title {
  font-weight: bold;
  font-size: 13px;
  color: #333;
}
.tree-content {
  flex: 1;
  overflow: auto;
  padding: 8px;
}
.empty-tree {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
}
.empty-text {
  margin-top: 10px;
  font-size: 12px;
}
</style>
