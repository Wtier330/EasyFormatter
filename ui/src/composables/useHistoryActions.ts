import { ref, computed } from 'vue';
import { useHistoryWorkspaceStore } from '../stores/historyWorkspace';
import { useMessage } from 'naive-ui';
import { formatFileSize, formatTime } from '../utils/format';
import type { VersionSummary } from '../services/historyService';

export function useHistoryActions() {
  const store = useHistoryWorkspaceStore();
  const message = useMessage();

  // Delete mode state
  const isDeleteMode = ref(false);
  const selectedDeleteIds = ref<number[]>([]);
  const showDeleteConfirm = ref(false);
  const deleteCandidateIds = ref<number[]>([]);

  // Layer 1 Logic: Recommended Records
  const recommendedRecords = computed(() => {
    return store.records
        .filter(r => ['save', 'checkpoint'].includes(r.op_type) || r.is_checkpoint)
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 3);
  });

  // Layer 2 Logic: Audit Records
  const isAuditExpanded = ref(false);

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
    if (record.is_checkpoint) return 'warning';
    if (record.op_type === 'rollback') return 'error';
    if (record.op_type === 'copy_restore') return 'info';
    return 'default';
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

  function selectRecord(record: VersionSummary) {
    store.selectRecord(record);
  }

  function resetState() {
    isAuditExpanded.value = false;
    isDeleteMode.value = false;
    selectedDeleteIds.value = [];
    showDeleteConfirm.value = false;
    deleteCandidateIds.value = [];
  }

  return {
    recommendedRecords,
    isAuditExpanded,
    selectedDeleteIds,
    showDeleteConfirm,
    deleteConfirmText,
    getOpLabel,
    getOpTagType,
    getRelativeTime,
    refresh,
    toggleDeleteMode,
    toggleDeleteSelection,
    requestDelete,
    confirmDelete,
    handleInspect,
    selectRecord,
    resetState
  };
}