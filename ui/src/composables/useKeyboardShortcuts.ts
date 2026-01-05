import { onMounted, onUnmounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useConfigStore } from '../stores/config';
import { commands } from '../tauri';
import { useNotification } from 'naive-ui';

export function useKeyboardShortcuts(options: { registerListeners?: boolean } = { registerListeners: true }) {
  const appStore = useAppStore();
  const configStore = useConfigStore();
  const notification = useNotification();

  // Helper to detect platform
  const isMac = typeof navigator !== 'undefined' && 
    (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);

  async function handleSave() {
    const success = await configStore.saveFile();
    if (success) {
      notification.success({ title: '已保存', duration: 2000 });
    }
  }

  async function handleOpen() {
    const path = await commands.pickFile();
    const resolvedPath = Array.isArray(path) ? path[0] : path;
    if (!resolvedPath) return;
    const tab = appStore.ensureTab(resolvedPath);
    appStore.activeTabId = tab.id;
    await configStore.loadFile(resolvedPath);
  }

  function handleNew() {
    const tab = appStore.createScratchTab('', 'new');
    appStore.activeTabId = tab.id;
    
    // Optional: Notify user implicitly by focus change or small toast
    // notification.success({
    //     title: '新建成功',
    //     content: `已创建文件: ${tab.name}`,
    //     duration: 1000
    // });
  }

  function onKeyDown(e: KeyboardEvent) {
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key.toLowerCase();
    
    // Save: Ctrl+S / Cmd+S
    if (ctrlOrCmd && key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    // Open: Ctrl+O / Cmd+O
    if (ctrlOrCmd && key === 'o') {
      e.preventDefault();
      handleOpen();
      return;
    }

    // New: Ctrl+N / Cmd+N
    if (ctrlOrCmd && key === 'n') {
      e.preventDefault();
      handleNew();
      return;
    }

    // --- Text Transform Shortcuts ---
    
    // Unescape: Ctrl+Alt+Shift+E / Cmd+Opt+Shift+E
    if (ctrlOrCmd && e.altKey && e.shiftKey && key === 'e') {
      e.preventDefault();
      configStore.transformRequest = 'unescape';
      return;
    }

    // Escape: Ctrl+Alt+E / Cmd+Opt+E
    if (ctrlOrCmd && e.altKey && !e.shiftKey && key === 'e') {
      e.preventDefault();
      configStore.transformRequest = 'escape';
      return;
    }

    // Unicode -> CN: Ctrl+Alt+Shift+U / Cmd+Opt+Shift+U
    if (ctrlOrCmd && e.altKey && e.shiftKey && key === 'u') {
      e.preventDefault();
      configStore.transformRequest = 'unicode2cn';
      return;
    }

    // CN -> Unicode: Ctrl+Alt+U / Cmd+Opt+U
    if (ctrlOrCmd && e.altKey && !e.shiftKey && key === 'u') {
      e.preventDefault();
      configStore.transformRequest = 'cn2unicode';
      return;
    }

    // Undo: Ctrl+Z
    if (ctrlOrCmd && !e.shiftKey && key === 'z') {
      // Check if we are in Editor or Input
      // If active element is monaco editor (which is a textarea inside usually, or contenteditable)
      // Monaco usually stops propagation, but if it doesn't, we should check.
      // Or if focus is on body (lost focus from Preview), we want to undo Preview.
      
      const active = document.activeElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      const isMonaco = active?.closest('.monaco-editor');
      
      // If focused in input/textarea/monaco, let them handle undo
      if (isInput || isMonaco) return;

      e.preventDefault();
      if (configStore.transformResult !== null) {
         if (configStore.canUndo) configStore.undoTransform();
      } else if (configStore.canUndoDocument) {
         configStore.undoDocument();
      }
      return;
    }

    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (ctrlOrCmd && ((!e.shiftKey && key === 'y') || (e.shiftKey && key === 'z'))) {
      const active = document.activeElement;
      const isInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
      const isMonaco = active?.closest('.monaco-editor');
      
      if (isInput || isMonaco) return;

      e.preventDefault();
      if (configStore.transformResult !== null) {
         if (configStore.canRedo) configStore.redoTransform();
      } else if (configStore.canRedoDocument) {
         configStore.redoDocument();
      }
      return;
    }
  }

  if (options.registerListeners) {
    onMounted(() => {
      window.addEventListener('keydown', onKeyDown);
    });

    onUnmounted(() => {
      window.removeEventListener('keydown', onKeyDown);
    });
  }

  return {
    handleSave,
    handleOpen,
    handleNew
  };
}
