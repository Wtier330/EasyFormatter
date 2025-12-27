<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="search-box">
        <n-input 
          v-model:value="searchQuery" 
          placeholder="搜索最近文件" 
          size="small"
          clearable
        >
          <template #prefix>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg></n-icon>
          </template>
        </n-input>
      </div>
      <div class="actions">
        <n-button-group size="tiny" style="width: 100%">
          <n-button style="flex: 1" @click="importFile">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 448H64c-17.67 0-32-14.33-32-32V96c0-17.67 14.33-32 32-32h192l64 64h128c17.67 0 32 14.33 32 32v256c0 17.67-14.33 32-32 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
            </template>
            导入
          </n-button>
          <n-button style="flex: 1" @click="refreshList">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M320 146s24.36-12-64-12a160 160 0 10160 160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 58l80 80-80 80"/></svg></n-icon>
            </template>
            刷新
          </n-button>
        </n-button-group>
      </div>
    </div>

    <div class="file-list" v-if="filteredFiles.length > 0">
      <div 
        v-for="file in filteredFiles" 
        :key="file.path" 
        class="file-card"
        :class="{ active: configStore.currentFilePath === file.path }"
        @click="open(file.path)"
        @contextmenu.prevent="showContextMenu($event, file)"
      >
        <div class="card-main">
          <div class="file-name" :title="file.name">{{ file.name }}</div>
          <div class="file-meta">
            <span v-if="file.lastModified">{{ formatTimeAgo(file.lastModified) }}</span>
            <span v-if="file.size" class="separator">•</span>
            <span v-if="file.size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
        <div class="card-path" :title="file.path">
          {{ shortenPath(file.path, 30) }}
        </div>
        
        <div class="delete-btn" @click.stop="appStore.removeRecentFile(file.path)">
          <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M368 368L144 144M368 144L144 368" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <n-icon size="48" color="#ccc"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 464a48 48 0 0048 48h288a48 48 0 0048-48V128H32zm272-256a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zM432 32H312l-9.4-18.7A24 24 0 00281.1 0H166.8a23.72 23.72 0 00-21.4 13.3L136 32H16A16 16 0 000 48v32a16 16 0 0016 16h416a16 16 0 0016-16V48a16 16 0 00-16-16z" fill="currentColor"/></svg></n-icon>
      </div>
      <div class="empty-text">暂无最近文件</div>
      <div class="empty-sub">点击「导入」选择一个 JSON 配置文件开始</div>
      <n-button type="primary" size="small" @click="importFile" class="import-btn">
        导入文件
      </n-button>
    </div>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="x"
      :y="y"
      :options="contextMenuOptions"
      :show="showDropdown"
      @clickoutside="showDropdown = false"
      @select="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { NInput, NIcon, NButton, NButtonGroup, NDropdown } from 'naive-ui';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';
import { shortenPath, copyToClipboard } from '../../utils/path';
import { formatFileSize, formatTimeAgo } from '../../utils/format';
import type { RecentFileItem } from '../../types/config';

const appStore = useAppStore();
const configStore = useConfigStore();

const searchQuery = ref('');
const showDropdown = ref(false);
const x = ref(0);
const y = ref(0);
const selectedFile = ref<RecentFileItem | null>(null);

const filteredFiles = computed(() => {
  if (!searchQuery.value) return appStore.recentFiles;
  const q = searchQuery.value.toLowerCase();
  return appStore.recentFiles.filter((f: RecentFileItem) => 
    f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
  );
});

async function importFile() {
  const path = await commands.pickFile();
  if (path) {
    await configStore.loadFile(path);
  }
}

function refreshList() {
  // In a real app, we might check file existence here
  // For now, just trigger a reactivity update if needed or do nothing
}

async function open(path: string) {
  await configStore.loadFile(path);
}

function showContextMenu(e: MouseEvent, file: RecentFileItem) {
  e.preventDefault();
  showDropdown.value = false;
  nextTick().then(() => {
    showDropdown.value = true;
    x.value = e.clientX;
    y.value = e.clientY;
    selectedFile.value = file;
  });
}

const contextMenuOptions = [
  { label: '打开', key: 'open' },
  { label: '在资源管理器中显示', key: 'reveal' },
  { label: '复制路径', key: 'copy' },
  { type: 'divider', key: 'd1' },
  { label: '从最近列表移除', key: 'remove' }
];

async function handleSelect(key: string) {
  showDropdown.value = false;
  if (!selectedFile.value) return;
  const file = selectedFile.value;

  switch (key) {
    case 'open':
      await open(file.path);
      break;
    case 'reveal':
      await commands.revealInExplorer(file.path);
      break;
    case 'copy':
      await copyToClipboard(file.path);
      break;
    case 'remove':
      appStore.removeRecentFile(file.path);
      break;
  }
}
</script>

<style scoped>
.sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa; /* Light gray bg like json.cn sidebar */
  border-right: 1px solid var(--n-border-color);
}

.sidebar-header {
  padding: 10px;
  background-color: #fff;
  border-bottom: 1px solid var(--n-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-card {
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.file-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.file-card.active {
  border-left: 3px solid var(--n-primary-color);
  background-color: #f0f9eb; /* Light green tint */
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}

.file-name {
  font-weight: 600;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 65%;
}

.file-meta {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.separator {
  margin: 0 4px;
}

.card-path {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: #999;
  opacity: 0;
  transition: opacity 0.2s, background-color 0.2s;
}

.file-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background-color: #eee;
  color: #ff4d4f;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  margin-top: 10px;
  font-weight: 500;
  color: #666;
}

.empty-sub {
  font-size: 12px;
  margin-top: 5px;
  margin-bottom: 15px;
}
</style>
