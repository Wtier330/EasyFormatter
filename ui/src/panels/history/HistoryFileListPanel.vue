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
        <n-button size="small" @click="store.loadFiles" title="刷新列表" style="margin-left: 8px">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
        </n-button>
      </div>
      
      <div class="list-container">
        <div 
          v-for="file in displayFiles" 
          :key="file.id" 
          class="file-item"
          :class="{ active: store.activeFile?.id === file.id }"
          @click="selectFile(file)"
          @contextmenu.prevent="openFileContextMenu($event, file)"
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

      <n-dropdown
        placement="bottom-start"
        trigger="manual"
        :x="menuX"
        :y="menuY"
        :options="contextMenuOptions"
        :show="menuShow"
        @clickoutside="menuShow = false"
        @select="handleContextMenuSelect"
      />
    </div>
  </div>

  <n-modal
    v-model:show="showDeleteConfirm"
    preset="dialog"
    title="确认删除"
    content="确定要删除此条历史记录及其所有相关内容吗？"
    positive-text="确认删除"
    negative-text="取消"
    :positive-button-props="{ type: 'error', loading: deleting }"
    :negative-button-props="{ disabled: deleting }"
    @positive-click="confirmDelete"
    @negative-click="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, h } from 'vue';
import { NInput, NIcon, NTooltip, NButton, NDropdown, useMessage, NModal } from 'naive-ui';
import { SearchOutline, DocumentTextOutline, TimeOutline, RefreshOutline, CopyOutline, TrashOutline } from '@vicons/ionicons5';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { formatFileSize } from '../../utils/format';
import { historyService } from '../../services/historyService';
import type { FileRecord } from '../../services/historyService';

defineProps<{
  collapsed?: boolean;
}>();

const emit = defineEmits(['expand']);

const store = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const message = useMessage();
const searchText = ref('');

const displayFiles = computed(() => {
  let list = store.files;
  
  // Filter by search
  if (searchText.value) {
    const lower = searchText.value.toLowerCase();
    list = list.filter(f => f.logical_path.toLowerCase().includes(lower));
  }
  
  // Sort by updated_at desc
  return [...list].sort((a, b) => b.updated_at - a.updated_at);
});

const menuShow = ref(false);
const menuX = ref(0);
const menuY = ref(0);
const menuFile = ref<FileRecord | null>(null);

const showDeleteConfirm = ref(false);
const deleteTargetFile = ref<FileRecord | null>(null);
const deleting = ref(false);

const contextMenuOptions = computed(() => {
  if (!menuFile.value) return [];
  return [
    {
      label: '删除历史记录',
      key: 'deleteHistory',
      props: { style: 'color: #d03050' },
      icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
    }
  ];
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
    layoutStore.openRightDrawer('history');
}

function openFileContextMenu(e: MouseEvent, file: FileRecord) {
  e.preventDefault();
  menuShow.value = false;
  nextTick().then(() => {
    menuFile.value = file;
    menuX.value = e.clientX;
    menuY.value = e.clientY;
    menuShow.value = true;
  });
}

function handleContextMenuSelect(key: string) {
  menuShow.value = false;
  if (key === 'deleteHistory' && menuFile.value) {
    deleteTargetFile.value = menuFile.value;
    showDeleteConfirm.value = true;
  }
}

async function confirmDelete() {
  if (!deleteTargetFile.value) return;
  deleting.value = true;
  try {
    const res = await deleteFileHistorySafe(deleteTargetFile.value.id);
    if (res) {
      message.success(`已删除历史记录（${res.removed_count} 条，约 ${formatFileSize(res.removed_bytes)}）`);
    } else {
      message.success('已删除历史记录');
    }
  } catch (e) {
    message.error(`删除失败: ${e}`);
  } finally {
    deleting.value = false;
    showDeleteConfirm.value = false;
    deleteTargetFile.value = null;
    menuFile.value = null;
  }
}

async function deleteFileHistorySafe(fileId: number) {
  const anyStore = store as any;
  if (typeof anyStore.deleteFileHistory === 'function') {
    return await anyStore.deleteFileHistory(fileId);
  }

  const res = await historyService.deleteFileHistory(fileId);

  if ((store.activeFile as any)?.id === fileId) {
    (store.activeFile as any) = null;
    (store.records as any) = [];
    (store.selectedRecord as any) = null;
    (store.compareMode as any) = false;
    (store.inspectMode as any) = false;
    (store.currentContent as any) = '';
    (store.currentHash as any) = '';
    (store.compareContent as any) = '';
    (store.compareHash as any) = '';
  }

  await store.loadFiles();
  return res;
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
