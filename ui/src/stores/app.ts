import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'easy-formatter-app-state';

export const useAppStore = defineStore('app', () => {
  // Load from storage
  const savedState = localStorage.getItem(STORAGE_KEY);
  const initialState = savedState ? JSON.parse(savedState) : {};

  const theme = ref<'light' | 'dark' | 'auto'>(initialState.theme || 'auto');
  const sidebarWidth = ref(initialState.sidebarWidth || 250);
  const previewWidth = ref(initialState.previewWidth || 400);
  const recentFiles = ref<string[]>(initialState.recentFiles || []);
  const favorites = ref<string[]>(initialState.favorites || []);

  // Persist
  watch([theme, sidebarWidth, previewWidth, recentFiles, favorites], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      theme: theme.value,
      sidebarWidth: sidebarWidth.value,
      previewWidth: previewWidth.value,
      recentFiles: recentFiles.value,
      favorites: favorites.value
    }));
  }, { deep: true });

  function addRecentFile(path: string) {
    if (!path) return;
    recentFiles.value = [path, ...recentFiles.value.filter(p => p !== path)].slice(0, 10);
  }

  function addFavorite(path: string) {
    if (!favorites.value.includes(path)) {
      favorites.value.push(path);
    }
  }

  function removeFavorite(path: string) {
    favorites.value = favorites.value.filter(p => p !== path);
  }

  return {
    theme,
    sidebarWidth,
    previewWidth,
    recentFiles,
    favorites,
    addRecentFile,
    addFavorite,
    removeFavorite
  };
});
