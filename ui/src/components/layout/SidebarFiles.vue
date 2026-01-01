<template>
  <div class="sidebar" @contextmenu.prevent="showGlobalContextMenu">
    <!-- Collapsed View -->
    <div v-if="isCollapsed" class="collapsed-view" @click="expandSidebar">
      <n-tooltip placement="right">
        <template #trigger>
          <div class="collapsed-icon">
            <n-icon size="24"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M64 192h384M64 320h384M64 64h384c17.7 0 32 14.3 32 32v320c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V96c0-17.7 14.3-32 32-32z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </div>
        </template>
        展开侧边栏 ({{ filteredFiles.length }} 个文件)
      </n-tooltip>
      
      <div class="collapsed-divider"></div>
      
      <!-- Quick Actions in Collapsed Mode -->
      <n-tooltip placement="right">
        <template #trigger>
          <div class="collapsed-icon" @click.stop="openFile">
             <n-icon size="20"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 176v160M336 256H176"/></svg></n-icon>
          </div>
        </template>
        导入文件
      </n-tooltip>
    </div>

    <!-- Expanded View -->
    <template v-else>
    <div class="sidebar-header">
      <div class="header-row">
        <div class="search-box">
          <n-input 
            v-model:value="searchQuery" 
            placeholder="" 
            size="small"
            clearable
          >
            <template #prefix>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M221.09 64a157.09 157.09 0 10157.09 157.09A157.1 157.1 0 00221.09 64z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32" d="M338.29 338.29L448 448"/></svg></n-icon>
            </template>
          </n-input>
        </div>
        <n-button quaternary circle size="small" @click="manualSync" title="同步文件状态">
          <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M320 146s24.36-12-64-12a160 160 0 10160 160" fill="none" stroke="currentColor" stroke-linecap="round" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M256 58l80 80-80 80"/></svg></n-icon></template>
        </n-button>
      </div>
    </div>

    <TransitionGroup name="list" tag="div" class="file-list" v-if="filteredFiles.length > 0">
      <div 
        v-for="file in filteredFiles" 
        :key="file.path" 
        class="file-card"
        :class="{ active: configStore.currentFilePath === file.path }"
        @click="open(file.path)"
        @contextmenu.prevent.stop="showContextMenu($event, file)"
      >
        <div class="card-main">
          <div class="file-name" :title="file.name">{{ file.name }}</div>
          <div class="file-meta">
            <span v-if="file.lastModified">{{ formatTimeAgo(file.lastModified) }}</span>
            <span v-if="file.size" class="separator">•</span>
            <span v-if="file.size">{{ formatFileSize(file.size) }}</span>
          </div>
        </div>
        <div class="card-path-row" :title="file.path">
          <span class="path-text">{{ shortenPath(file.path, 100) }}</span>
          <span class="time-text" v-if="file.lastModified">{{ formatTimeAgo(file.lastModified) }}</span>
        </div>
        
        <div class="delete-btn" @click.stop="appStore.removeRecentFile(file.path)">
          <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M368 368L144 144M368 144L144 368" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
        </div>
      </div>
    </TransitionGroup>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <n-icon size="48" color="#ccc"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 464a48 48 0 0048 48h288a48 48 0 0048-48V128H32zm272-256a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zM432 32H312l-9.4-18.7A24 24 0 00281.1 0H166.8a23.72 23.72 0 00-21.4 13.3L136 32H16A16 16 0 000 48v32a16 16 0 0016 16h416a16 16 0 0016-16V48a16 16 0 00-16-16z" fill="currentColor"/></svg></n-icon>
      </div>
      <div class="empty-text">暂无文件</div>
      <div class="empty-sub">选择一个 JSON 配置文件开始</div>
      <n-button type="primary" size="small" @click="openFile" class="import-btn">
        导入文件
      </n-button>
    </div>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="x"
      :y="y"
      :options="currentContextMenuOptions"
      :show="showDropdown"
      @clickoutside="showDropdown = false"
      @select="handleSelect"
    />

    <AboutModal v-model:show="showAbout" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { NInput, NIcon, NButton, NDropdown, useMessage, NTooltip } from 'naive-ui';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';
import { shortenPath, copyToClipboard } from '../../utils/path';
import { formatFileSize, formatTimeAgo } from '../../utils/format';
import type { RecentFileItem } from '../../types/config';
import AboutModal from '../about/AboutModal.vue';
import { useAbout } from '../../composables/useAbout';

const appStore = useAppStore();
const configStore = useConfigStore();
const message = useMessage();
const { initInfo } = useAbout();

const isCollapsed = computed(() => appStore.sidebarState === 'COLLAPSED');

function expandSidebar() {
  appStore.sidebarState = 'EXPANDED';
  appStore.sidebarWidth = Math.max(appStore.lastExpandedWidth, 200);
}

const searchQuery = ref('');
const showDropdown = ref(false);
const showAbout = ref(false);
const x = ref(0);
const y = ref(0);
const selectedFile = ref<RecentFileItem | null>(null);

// File Monitoring: Check if files still exist on disk
async function checkFiles() {
  // console.log('[SidebarFiles] Checking file existence...');
  const files = [...appStore.recentFiles];
  const checks = await Promise.all(files.map(async f => {
    try {
        const doesExist = await commands.exists(f.path);
        return { path: f.path, exists: doesExist, name: f.name };
    } catch (e) {
        return { path: f.path, exists: true, name: f.name };
    }
  }));

  let removedCount = 0;
  for (const result of checks) {
    if (!result.exists) {
        console.log(`[SidebarFiles] File missing: ${result.path}`);
        appStore.removeRecentFile(result.path);
        message.warning(`文件 ${result.name} 已被删除`, { duration: 2000 });
        removedCount++;
    }
  }
  console.log(`[SidebarFiles] Check complete. Removed ${removedCount} files.`);
}

function manualSync() {
    checkFiles();
    message.success('已同步文件列表');
}

let timer: any;
onMounted(() => {
    checkFiles();
    initInfo();
    timer = setInterval(checkFiles, 300000); // 5 minutes polling
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});

async function openFile() {
  const path = await commands.pickFile();
  if (path) {
    await configStore.loadFile(path);
  }
}

const filteredFiles = computed(() => {
  if (!searchQuery.value) return appStore.recentFiles;
  const q = searchQuery.value.toLowerCase();
  return appStore.recentFiles.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
});

async function open(path: string) {
  const name = path.split(/[/\\]/).pop() || path;
  const tab = appStore.ensureTab(path, name);
  // Commit current active buffer to its tab
  const active = appStore.openTabs.find(t => t.id === appStore.activeTabId);
  if (active) {
    active.cachedText = configStore.rawText;
    active.isDirty = configStore.isDirty;
    active.originalHash = configStore.originalHash;
  }
  // Activate new tab and load content
  appStore.setActive(tab.id);
  await configStore.loadFile(path);
  tab.cachedText = configStore.rawText;
  tab.isDirty = false;
}

const currentContextMenuOptions = ref<any[]>([]);

function showContextMenu(e: MouseEvent, file: RecentFileItem) {
  e.preventDefault();
  showDropdown.value = false;
  currentContextMenuOptions.value = fileContextMenuOptions;
  nextTick().then(() => {
    showDropdown.value = true;
    x.value = e.clientX;
    y.value = e.clientY;
    selectedFile.value = file;
  });
}

function showGlobalContextMenu(e: MouseEvent) {
  e.preventDefault();
  showDropdown.value = false;
  currentContextMenuOptions.value = generalContextMenuOptions;
  nextTick().then(() => {
    showDropdown.value = true;
    x.value = e.clientX;
    y.value = e.clientY;
    selectedFile.value = null;
  });
}

const fileContextMenuOptions = [
  { label: '打开', key: 'open' },
  { label: '在资源管理器中显示', key: 'reveal' },
  { label: '复制路径', key: 'copy' },
  { type: 'divider', key: 'd1' },
  { label: '从最近列表移除', key: 'remove' },
  { type: 'divider', key: 'd2' },
  { label: '打开调试工具', key: 'devtools' }
];

const generalContextMenuOptions = [
  { label: '打开调试工具', key: 'devtools' }
];

async function handleSelect(key: string) {
  showDropdown.value = false;

  if (key === 'devtools') {
    commands.openDevtools();
    return;
  }

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
  background-color: var(--n-color-modal);
  border-right: 1px solid var(--n-border-color);
}

.sidebar-header {
  padding: 8px;
  border-bottom: 1px solid var(--n-border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.search-box {
  flex: 1;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* List Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-30px);
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
  margin-bottom: 2px;
}

.file-name {
  font-size: 13px;
  color: var(--n-text-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 8px;
}

.file-meta {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  flex-shrink: 0;
}

.separator {
  margin: 0 4px;
}

.card-path-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Roboto', sans-serif;
  font-size: 12px;
  color: #999;
  width: 100%;
}

.path-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
  direction: ltr;
}

.time-text {
  flex-shrink: 0;
  color: #888;
  font-size: 12px;
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

.collapsed-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  cursor: pointer;
  background-color: #f9f9f9;
}

.collapsed-view:hover {
  background-color: #f0f0f0;
}

.collapsed-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  border-radius: 6px;
  transition: all 0.2s;
  margin-bottom: 8px;
}

.collapsed-icon:hover {
  background-color: #e0e0e0;
  color: var(--n-primary-color);
  transform: scale(1.05);
}

.collapsed-divider {
  width: 24px;
  height: 1px;
  background-color: #ddd;
  margin: 8px 0;
}
</style>