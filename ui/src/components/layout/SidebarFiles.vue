<template>
  <div class="sidebar">
    <div class="header">
      <span>最近文件</span>
    </div>
    <n-list hoverable clickable>
      <n-list-item v-for="file in appStore.recentFiles" :key="file" @click="open(file)">
        <n-thing :title="getFileName(file)" :description="shortenPath(file, 25)" />
      </n-list-item>
    </n-list>
    <div v-if="appStore.recentFiles.length === 0" class="empty">
      暂无最近文件
    </div>
  </div>
</template>

<script setup lang="ts">
import { NList, NListItem, NThing } from 'naive-ui';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { shortenPath } from '../../utils/path';

const appStore = useAppStore();
const configStore = useConfigStore();

function getFileName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

async function open(path: string) {
  await configStore.loadFile(path);
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--n-color-modal);
  overflow-y: auto;
}
.header {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid var(--n-border-color);
}
.empty {
  padding: 20px;
  text-align: center;
  color: var(--n-text-color-3);
  font-size: 12px;
}
</style>
