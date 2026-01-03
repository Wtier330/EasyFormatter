<template>
  <div class="history-timeline-drawer">
    <div class="header">
      <div class="title">版本历史</div>
      <div class="actions">
         <n-switch v-model:value="store.recordFilterMode" size="small" checked-value="key" unchecked-value="all">
            <template #checked>关键</template>
            <template #unchecked>全部</template>
         </n-switch>
         <n-divider vertical />
         <n-tooltip>
           <template #trigger>
             <n-button size="tiny" circle @click="refresh">
               <template #icon><n-icon><RefreshOutline /></n-icon></template>
             </n-button>
           </template>
           刷新
         </n-tooltip>
      </div>
    </div>
    
    <div class="content">
      <div v-if="!store.activeFile" class="empty-state">
        请先选择左侧文件
      </div>
      <div v-else-if="filteredRecords.length === 0" class="empty-state">
        暂无{{ store.recordFilterMode === 'key' ? '关键' : '' }}历史记录
      </div>
      <div v-else class="timeline-list">
         <div 
           v-for="record in filteredRecords" 
           :key="record.id" 
           class="timeline-card"
           :class="{ 
             active: store.selectedRecord?.id === record.id,
             checkpoint: record.is_checkpoint,
             rollback: record.op_type === 'rollback'
           }"
           @click="selectRecord(record)"
         >
            <div class="tc-header">
               <n-tag size="tiny" :type="getOpTagType(record)" :bordered="false" class="op-tag">
                  {{ getOpLabel(record.op_type) }}
               </n-tag>
               <span class="tc-time-rel">{{ getRelativeTime(record.ts) }}</span>
            </div>
            
            <div class="tc-body">
               <div class="tc-info-row">
                  <span class="tc-time-exact">{{ formatTime(record.ts) }}</span>
               </div>
               <div class="tc-info-row">
                  <span class="tc-size">Size: {{ formatFileSize(record.payload_size) }}</span>
                  <span class="tc-change-placeholder" title="变更详情请点击预览">
                    <!-- Placeholder for diff stats -->
                  </span>
               </div>
               <div class="tc-note" v-if="record.note">
                 {{ record.note }}
               </div>
            </div>

            <!-- Active Actions -->
            <div class="tc-actions" v-if="store.selectedRecord?.id === record.id">
                <n-button 
                    size="tiny" 
                    type="error"
                    @click.stop="handleOverwrite(record)" 
                    style="margin-right: 8px"
                >
                    覆盖还原
                </n-button>
                <n-button 
                    size="tiny" 
                    secondary 
                    type="primary" 
                    @click.stop="handleCopyRestore(record)"
                >
                    复制还原
                </n-button>
            </div>
            
            <!-- Type Badge -->
            <div class="tc-badge" v-if="getRecordTypeBadge(record)">
                {{ getRecordTypeBadge(record) }}
            </div>
         </div>
      </div>
    </div>
  </div>

    <n-modal
      v-model:show="showOverwriteConfirm"
      preset="dialog"
      title="确认覆盖还原"
      content="这会覆盖现有的文件，是否继续？"
      positive-text="确定"
      negative-text="取消"
      @positive-click="confirmOverwrite"
      @negative-click="showOverwriteConfirm = false"
    />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useAppStore } from '../../stores/app';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { useConfigStore } from '../../stores/config';
import { NButton, NIcon, NTooltip, NTag, NSwitch, NDivider, useMessage, NModal } from 'naive-ui';
import { RefreshOutline } from '@vicons/ionicons5';
import { formatFileSize } from '../../utils/format';
import { historyService, type VersionSummary } from '../../services/historyService';
import { commands } from '../../tauri';

const store = useHistoryWorkspaceStore();
const appStore = useAppStore();
const layoutStore = useSidebarLayoutStore();
const configStore = useConfigStore();
const message = useMessage();

const recordToOverwrite = ref<VersionSummary | null>(null);
const showOverwriteConfirm = ref(false);

const filteredRecords = computed(() => {
    if (store.recordFilterMode === 'all') {
        return store.records;
    }
    // Key mode: Checkpoint, Rollback, Copy, Save
    return store.records.filter(r => {
        if (r.is_checkpoint) return true;
        if (['rollback', 'copy_restore', 'save'].includes(r.op_type)) return true;
        return false;
    });
});

// Watch filter change to ensure selection visibility
watch(() => store.recordFilterMode, (newMode) => {
    if (newMode === 'key' && store.selectedRecord) {
        // If selected record is filtered out, select the nearest visible one?
        // Or just keep it but it won't be in the list (confusing).
        // Requirement: "若选中记录被过滤掉，给提示并自动选中最近一条可见记录。"
        const isVisible = filteredRecords.value.find(r => r.id === store.selectedRecord?.id);
        if (!isVisible && filteredRecords.value.length > 0) {
            message.info('当前选中记录已被过滤，自动切换至最近可见记录');
            store.selectRecord(filteredRecords.value[0]);
        }
    }
});

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString();
}

function getRelativeTime(ts: number) {
    const now = Date.now() / 1000;
    const diff = now - ts;
    
    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
    return new Date(ts * 1000).toLocaleDateString();
}

function getOpLabel(op: string) {
    const map: Record<string, string> = {
        save: '保存',
        compress: '压缩',
        format: '格式化',
        escape: '转义',
        unescape: '去转义',
        unicode: 'Unicode',
        rollback: '回滚',
        copy_restore: '复制还原'
    };
    return map[op] || op;
}

function getOpTagType(record: VersionSummary) {
    if (record.op_type === 'rollback') return 'error';
    if (record.op_type === 'save') return 'success';
    if (record.is_checkpoint) return 'warning';
    return 'default';
}

function getRecordTypeBadge(record: VersionSummary) {
    if (record.op_type === 'rollback') return 'ROLLBACK';
    if (record.op_type === 'copy_restore') return 'COPY';
    if (record.is_checkpoint) return 'CHECKPOINT';
    return null;
}

function selectRecord(record: VersionSummary) {
  store.selectRecord(record);
}

function refresh() {
  if (store.activeFile) {
    store.selectFile(store.activeFile);
  }
}

function handleOverwrite(record: VersionSummary) {
    recordToOverwrite.value = record;
    showOverwriteConfirm.value = true;
}

async function confirmOverwrite() {
    if (!recordToOverwrite.value) return;
    try {
        await store.overwriteRestore(recordToOverwrite.value);
        message.success('覆盖还原成功');
    } catch (e) {
        message.error(`覆盖还原失败: ${e}`);
    } finally {
        showOverwriteConfirm.value = false;
        recordToOverwrite.value = null;
    }
}

async function handleCopyRestore(record: VersionSummary) {
    try {
        const path = await store.copyRestoreSelectedVersion();
        if (path) {
            message.success(`已复制还原到: ${path}`);
            
            // 1. Add to recent files
            try {
                const stats = await commands.stat(path);
                // @ts-ignore
                const mtime = stats.mtime ? new Date(stats.mtime).getTime() : Date.now();
                appStore.addRecentFile(path, stats.size, mtime);
            } catch (err) {
                console.error("Failed to stat new file", err);
                appStore.addRecentFile(path, 0, Date.now());
            }

            // 2. Switch panel
            layoutStore.setActivePanel('files');
            
            // 3. Open tab
            const name = path.split(/[/\\]/).pop() || path;
            const tab = appStore.ensureTab(path, name);
            appStore.setActive(tab.id);
            
            // 4. Load content (highlights file)
            await configStore.loadFile(path);
        }
    } catch (e) {
        message.error(`复制还原失败: ${e}`);
    }
}
</script>

<style scoped>
.history-timeline-drawer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f9f9f9;
  border-left: 1px solid #eee;
}

.header {
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
    font-weight: bold;
    font-size: 13px;
}

.actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.empty-state {
  padding: 40px 20px;
  color: #999;
  text-align: center;
  font-size: 13px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  overflow: hidden;
}

.timeline-card:hover {
  border-color: #18a058;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.timeline-card.active {
  border-color: #18a058;
  background-color: #f0f9f4;
  box-shadow: 0 0 0 1px #18a058 inset;
}

.timeline-card.checkpoint {
    border-left: 3px solid #f0a020;
}

.timeline-card.rollback {
    border-left: 3px solid #d03050;
}

.tc-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}

.tc-time-rel {
    font-size: 12px;
    color: #666;
    font-weight: 500;
}

.op-tag {
    font-weight: bold;
}

.tc-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.tc-info-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #999;
}

.tc-size {
    font-family: monospace;
}

.tc-note {
    margin-top: 6px;
    font-size: 11px;
    color: #555;
    background: #f5f5f5;
    padding: 4px 6px;
    border-radius: 4px;
}

.tc-actions {
    margin-top: 8px;
    display: flex;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid #eee;
}

.tc-badge {
    position: absolute;
    right: -15px;
    top: 5px;
    background: #eee;
    color: #999;
    font-size: 9px;
    padding: 2px 15px;
    transform: rotate(45deg);
    font-weight: bold;
    pointer-events: none;
    opacity: 0.5;
}

.timeline-card.active .tc-badge {
    opacity: 0.8;
}
</style>
