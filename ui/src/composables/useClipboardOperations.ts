import { computed } from 'vue';
import { useNotification } from 'naive-ui';
import { useConfigStore } from '../stores/config';
import { useAppStore } from '../stores/app';
import { useClipboardPermission } from './useClipboardPermission';

export function useClipboardOperations() {
  const configStore = useConfigStore();
  const appStore = useAppStore();
  const notification = useNotification();

  const {
    readClipboardTextInteractive,
    isMac,
    ctrlOrCmd,
    clipboardTipBase
  } = useClipboardPermission();

  const openFileTitle = computed(() => `打开文件 (${ctrlOrCmd}+O)`);
  const saveFileTitle = computed(() => `保存文件 (${ctrlOrCmd}+S)`);
  const clipboardTipForNew = computed(() => `新粘：${clipboardTipBase.value}`);
  const clipboardTipForPaste = computed(() => `粘贴 (${ctrlOrCmd}+V)：${clipboardTipBase.value}`);

  async function createFromClipboard() {
    const text = await readClipboardTextInteractive('new');
    if (text === null) return;
    if (!text) {
      notification.warning({ title: '剪贴板为空', duration: 2000 });
      return;
    }
    const tab = appStore.createScratchTab(text, 'paste');
    appStore.activeTabId = tab.id;
  }

  async function handlePaste() {
    const text = await readClipboardTextInteractive('paste');
    if (text === null) return;
    if (text) {
      configStore.pasteRequest = text;
    } else {
      notification.warning({ title: '剪贴板为空', duration: 1000 });
    }
  }

  return {
    createFromClipboard,
    handlePaste,
    openFileTitle,
    saveFileTitle,
    clipboardTipForNew,
    clipboardTipForPaste,
    isMac,
    ctrlOrCmd
  };
}