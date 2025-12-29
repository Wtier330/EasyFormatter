import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { RecentFileItem } from '../types/config';

const STORAGE_KEY = 'easy-formatter-app-state';

export type TabType = 'file' | 'scratch';
export type TabDoc = { 
  id: string; 
  type: TabType;
  path: string | null; 
  name: string; 
  cachedText?: string; 
  originalText?: string; 
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
  const previewRatio = ref(initialState.previewRatio || 0.45);
  const favorites = ref<string[]>(initialState.favorites || []);
  
  // 迁移：将 string[] 转换为 RecentFileItem[]
  const rawRecents = initialState.recentFiles || [];
  const recentFiles = ref<RecentFileItem[]>(
    rawRecents.map((item: any) => {
      if (typeof item === 'string') {
        return { path: item, name: item.split(/[/\\]/).pop() || item, lastOpened: Date.now() };
      }
      return item;
    })
  );

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

  // 如果为空则初始化临时标签页
  if (openTabs.value.length === 0) {
    const tab = {
      id: `scratch-${Date.now()}`,
      type: 'scratch' as const,
      path: null,
      name: '未命名',
      cachedText: '',
      originalText: '',
      isDirty: false,
      createdAt: Date.now(),
      source: 'new' as const
    };
    openTabs.value.push(tab);
    activeTabId.value = tab.id;
  }

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
  watch([theme, sidebarWidth, previewRatio, recentFiles, favorites, wordWrap, indentSize,
    fontSize,
    scratchClosePrompt, lastExportPath,
    openTabs, activeTabId], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: theme.value,
      sidebarWidth: sidebarWidth.value,
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
          return { ...t, cachedText: undefined, originalText: undefined };
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
    
    // If closed tab was active, switch to neighbor or create scratch
    if (activeTabId.value === id) {
      if (openTabs.value.length > 0) {
        // Try next, or prev if at end
        const newIdx = Math.min(idx, openTabs.value.length - 1);
        activeTabId.value = openTabs.value[newIdx].id;
      } else {
        // No tabs left, create scratch
        createScratchTab();
        activeTabId.value = openTabs.value[0].id;
      }
    }
  }

  return {
    theme,
    sidebarWidth,
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
    updateTabDirtyByPath,
    updateTabDirtyById,
    removeTab
  };
});
