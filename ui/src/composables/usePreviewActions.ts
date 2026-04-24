import { ref, computed } from 'vue';
import { useNotification } from 'naive-ui';
import { useConfigStore } from '../stores/config';
import { isTauriRuntime } from '../tauri';

export function usePreviewActions() {
  const configStore = useConfigStore();
  const notification = useNotification();
  const jsonTreeRef = ref<any>(null);

  const hasErrors = computed(() => {
    return !!configStore.parseError || configStore.validationErrors.length > 0;
  });

  function handleKeydown(e: KeyboardEvent) {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Copy (Ctrl+C)
    if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
      const selection = window.getSelection();
      // If there is a text selection, let native copy handle it
      if (selection && selection.toString()) return;

      e.preventDefault();
      if (configStore.transformResult !== null) {
         copyResult();
      } else {
         // In tree mode, copy raw text as fallback
         navigator.clipboard.writeText(configStore.rawText).then(() => {
            notification.success({ title: '已复制', duration: 1000 });
         }).catch(err => {
            notification.error({ title: '复制失败', content: String(err) });
         });
      }
    }

    // Select All (Ctrl+A)
    if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      if (configStore.transformResult !== null) {
         const pre = document.querySelector('.result-content pre');
         if (pre) {
           const range = document.createRange();
           range.selectNodeContents(pre);
           const sel = window.getSelection();
           sel?.removeAllRanges();
           sel?.addRange(range);
         }
      }
    }
  }

  function copyResult() {
    if (configStore.transformResult !== null) {
      const text = configStore.transformResult;
      navigator.clipboard.writeText(text).then(() => {
        notification.success({ title: '已复制变换结果', duration: 1000 });
      }).catch(err => {
        notification.error({ title: '复制失败', content: String(err) });
      });
    }
  }

  function clearResult() {
    configStore.setTransformResult(null, '');
  }

  return {
    jsonTreeRef,
    hasErrors,
    handleKeydown,
    copyResult,
    clearResult
  };
}