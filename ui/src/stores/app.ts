import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { RecentFileItem } from '../types/config';
import { commands } from '../tauri';

const STORAGE_KEY = 'easy-formatter-app-state';

export type TabType = 'file' | 'scratch';
export type TabDoc = { 
  id: string; 
  type: TabType;
  path: string | null; 
  name: string; 
  cachedText?: string; 
  originalText?: string; 
  originalHash?: string; // SHA-1 hash of the original content
  isDirty?: boolean;
  createdAt?: number;
  source?: 'paste' | 'new';
};

export const useAppStore = defineStore('app', () => {
  // 从存储加载
  const savedState = localStorage.getItem(STORAGE_KEY);
  let initialState: any = {};
  try {
    initialState = savedState ? JSON.parse(savedState) : {};
  } catch (e) {
    console.error('Failed to parse app state', e);
  }

  const theme = ref<'light' | 'dark' | 'auto'>(initialState.theme || 'auto');
  const sidebarWidth = ref(initialState.sidebarWidth || 220);
  const sidebarState = ref<'EXPANDED' | 'COLLAPSED'>(initialState.sidebarState || 'EXPANDED');
  const lastExpandedWidth = ref(initialState.lastExpandedWidth || 220);
  const isSidebarDragging = ref(false);

  const previewRatio = ref(initialState.previewRatio || 0.45);
  
  const tnsRecents = initialState.recentFiles || [];
  const recentFiles = ref<RecentFileItem[]>(
    tnsRecents.map((item: any) => {
      if (typeof item === 'string') {
        return { path: item, name: item.split(/[/\\]/).pop() || item, lastOpened: Date.now() };
      }
      return item;
    })
  );
  
  const favorites = ref<string[]>(initialState.favorites || []);

  // 新增设置
  const wordWrap = ref(initialState.wordWrap ?? false);
  const indentSize = ref(initialState.indentSize ?? 2);
  const fontSize = ref(initialState.fontSize ?? 14);
  const scratchClosePrompt = ref(initialState.scratchClosePrompt ?? true);
  const lastExportPath = ref<string>(initialState.lastExportPath || '');

  // 标签页
  const openTabs = ref<TabDoc[]>(initialState.openTabs?.map((t: any) => ({
    ...t,
    type: t.type || 'file' // 迁移：如果缺失则默认为 file
  })) || []);
  const activeTabId = ref<string>(initialState.activeTabId || '');
  const activePanel = ref<'editor' | 'preview'>('editor');

  // 展开/折叠触发器 (由 JsonTree 监听)
  const triggerExpand = ref(0);
  const triggerCollapse = ref(0);

  function requestExpand() {
    triggerExpand.value++;
  }

  function requestCollapse() {
    triggerCollapse.value++;
  }

  // 持久化
  watch([theme, sidebarWidth, sidebarState, lastExpandedWidth, previewRatio, recentFiles, favorites, wordWrap, indentSize,
    fontSize,
    scratchClosePrompt, lastExportPath,
    openTabs, activeTabId], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: theme.value,
      sidebarWidth: sidebarWidth.value,
      sidebarState: sidebarState.value,
      lastExpandedWidth: lastExpandedWidth.value,
      previewRatio: previewRatio.value,
      recentFiles: recentFiles.value,
      favorites: favorites.value,
      wordWrap: wordWrap.value,
      indentSize: indentSize.value,
      fontSize: fontSize.value,
      scratchClosePrompt: scratchClosePrompt.value,
      lastExportPath: lastExportPath.value,
      openTabs: openTabs.value.map(t => {
        // Optimization: Do not persist content for file-based tabs to avoid LocalStorage quota limit
        // Scratch tabs need content persistence
        if (t.type === 'file') {
          return { ...t, cachedText: undefined, originalText: undefined, originalHash: undefined };
        }
        return t;
      }),
      activeTabId: activeTabId.value
    }));
  }, { deep: true });

  function addRecentFile(path: string, size?: number, lastModified?: number) {
    if (!path) return;
    const name = path.split(/[/\\]/).pop() || path;
    
    // Remove existing
    const filtered = recentFiles.value.filter(p => p.path !== path);
    
    // Add new to top
    recentFiles.value = [{
      path,
      name,
      size,
      lastModified,
      lastOpened: Date.now()
    }, ...filtered].slice(0, 20); // Keep 20
    console.log(`[AppStore] Added recent file: ${path}, Total: ${recentFiles.value.length}`);
  }

  function removeRecentFile(path: string) {
    const prevLen = recentFiles.value.length;
    recentFiles.value = recentFiles.value.filter(p => p.path !== path);
    if (recentFiles.value.length !== prevLen) {
        console.log(`[AppStore] Removed recent file: ${path}, Remaining: ${recentFiles.value.length}`);
        
        // Also remove from open tabs
        const tab = openTabs.value.find(t => t.path === path);
        if (tab) {
            console.log(`[AppStore] Closing associated tab for: ${path}`);
            removeTab(tab.id);
        }
    }
  }

  function toggleWordWrap() {
    wordWrap.value = !wordWrap.value;
  }

  // 标签页操作
  function ensureTab(path: string, name?: string): TabDoc {
    const exist = openTabs.value.find(t => t.path === path);
    if (exist) return exist;
    const id = path;
    const tab: TabDoc = { 
      id, 
      type: 'file',
      path, 
      name: name || (path.split(/[/\\]/).pop() || 'untitled'), 
      cachedText: undefined, 
      isDirty: false 
    };
    openTabs.value.push(tab);
    return tab;
  }

  function createScratchTab(content: string = '', source: 'new' | 'paste' = 'new'): TabDoc {
    const timestamp = Date.now();
    const count = openTabs.value.filter(t => t.type === 'scratch').length + 1;
    const id = `scratch-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tab: TabDoc = {
      id,
      type: 'scratch',
      path: null,
      name: `临时-${count}`,
      cachedText: content,
      originalText: '', // scratch starts dirty usually if pasted, or empty
      isDirty: !!content,
      createdAt: timestamp,
      source
    };
    
    openTabs.value.push(tab);
    return tab;
  }
  
  function setActive(id: string) {
    activeTabId.value = id;
  }
  
  function setActivePanel(panel: 'editor' | 'preview') {
    activePanel.value = panel;
  }

  function updateTabDirtyByPath(path: string, dirty: boolean, cachedText?: string) {
    const t = openTabs.value.find(x => x.path === path);
    if (t) {
      t.isDirty = dirty;
      if (cachedText !== undefined) t.cachedText = cachedText;
    }
  }
  function updateTabDirtyById(id: string, dirty: boolean, cachedText?: string) {
    const t = openTabs.value.find(x => x.id === id);
    if (t) {
      t.isDirty = dirty;
      if (cachedText !== undefined) t.cachedText = cachedText;
    }
  }
  function removeTab(id: string) {
    const idx = openTabs.value.findIndex(t => t.id === id);
    if (idx === -1) return;

    openTabs.value.splice(idx, 1);
    
    // If closed tab was active, switch to neighbor or empty
    if (activeTabId.value === id) {
      if (openTabs.value.length > 0) {
        // Try next, or prev if at end
        const newIdx = Math.min(idx, openTabs.value.length - 1);
        activeTabId.value = openTabs.value[newIdx].id;
      } else {
        // No tabs left
        activeTabId.value = '';
      }
    }
  }

  async function syncFilesStatus() {
    const updatedList = [...recentFiles.value];
    let changed = false;

    for (let i = 0; i < updatedList.length; i++) {
      const file = updatedList[i];
      try {
        const stats = await commands.stat(file.path);
        // @ts-ignore
        const mtime = stats.mtime ? new Date(stats.mtime).getTime() : Date.now();
        
        // Update only if changed to avoid unnecessary reactivity triggers if we were deeper
        if (file.size !== stats.size || file.lastModified !== mtime) {
            updatedList[i] = {
              ...file,
              size: stats.size,
              lastModified: mtime
            };
            changed = true;
        }
      } catch (e) {
        console.warn(`[AppStore] Sync status failed for ${file.path}`, e);
        // If file not found, we could mark it or leave it. 
        // For now, leave it.
      }
    }
    
    if (changed) {
        recentFiles.value = updatedList;
        console.log('[AppStore] Synced file status');
    }
  }

  return {
    theme,
    sidebarWidth,
    sidebarState,
    lastExpandedWidth,
    isSidebarDragging,
    previewRatio,
    recentFiles,
    favorites,
    wordWrap,
    showRunLog: undefined, // 已移除
    indentSize,
    fontSize,
    scratchClosePrompt,
    lastExportPath,
    triggerExpand,
    triggerCollapse,
    openTabs,
    activeTabId,
    addRecentFile,
    removeRecentFile,
    toggleWordWrap,
    toggleRunLog: undefined, // 已移除
    requestExpand,
    requestCollapse,
    ensureTab,
    createScratchTab,
    setActive,
    activePanel,
    setActivePanel,
    updateTabDirtyByPath,
    updateTabDirtyById,
    removeTab,
    syncFilesStatus
  };
});
