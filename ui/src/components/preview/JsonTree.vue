<template>
  <div class="json-tree-container">
    <div class="tree-toolbar">
      <n-button-group size="tiny">
        <n-button @click="expandAll">全展开</n-button>
        <n-button @click="collapseAll">全折叠</n-button>
      </n-button-group>
    </div>
    <div class="tree-content">
      <n-tree
        block-line
        expand-on-click
        :data="treeData"
        :default-expand-all="false"
        key-field="key"
        label-field="label"
        children-field="children"
        @update:expanded-keys="onExpand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NTree, NButton, NButtonGroup } from 'naive-ui';
import { useConfigStore } from '../../stores/config';

const configStore = useConfigStore();

// Transform JSON to TreeOption
function jsonToTree(data: any, path: string = 'root'): any[] {
  if (data === null) return [{ key: path, label: 'null', isLeaf: true }];
  if (typeof data !== 'object') return [{ key: path, label: String(data), isLeaf: true }];
  
  return Object.keys(data).map(key => {
    const value = data[key];
    const currentPath = `${path}.${key}`;
    const isObject = value !== null && typeof value === 'object';
    const label = isObject 
      ? `${key} ${Array.isArray(value) ? `[${value.length}]` : '{}'}`
      : `${key}: ${String(value)}`;
      
    return {
      key: currentPath,
      label,
      children: isObject ? jsonToTree(value, currentPath) : undefined,
      isLeaf: !isObject
    };
  });
}

const treeData = computed(() => {
  // Use lastValidConfig for stability
  const data = configStore.lastValidConfig;
  if (!data) return [];
  return jsonToTree(data);
});

// Expansion logic (simplified for NTree)
const expandedKeys = ref<string[]>([]);

function onExpand(keys: string[]) {
  expandedKeys.value = keys;
}

function getAllKeys(nodes: any[]): string[] {
  let keys: string[] = [];
  for (const node of nodes) {
    keys.push(node.key);
    if (node.children) {
      keys = keys.concat(getAllKeys(node.children));
    }
  }
  return keys;
}

function expandAll() {
  expandedKeys.value = getAllKeys(treeData.value);
}

function collapseAll() {
  expandedKeys.value = [];
}
</script>

<style scoped>
.json-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}
.tree-toolbar {
  padding: 4px;
  border-bottom: 1px solid var(--n-border-color);
}
.tree-content {
  flex: 1;
  overflow: auto;
}
</style>
