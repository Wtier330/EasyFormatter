import { ref, computed } from 'vue';
import { useHistoryWorkspaceStore } from '../stores/historyWorkspace';
import { formatFileSize } from '../utils/format';
import type { VersionSummary } from '../services/historyService';

export function useHistoryFilters() {
  const store = useHistoryWorkspaceStore();

  const showAll = ref(false);
  const filterType = ref<'all' | 'save' | 'rollback' | 'checkpoint'>('all');
  const minSize = ref(0);

  const filteredRecords = computed(() => {
    if (!store.activeFile) return [];
    let list = store.records;

    if (filterType.value !== 'all') {
      list = list.filter(r => {
        if (filterType.value === 'save') return r.op_type === 'save';
        if (filterType.value === 'rollback') return r.op_type === 'rollback';
        if (filterType.value === 'checkpoint') return r.is_checkpoint;
        return true;
      });
    }

    if (minSize.value > 0) {
      list = list.filter(r => r.payload_size >= minSize.value);
    }

    return list;
  });

  function setFilterType(type: typeof filterType.value) {
    filterType.value = type;
  }

  function setMinSize(bytes: number) {
    minSize.value = bytes;
  }

  function toggleShowAll() {
    showAll.value = !showAll.value;
  }

  function resetFilters() {
    showAll.value = false;
    filterType.value = 'all';
    minSize.value = 0;
  }

  return {
    showAll,
    filterType,
    minSize,
    filteredRecords,
    setFilterType,
    setMinSize,
    toggleShowAll,
    resetFilters
  };
}
