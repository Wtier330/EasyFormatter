import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref } from 'vue';
import { historyService, type FileRecord, type HistoryDeleteResult, type VersionSummary } from '../services/historyService';
import { commands } from '../tauri';

export const useHistoryWorkspaceStore = defineStore('historyWorkspace', () => {
  const mode = ref<'main' | 'history'>('main');
  const files = ref<FileRecord[]>([]);
  const activeFile = ref<FileRecord | null>(null);
  const records = ref<VersionSummary[]>([]);
  const selectedRecord = ref<VersionSummary | null>(null);
  const compareMode = ref(false);
  const inspectMode = ref(false); // New: True when Overlay is open
  const compareBaseMode = ref<'latest' | 'previous'>('latest');
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Content for workbench
  const currentContent = ref('');
  const currentHash = ref('');
  const compareContent = ref(''); // Content of selected record for comparison
  const compareHash = ref('');
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
    inspectMode.value = false;
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
    inspectMode.value = false;
    records.value = [];
    currentContent.value = '';
    currentHash.value = '';
    compareContent.value = '';
    compareHash.value = '';
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
          currentHash.value = res.hash;
      } else {
          currentContent.value = "(No history)";
          currentHash.value = '';
      }
    } catch (e) {
      error.value = String(e);
    } finally {
      loading.value = false;
    }
  }

  async function selectRecord(record: VersionSummary) {
    // If we are in inspect mode, we allow switching records inside the overlay
    // If not in inspect mode, we just update selection (Preview phase)
    
    if (selectedRecord.value?.id === record.id && compareBaseMode.value === 'latest') {
      return;
    }
    
    selectedRecord.value = record;
    compareMode.value = true; // Still needed for data loading logic
    
    loading.value = true;
    const seq = ++requestSeq;
    try {
      // 1) 选中记录内容作为“对比内容”
      const resSelected = await historyService.materialize(record.id);
      if (seq !== requestSeq) return;
      compareContent.value = resSelected.content;
      compareHash.value = resSelected.hash;
      
      // 2) 基准内容
      if (compareBaseMode.value === 'previous') {
        const idx = records.value.findIndex(r => r.id === record.id);
        if (idx !== -1 && idx < records.value.length - 1) {
          const prev = records.value[idx + 1];
          const resPrev = await historyService.materialize(prev.id);
          if (seq !== requestSeq) return;
          currentContent.value = resPrev.content;
          currentHash.value = resPrev.hash;
        } else {
          currentContent.value = '';
          currentHash.value = '';
        }
      } else {
        // latest
        if (records.value.length > 0) {
          const latest = records.value[0];
          const resLatest = await historyService.materialize(latest.id);
          if (seq !== requestSeq) return;
          currentContent.value = resLatest.content;
          currentHash.value = resLatest.hash;
        } else {
          currentContent.value = '';
          currentHash.value = '';
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

  function enterInspectMode() {
      if (selectedRecord.value) {
          inspectMode.value = true;
      }
  }

  function closeCompare() {
    inspectMode.value = false;
    // We don't clear selectedRecord or compareMode to keep state in sidebar
    // Just close the overlay
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

          await historyService.recordCheckpointStub(
              activeFile.value.logical_path,
              res.content,
              `rollback_from=${record.id}`
          );
          
          const file = activeFile.value;
          activeFile.value = null;
          await selectFile(file);
          
          return true;
      } catch (e) {
          error.value = String(e);
          throw e;
      } finally {
          loading.value = false;
      }
  }

  async function deleteVersions(versionIds: number[]): Promise<HistoryDeleteResult | null> {
      if (!activeFile.value) return null;
      if (versionIds.length === 0) return null;
      loading.value = true;
      try {
          const res = await historyService.deleteVersions(activeFile.value.id, versionIds);

          selectedRecord.value = null;
          compareMode.value = false;
          inspectMode.value = false;

          const file = activeFile.value;
          activeFile.value = null;
          await selectFile(file);
          return res;
      } catch (e) {
          error.value = String(e);
          throw e;
      } finally {
          loading.value = false;
      }
  }

  async function deleteFileHistory(fileId: number): Promise<HistoryDeleteResult | null> {
      loading.value = true;
      try {
          const res = await historyService.deleteFileHistory(fileId);

          if (activeFile.value?.id === fileId) {
              activeFile.value = null;
              records.value = [];
              selectedRecord.value = null;
              compareMode.value = false;
              inspectMode.value = false;
              currentContent.value = '';
              currentHash.value = '';
              compareContent.value = '';
              compareHash.value = '';
          }

          await loadFiles();
          return res;
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
    inspectMode,
    currentContent,
    compareContent,
    currentHash,
    compareHash,
    loading,
    error,
    stats,
    compareBaseMode,
    setCompareBaseMode,
    enterHistoryMode,
    exitHistoryMode,
    loadFiles,
    selectFile,
    selectRecord,
    enterInspectMode,
    closeCompare,
    restoreSelectedVersion,
    overwriteRestore,
    copyRestoreSelectedVersion,
    deleteVersions,
    deleteFileHistory,
    fetchStats,
    gc,
    sidebarWidth,
    sidebarState,
    isSidebarDragging,
    lastExpandedWidth
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useHistoryWorkspaceStore, import.meta.hot));
}
