import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import type { RecentFileItem } from '../types/config';

const STORAGE_KEY = 'easy-formatter-app-state';

export const useAppStore = defineStore('app', () => {
  // Load from storage
  const savedState = localStorage.getItem(STORAGE_KEY);
  let initialState: any = {};
  try {
    initialState = savedState ? JSON.parse(savedState) : {};
  } catch (e) {
    console.error('Failed to parse app state', e);
  }

  const theme = ref<'light' | 'dark' | 'auto'>(initialState.theme || 'auto');
  const sidebarWidth = ref(initialState.sidebarWidth || 220);
  const previewWidth = ref(initialState.previewWidth || 500);
  const favorites = ref<string[]>(initialState.favorites || []);
  
  // Migration: Convert string[] to RecentFileItem[]
  const rawRecents = initialState.recentFiles || [];
  const recentFiles = ref<RecentFileItem[]>(
    rawRecents.map((item: any) => {
      if (typeof item === 'string') {
        return { path: item, name: item.split(/[/\\]/).pop() || item, lastOpened: Date.now() };
      }
      return item;
    })
  );

  // New settings
  const wordWrap = ref(initialState.wordWrap ?? false);
  const showRunLog = ref(initialState.showRunLog ?? false);

  // Persist
  watch([theme, sidebarWidth, previewWidth, recentFiles, favorites, wordWrap, showRunLog], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: theme.value,
      sidebarWidth: sidebarWidth.value,
      previewWidth: previewWidth.value,
      recentFiles: recentFiles.value,
      favorites: favorites.value,
      wordWrap: wordWrap.value,
      showRunLog: showRunLog.value
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
  }

  function removeRecentFile(path: string) {
    recentFiles.value = recentFiles.value.filter(p => p.path !== path);
  }

  function toggleWordWrap() {
    wordWrap.value = !wordWrap.value;
  }

  function toggleRunLog() {
    showRunLog.value = !showRunLog.value;
  }

  return {
    theme,
    sidebarWidth,
    previewWidth,
    recentFiles,
    favorites,
    wordWrap,
    showRunLog,
    addRecentFile,
    removeRecentFile,
    toggleWordWrap,
    toggleRunLog
  };
});
