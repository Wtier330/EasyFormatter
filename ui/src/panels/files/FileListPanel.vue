<template>
  <div class="file-list-panel">
    <!-- Collapsed View -->
    <div v-if="collapsed" class="collapsed-view" @click="$emit('expand')">
      <n-tooltip placement="right">
        <template #trigger>
          <div class="collapsed-icon">
            <n-icon size="24"><DocumentTextOutline /></n-icon>
          </div>
        </template>
        展开文件列表
      </n-tooltip>
    </div>

    <!-- Expanded View -->
    <div v-else class="expanded-view" @contextmenu.prevent="showGlobalContextMenu">
      <!-- Header -->
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
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
          </div>
          <n-button quaternary circle size="small" @click="manualSync" title="同步文件状态">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
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
            <n-icon><TrashOutline /></n-icon>
          </div>
        </div>
      </TransitionGroup>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <n-icon size="48" color="#ccc"><DocumentTextOutline /></n-icon>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { NInput, NIcon, NButton, NDropdown, useMessage, NTooltip } from 'naive-ui';
import { 
  SearchOutline, 
  RefreshOutline, 
  DocumentTextOutline, 
  TrashOutline, 
  InformationCircleOutline,
  FolderOpenOutline
} from '@vicons/ionicons5';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';
import { shortenPath, copyToClipboard } from '../../utils/path';
import { formatFileSize, formatTimeAgo } from '../../utils/format';
import type { RecentFileItem } from '../../types/config';
import AboutModal from '../../components/about/AboutModal.vue';
import { useAbout } from '../../composables/useAbout';

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits(['expand']);

const appStore = useAppStore();
const configStore = useConfigStore();
const message = useMessage();
const { initInfo } = useAbout();

const searchQuery = ref('');
const showDropdown = ref(false);
const showAbout = ref(false);
const x = ref(0);
const y = ref(0);
const selectedFile = ref<RecentFileItem | null>(null);

const filteredFiles = computed(() => {
  if (!searchQuery.value) return appStore.recentFiles;
  const lower = searchQuery.value.toLowerCase();
  return appStore.recentFiles.filter(f => 
    f.name.toLowerCase().includes(lower) || 
    f.path.toLowerCase().includes(lower)
  );
});

function open(path: string) {
  const tab = appStore.ensureTab(path);
  appStore.setActive(tab.id);
  configStore.loadFile(path);
}

async function openFile() {
  const selected = await commands.pickFile();
  if (selected && typeof selected === 'string') {
    open(selected);
  }
}

async function manualSync() {
  await appStore.syncFilesStatus();
  message.success('文件状态已更新');
}

// Context Menu Logic
const currentContextMenuOptions = computed(() => {
  if (selectedFile.value) {
    return [
      { label: '在资源管理器中显示', key: 'reveal', icon: () => h(NIcon, null, { default: () => h(FolderOpenOutline) }) },
      { label: '复制路径', key: 'copyPath' },
      { label: '从列表中移除', key: 'remove', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
    ];
  }
  return [
    { label: '导入文件', key: 'import', icon: () => h(NIcon, null, { default: () => h(FolderOpenOutline) }) },
    { label: '关于 EasyFormatter', key: 'about', icon: () => h(NIcon, null, { default: () => h(InformationCircleOutline) }) }
  ];
});

function showContextMenu(e: MouseEvent, file: RecentFileItem) {
  e.preventDefault();
  showDropdown.value = false;
  nextTick().then(() => {
    selectedFile.value = file;
    x.value = e.clientX;
    y.value = e.clientY;
    showDropdown.value = true;
  });
}

function showGlobalContextMenu(e: MouseEvent) {
  if (props.collapsed) return; // Disable context menu on collapsed
  e.preventDefault();
  showDropdown.value = false;
  nextTick().then(() => {
    selectedFile.value = null;
    x.value = e.clientX;
    y.value = e.clientY;
    showDropdown.value = true;
  });
}

async function handleSelect(key: string) {
  showDropdown.value = false;
  if (selectedFile.value) {
    const file = selectedFile.value;
    if (key === 'reveal') {
      await commands.revealInExplorer(file.path);
    } else if (key === 'copyPath') {
      await copyToClipboard(file.path);
      message.success('路径已复制');
    } else if (key === 'remove') {
      appStore.removeRecentFile(file.path);
    }
  } else {
    if (key === 'import') {
      await openFile();
    } else if (key === 'about') {
      showAbout.value = true;
      initInfo();
    }
  }
}

// Helper h function for icons in dropdown (Vue 3)
import { h } from 'vue';

onMounted(() => {
  // Sync on mount?
  // appStore.syncFilesStatus();
});
</script>

<style scoped>
.file-list-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.expanded-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.collapsed-view {
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 16px;
  cursor: pointer;
  color: #666;
}

.collapsed-view:hover {
  color: #333;
}

/* Reusing styles from SidebarFiles.vue (adapted) */
.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.header-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-box {
  flex: 1;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-card {
  padding: 8px 12px;
  margin: 0 8px 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  position: relative;
}

.file-card:hover {
  background-color: #f5f5f5;
}

.file-card.active {
  background-color: #e7f5ee;
  border-color: #d1eadb;
}

.card-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.file-name {
  font-weight: 500;
  font-size: 13px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 8px;
}

.file-meta {
  font-size: 11px;
  color: #999;
  flex-shrink: 0;
}

.card-path-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
}

.path-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
}

.delete-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
  padding: 4px;
  border-radius: 4px;
}

.delete-btn:hover {
  background-color: #ffecec;
  color: #d03050;
}

.file-card:hover .delete-btn {
  opacity: 1;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  padding: 24px;
  text-align: center;
}

.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-sub {
  font-size: 12px;
  margin-bottom: 16px;
}

/* Transitions */
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
  width: calc(100% - 16px);
}
</style>
