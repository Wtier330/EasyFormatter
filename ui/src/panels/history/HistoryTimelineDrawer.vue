<template>
  <div class="history-timeline-drawer" :class="{ 'delete-mode': isDeleteMode }">
    <div class="header">
      <div class="title">版本历史</div>
      <div class="actions">
        <!-- 移除复杂筛选，仅保留刷新 -->
        <n-tooltip>
          <template #trigger>
            <n-button size="tiny" circle @click="refresh">
              <template #icon><n-icon><RefreshOutline /></n-icon></template>
            </n-button>
          </template>
          刷新
        </n-tooltip>

        <n-tooltip>
          <template #trigger>
            <n-button size="tiny" circle :type="isDeleteMode ? 'error' : 'default'" @click="toggleDeleteMode">
              <template #icon><n-icon><TrashOutline /></n-icon></template>
            </n-button>
          </template>
          批量删除
        </n-tooltip>

        <n-tooltip>
          <template #trigger>
            <n-button size="tiny" circle @click="layoutStore.closeRightDrawer">
              <template #icon><n-icon><CloseOutline /></n-icon></template>
            </n-button>
          </template>
          关闭
        </n-tooltip>

        <n-button
          v-if="isDeleteMode && selectedDeleteIds.length > 0"
          size="tiny"
          type="error"
          secondary
          @click="requestDelete(selectedDeleteIds)"
        >
          删除 ({{ selectedDeleteIds.length }})
        </n-button>
      </div>
    </div>
    
    <div class="content">
      <div v-if="!store.activeFile" class="empty-state">
        请先选择左侧文件
      </div>
      <div v-else-if="store.records.length === 0" class="empty-state">
        暂无历史记录
      </div>
      <div v-else class="history-container">
        
        <!-- Layer 1: Recovery Zone (Emergency) -->
        <div class="recovery-section" v-if="recommendedRecords.length > 0">
           <div class="section-title">
              <n-icon class="icon"><AlertCircleOutline /></n-icon>
              最近可恢复状态
           </div>
           <div class="recovery-list">
             <div 
                v-for="record in recommendedRecords" 
                :key="record.id" 
                class="recovery-card"
                :class="{ active: store.selectedRecord?.id === record.id }"
                @click="selectRecord(record)"
              >
                  <n-button
                    class="row-delete"
                    size="tiny"
                    circle
                    quaternary
                    type="error"
                    @click.stop="requestDelete([record.id])"
                    title="删除该条记录"
                  >
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                  </n-button>
                  <div class="rc-left">
                     <div class="rc-reason">
                        <n-tag size="tiny" :type="getOpTagType(record)" :bordered="false">
                           {{ getOpLabel(record.op_type) }}
                        </n-tag>
                        <span class="rc-time">{{ getRelativeTime(record.ts) }}</span>
                     </div>
                     <div class="rc-meta">
                        {{ formatTime(record.ts) }}
                     </div>
                  </div>
                  <div class="rc-action">
                      <n-button 
                        size="small" 
                        type="default" 
                        class="inspect-btn"
                        @click.stop="handleInspect(record)"
                      >
                         详情
                      </n-button>
                  </div>
              </div>
           </div>
        </div>

        <!-- Layer 2: Audit Zone (Full History) -->
        <div class="audit-section">
           <div class="audit-header" @click="isAuditExpanded = !isAuditExpanded">
              <div class="audit-title">完整历史记录 ({{ store.records.length }})</div>
              <n-icon :component="ChevronDown" :class="{ rotated: !isAuditExpanded }" />
           </div>
           
           <div class="audit-list" v-show="isAuditExpanded">
             <div 
               v-for="record in store.records" 
               :key="record.id" 
               class="audit-row"
               :class="{ 
                 active: store.selectedRecord?.id === record.id,
                 checkpoint: record.is_checkpoint,
                 rollback: record.op_type === 'rollback'
               }"
               @click="selectRecord(record)"
             >
                <div class="ar-left">
                  <n-button
                    class="row-delete"
                    size="tiny"
                    circle
                    quaternary
                    type="error"
                    @click.stop="requestDelete([record.id])"
                    title="删除该条记录"
                  >
                    <template #icon><n-icon><TrashOutline /></n-icon></template>
                  </n-button>
                  <div v-if="isDeleteMode" class="ar-checkbox" @click.stop>
                    <n-checkbox
                      :checked="selectedDeleteIds.includes(record.id)"
                      @update:checked="(v) => toggleDeleteSelection(record.id, v)"
                    />
                  </div>
                </div>
                <div class="ar-time">{{ formatTime(record.ts) }}</div>
                <div class="ar-op">{{ getOpLabel(record.op_type) }}</div>
                <div class="ar-size">{{ formatFileSize(record.payload_size) }}</div>
                
                <!-- Audit Actions (Show on hover/active) -->
                <div class="ar-actions" v-if="store.selectedRecord?.id === record.id">
                   <n-button 
                       size="tiny" 
                       type="default"
                       @click.stop="handleInspect(record)"
                   >
                       查看详情
                   </n-button>
                </div>
             </div>
           </div>
        </div>

      </div>
    </div>
  </div>

  <n-modal
    v-model:show="showDeleteConfirm"
    preset="dialog"
    title="确认删除历史记录"
    :content="deleteConfirmText"
    positive-text="删除"
    negative-text="取消"
    @positive-click="confirmDelete"
    @negative-click="showDeleteConfirm = false"
  />
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { NButton, NIcon, NTooltip, NTag, useMessage, NModal, NCheckbox } from 'naive-ui';
import { RefreshOutline, AlertCircleOutline, ChevronDown, TrashOutline, CloseOutline } from '@vicons/ionicons5';
import { formatFileSize } from '../../utils/format';
import type { VersionSummary } from '../../services/historyService';

const store = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const message = useMessage();

const isAuditExpanded = ref(false); // Default collapsed
const isDeleteMode = ref(false);
const selectedDeleteIds = ref<number[]>([]);
const showDeleteConfirm = ref(false);
const deleteCandidateIds = ref<number[]>([]);

// Layer 1 Logic: Recommended Records
// Criteria: Top 3 recent 'save' or 'checkpoint'
const recommendedRecords = computed(() => {
    return store.records
        .filter(r => ['save', 'checkpoint'].includes(r.op_type) || r.is_checkpoint)
        // Sort desc (already sorted usually, but ensure)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 3);
});

// Watch file change to reset state
watch(() => store.activeFile, () => {
    isAuditExpanded.value = false;
    isDeleteMode.value = false;
    selectedDeleteIds.value = [];
    showDeleteConfirm.value = false;
    deleteCandidateIds.value = [];
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

function selectRecord(record: VersionSummary) {
  store.selectRecord(record);
}

function refresh() {
  if (store.activeFile) {
    store.selectFile(store.activeFile);
  }
}

function toggleDeleteMode() {
  isDeleteMode.value = !isDeleteMode.value;
  if (isDeleteMode.value) {
    isAuditExpanded.value = true;
  }
  if (!isDeleteMode.value) {
    selectedDeleteIds.value = [];
  }
}

function toggleDeleteSelection(id: number, checked: boolean) {
  const curr = selectedDeleteIds.value;
  if (checked) {
    if (!curr.includes(id)) selectedDeleteIds.value = [...curr, id];
  } else {
    selectedDeleteIds.value = curr.filter(x => x !== id);
  }
}

function computeDeletePlan(ids: number[]) {
  if (ids.length === 0) return null;
  const idSet = new Set(ids);
  const affected = store.records.filter(r => idSet.has(r.id));
  if (affected.length === 0) return null;
  const removedBytes = affected.reduce((acc, r) => acc + r.payload_size, 0);
  return {
    removedCount: affected.length,
    removedBytes,
    newest: affected[0],
    oldest: affected[affected.length - 1]
  };
}

const deleteConfirmText = computed(() => {
  const plan = computeDeletePlan(deleteCandidateIds.value);
  if (!plan) return '未找到可删除的记录。';
  return `将删除 ${plan.removedCount} 条记录（约 ${formatFileSize(plan.removedBytes)}，从 ${formatTime(plan.newest.ts)} 到 ${formatTime(plan.oldest.ts)}）。系统会自动修复历史链，确保其余记录可正常还原。此操作不可撤销。`;
});

function requestDelete(ids: number[]) {
  deleteCandidateIds.value = ids;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  try {
    const res = await store.deleteVersions(deleteCandidateIds.value);
    if (res) {
      message.success(`已删除 ${res.removed_count} 条记录（约 ${formatFileSize(res.removed_bytes)}）`);
    } else {
      message.success('已删除历史记录');
    }
  } catch (e) {
    message.error(`删除失败: ${e}`);
  } finally {
    showDeleteConfirm.value = false;
    deleteCandidateIds.value = [];
    selectedDeleteIds.value = [];
    isDeleteMode.value = false;
  }
}

function handleInspect(record: VersionSummary) {
    store.selectRecord(record);
    // @ts-ignore
    store.enterInspectMode();
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
    flex-wrap: wrap;
    justify-content: flex-end;
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

.history-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

/* Recovery Section (Layer 1) */
.recovery-section {
    background: #fff0f0; /* Light red background for emergency feel */
    border: 1px solid #ffd0d0;
    border-radius: 8px;
    padding: 12px;
}

.section-title {
    font-size: 12px;
    font-weight: bold;
    color: #d03050;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.recovery-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.recovery-card {
    background: #fff;
    border: 1px solid #eee;
    border-radius: 6px;
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s;
}

.row-delete {
  flex-shrink: 0;
  margin-right: 6px;
  opacity: 0;
  pointer-events: none;
}

.delete-mode .row-delete,
.recovery-card:hover .row-delete,
.recovery-card.active .row-delete,
.audit-row:hover .row-delete,
.audit-row.active .row-delete {
  opacity: 1;
  pointer-events: auto;
}

.recovery-card:hover {
    border-color: #d03050;
    box-shadow: 0 2px 8px rgba(208, 48, 80, 0.1);
}

.recovery-card.active {
    border-color: #d03050;
    background-color: #fff8f8;
}

.rc-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
}

.rc-reason {
    display: flex;
    align-items: center;
    gap: 8px;
}

.rc-time {
    font-weight: bold;
    color: #333;
    font-size: 13px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.rc-meta {
    font-size: 11px;
    color: #999;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.rc-action {
    /* Ensure action is prominent */
}

/* Audit Section (Layer 2) */
.audit-section {
    border-top: 1px solid #eee;
    padding-top: 8px;
}

.audit-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 4px;
    cursor: pointer;
    color: #666;
    font-size: 12px;
    user-select: none;
}

.audit-header:hover {
    color: #333;
}

.rotated {
    transform: rotate(-90deg);
    transition: transform 0.2s;
}

.audit-list {
    display: flex;
    flex-direction: column;
    gap: 1px; /* Very dense */
    background: #fff;
    border: 1px solid #eee;
    border-radius: 4px;
    overflow: hidden;
}

.audit-row {
    display: flex;
    align-items: center;
    padding: 6px 8px;
    font-size: 11px;
    color: #666;
    cursor: pointer;
    border-bottom: 1px solid #f5f5f5;
    flex-wrap: wrap;
    row-gap: 4px;
    min-width: 0;
}

.ar-left {
  display: flex;
  align-items: center;
  width: 44px;
  flex-shrink: 0;
}

.ar-checkbox {
  margin-left: 4px;
}

.audit-row:hover {
    background: #f9f9f9;
}

.audit-row.active {
    background: #eef9f2;
    color: #333;
}

.ar-time {
    flex: 0 1 120px;
    min-width: 92px;
    max-width: 160px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ar-op {
    flex: 0 1 60px;
    min-width: 52px;
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ar-size {
    flex: 1;
    color: #999;
    min-width: 72px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ar-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    margin-left: auto;
}

@media (max-width: 720px) {
  .ar-time {
    flex-basis: 104px;
    min-width: 84px;
  }

  .ar-op {
    flex-basis: 56px;
    min-width: 48px;
  }
}

@media (max-width: 560px) {
  .audit-row {
    padding: 6px;
  }

  .ar-time {
    flex-basis: 92px;
    min-width: 76px;
  }

  .ar-op {
    flex-basis: 52px;
    min-width: 44px;
  }

  .ar-actions {
    flex-basis: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }
}

@media (max-width: 360px) {
  .audit-row {
    font-size: 10px;
  }

  .ar-left {
    width: 40px;
  }
}
</style>
