<template>
  <div class="history-file-list-panel">
    <!-- Collapsed View -->
    <div v-if="collapsed" class="collapsed-view" @click="$emit('expand')">
      <n-tooltip placement="right">
        <template #trigger>
          <div class="collapsed-icon">
            <n-icon size="24"><TimeOutline /></n-icon>
          </div>
        </template>
        展开历史文件列表
      </n-tooltip>
    </div>

    <!-- Expanded View -->
    <div v-else class="expanded-view">
      <div class="search-box">
        <n-input size="small" placeholder="搜索文件..." v-model:value="searchText" clearable>
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-popselect 
           v-model:value="store.fileFilterMode" 
           :options="filterOptions" 
           trigger="click"
        >
           <n-button size="small" style="margin-left: 8px" title="过滤选项">
             <template #icon><n-icon><FilterOutline /></n-icon></template>
           </n-button>
        </n-popselect>
        <n-button size="small" @click="store.loadFiles" title="刷新列表" style="margin-left: 4px">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
        </n-button>
      </div>
      
      <div class="list-container">
        <div 
          v-for="file in filteredFiles" 
          :key="file.id" 
          class="file-item"
          :class="{ active: store.activeFile?.id === file.id }"
          @click="selectFile(file)"
        >
          <div class="icon">
            <n-icon v-if="isDerivedFile(file.logical_path)"><CopyOutline /></n-icon>
            <n-icon v-else><DocumentTextOutline /></n-icon>
          </div>
          <div class="info">
            <div class="name" :title="file.logical_path">{{ getFileName(file.logical_path) }}</div>
            <div class="path" :title="file.logical_path">{{ getSmartPath(file.logical_path) }}</div>
            <div class="meta">
               <span class="time">{{ formatRelativeTime(file.updated_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NInput, NIcon, NTooltip, NButton, NPopselect } from 'naive-ui';
import { SearchOutline, DocumentTextOutline, TimeOutline, RefreshOutline, FilterOutline, CopyOutline } from '@vicons/ionicons5';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';

const props = defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits(['expand']);

const store = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const searchText = ref('');

const filterOptions = [
    { label: '仅显示原始文件', value: 'original' },
    { label: '显示所有文件', value: 'all' }
];

const filteredFiles = computed(() => {
  let list = store.files;
  
  // 1. Filter by mode
  if (store.fileFilterMode === 'original') {
      list = list.filter(f => !isDerivedFile(f.logical_path));
  }

  // 2. Filter by search
  if (searchText.value) {
    const lower = searchText.value.toLowerCase();
    list = list.filter(f => f.logical_path.toLowerCase().includes(lower));
  }
  
  // 3. Sort by updated_at desc
  return [...list].sort((a, b) => b.updated_at - a.updated_at);
});

function isDerivedFile(path: string) {
    const name = getFileName(path);
    // Pattern 1: EF_timestamp_name.json
    if (/^EF_\d{10,}_.+\.json$/.test(name)) return true;
    // Pattern 2: contains .rollback. or .copy.
    if (name.includes('.rollback.') || name.includes('.copy.')) return true;
    return false;
}

function getFileName(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function getSmartPath(path: string) {
  const parts = path.split(/[/\\]/);
  parts.pop(); // remove filename
  if (parts.length === 0) return '/';
  
  // If too long, truncate?
  // Return "root/.../lastDir"
  if (parts.length > 3) {
      return parts[0] + '/.../' + parts[parts.length - 1];
  }
  return parts.join('/');
}

function formatRelativeTime(ts: number) {
    const now = Date.now() / 1000;
    const diff = now - ts;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
    return new Date(ts * 1000).toLocaleDateString();
}

async function selectFile(file: any) {
    await store.selectFile(file);
    // Open Right Drawer for Timeline
    layoutStore.openRightDrawer('historyTimeline');
}

onMounted(() => {
    // If we are in history panel, maybe load files?
    if (store.files.length === 0) {
        store.loadFiles();
    }
});
</script>

<style scoped>
.history-file-list-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.expanded-view {
  display: flex;
  flex-direction: column;
  height: 100%;
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

.search-box {
  padding: 8px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.list-container {
  flex: 1;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f9f9f9;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: #f5f5f5;
}

.file-item.active {
  background-color: #e7f5ee;
  border-left: 3px solid #18a058;
}

.icon {
  margin-right: 12px;
  color: #666;
  display: flex;
}

.info {
  flex: 1;
  overflow: hidden;
}

.name {
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.path {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 2px;
}

.time {
  font-size: 11px;
  color: #aaa;
}
</style>
