import { useHistoryWorkspaceStore } from '../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../stores/sidebarLayout';

export function useGlobalKeydown() {
  const historyWorkspaceStore = useHistoryWorkspaceStore();
  const layoutStore = useSidebarLayoutStore();

  function isDrawerVisible() {
    try {
      return !!(layoutStore as any)?.drawerVisible;
    } catch {
      return false;
    }
  }

  function onGlobalKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return;

    if (historyWorkspaceStore.inspectMode) {
      (historyWorkspaceStore as any).closeCompare?.();
      return;
    }
    if (isDrawerVisible()) {
      layoutStore.closeRightDrawer();
    }
  }

  function setupGlobalKeydown() {
    window.addEventListener('keydown', onGlobalKeydown);
  }

  function cleanupGlobalKeydown() {
    window.removeEventListener('keydown', onGlobalKeydown);
  }

  return {
    onGlobalKeydown,
    setupGlobalKeydown,
    cleanupGlobalKeydown
  };
}