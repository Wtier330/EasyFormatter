
import { onMounted, onUnmounted } from 'vue';
import { useAppStore } from '../stores/app';
import { processClipboardData } from '../utils/clipboard-handlers';
import { useNotification } from 'naive-ui';

export function useGlobalPaste() {
  const appStore = useAppStore();
  const notification = useNotification();

  async function handlePaste(e: ClipboardEvent) {
    // 1. Ignore if focus is in an input/textarea/contenteditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('.monaco-editor') // Monaco editor handles its own paste
    ) {
      return;
    }

    // 2. Ignore if no clipboard data
    if (!e.clipboardData) return;

    // 3. Process data
    try {
      const content = await processClipboardData(e.clipboardData);
      
      if (content) {
        e.preventDefault(); // Stop default browser behavior
        
        // Create tab
        const tabName = content.filename 
          ? `粘贴-${content.filename}` 
          : undefined; // Default naming logic in store will handle it
          
        const tab = appStore.createScratchTab(content.text, 'paste');
        if (tabName && content.filename) {
          tab.name = content.filename;
        }
        appStore.activeTabId = tab.id;
        
        notification.success({
          title: '已从剪贴板创建',
          content: content.source === 'file' 
            ? `已加载文件: ${content.filename}` 
            : '已粘贴内容',
          duration: 2000
        });
      }
    } catch (err) {
      console.error('Global paste error:', err);
      // Optional: notify error
    }
  }

  onMounted(() => {
    window.addEventListener('paste', handlePaste);
  });

  onUnmounted(() => {
    window.removeEventListener('paste', handlePaste);
  });
}
