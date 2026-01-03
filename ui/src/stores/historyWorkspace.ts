import { defineStore } from 'pinia';
import { ref } from 'vue';
import { historyService, type FileRecord, type VersionSummary } from '../services/historyService';
import { commands } from '../tauri';

export const useHistoryWorkspaceStore = defineStore('historyWorkspace', () => {
  const mode = ref<'main' | 'history'>('main');
  const files = ref<FileRecord[]>([]);
  const activeFile = ref<FileRecord | null>(null);
  const records = ref<VersionSummary[]>([]);
  const selectedRecord = ref<VersionSummary | null>(null);
  const compareMode = ref(false);
  const compareBaseMode = ref<'latest' | 'previous'>('latest');
  const recordFilterMode = ref<'key' | 'all'>('key');
  const fileFilterMode = ref<'original' | 'all'>('original');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Content for workbench
  const currentContent = ref('');
  const compareContent = ref(''); // Content of selected record for comparison
  let requestSeq = 0;

  // Sidebar State
  const sidebarWidth = ref(250);
  const sidebarState = ref<'EXPANDED' | 'COLLAPSED'>('EXPANDED');
  const isSidebarDragging = ref(false);
  const lastExpandedWidth = ref(250);

  // We can't use useMessage() directly here, so we might need to pass it or handle errors locally
  // For simplicity, we'll store error state

  async function enterHistoryMode() {
    mode.value = 'history';
    await loadFiles();
  }

  function exitHistoryMode() {
    mode.value = 'main';
    // Clear sensitive state but maybe keep files cached?
    // Let's clear selection to reset view
    activeFile.value = null;
    records.value = [];
    selectedRecord.value = null;
    compareMode.value = false;
  }

  async function loadFiles() {
    loading.value = true;
    try {
      files.value = await historyService.listFiles();
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function selectFile(file: FileRecord) {
    if (activeFile.value?.id === file.id) return;
    
    activeFile.value = file;
    selectedRecord.value = null;
    compareMode.value = false;
    records.value = [];
    currentContent.value = '';
    compareBaseMode.value = 'latest';
    
    loading.value = true;
    try {
      // 1. Load Records
      records.value = await historyService.listVersions(file.id);
      
      // 2. Load Current Content (Materialize latest version)
      if (records.value.length > 0) {
          const latest = records.value[0];
          const res = await historyService.materialize(latest.id);
          currentContent.value = res.content;
      } else {
          currentContent.value = "(No history)";
      }
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function selectRecord(record: VersionSummary) {
    if (selectedRecord.value?.id === record.id && compareBaseMode.value === 'latest') {
      // 在 latest 基准下，重复点击同一条不必重复加载
      // 切换基准时会强制刷新
      return;
    }
    
    selectedRecord.value = record;
    compareMode.value = true;
    
    loading.value = true;
    const seq = ++requestSeq;
    try {
      // 1) 选中记录内容作为“对比内容”
      const resSelected = await historyService.materialize(record.id);
      if (seq !== requestSeq) return;
      compareContent.value = resSelected.content;
      
      // 2) 基准内容
      if (compareBaseMode.value === 'previous') {
        const idx = records.value.findIndex(r => r.id === record.id);
        if (idx !== -1 && idx < records.value.length - 1) {
          const prev = records.value[idx + 1];
          const resPrev = await historyService.materialize(prev.id);
          if (seq !== requestSeq) return;
          currentContent.value = resPrev.content;
        } else {
          currentContent.value = '';
        }
      } else {
        // latest
        if (records.value.length > 0) {
          const latest = records.value[0];
          const resLatest = await historyService.materialize(latest.id);
          if (seq !== requestSeq) return;
          currentContent.value = resLatest.content;
        } else {
          currentContent.value = '';
        }
      }
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function setCompareBaseMode(mode: 'latest' | 'previous') {
    if (compareBaseMode.value === mode) return;
    compareBaseMode.value = mode;
    if (selectedRecord.value) {
      await selectRecord(selectedRecord.value);
    }
  }

  async function restoreSelectedVersion() {
      if (!selectedRecord.value || !activeFile.value) return;
      loading.value = true;
      try {
          const res = await historyService.materialize(selectedRecord.value.id);
          // Write to history as rollback
          await historyService.recordCheckpointStub(
              activeFile.value.logical_path, 
              res.content, 
              `rollback_from=${selectedRecord.value.id}`
          );
          
          // Refresh list and content
          // We re-select the file to refresh everything
          // But we need to keep the file reference valid
          const file = activeFile.value;
          activeFile.value = null; // force refresh
          await selectFile(file);
          
          return true;
      } catch (e) {
          error.value = String(e);
          return false;
      } finally {
          loading.value = false;
      }
  }

  async function overwriteRestore(record: VersionSummary) {
      if (!activeFile.value) throw new Error("No active file");
      loading.value = true;
      try {
          // 1. Get content
          const res = await historyService.materialize(record.id);
          // 2. Overwrite file
          await commands.writeText(activeFile.value.logical_path, res.content);
          
          // 3. Update current content view locally
          currentContent.value = res.content;
          
          return true;
      } catch (e) {
          error.value = String(e);
          throw e;
      } finally {
          loading.value = false;
      }
  }

  async function copyRestoreSelectedVersion(targetDir?: string) {
      if (!selectedRecord.value) return;
      loading.value = true;
      try {
          const path = await historyService.copyRestore(selectedRecord.value.id, targetDir);
          return path;
      } catch (e) {
          error.value = String(e);
          return null;
      } finally {
          loading.value = false;
      }
  }

  // Stats & Settings State
  const stats = ref<{
    db_size: number;
    records_count: number;
    file_count: number;
    top_files: [string, number][];
  } | null>(null);

  const filterKeyOperations = ref(true); // Default true

  async function fetchStats() {
      try {
          stats.value = await historyService.getStats();
      } catch (e) {
          console.error(e);
      }
  }

  async function gc(maxDays?: number, maxRecords?: number) {
      loading.value = true;
      try {
          const res = await historyService.gc(maxDays, maxRecords);
          // Refresh
          await fetchStats();
          if (activeFile.value) {
              // Reload records if active
              const fid = activeFile.value.id;
              activeFile.value = null; // force refresh logic to run cleanly if we reused logic
              // Actually better to just call logic manually
              records.value = await historyService.listVersions(fid);
              // Restore activeFile
              activeFile.value = files.value.find(f => f.id === fid) || null;
          }
          return res;
      } catch (e) {
          error.value = String(e);
          throw e;
      } finally {
          loading.value = false;
      }
  }

  return {
    mode,
    files,
    activeFile,
    records,
    selectedRecord,
    compareMode,
    currentContent,
    compareContent,
    loading,
    error,
    stats,
    filterKeyOperations,
    compareBaseMode,
    recordFilterMode,
    fileFilterMode,
    setCompareBaseMode,
    enterHistoryMode,
    exitHistoryMode,
    loadFiles,
    selectFile,
    selectRecord,
    restoreSelectedVersion,
    overwriteRestore,
    copyRestoreSelectedVersion,
    fetchStats,
    gc,
    sidebarWidth,
    sidebarState,
    isSidebarDragging,
    lastExpandedWidth
  };
});
