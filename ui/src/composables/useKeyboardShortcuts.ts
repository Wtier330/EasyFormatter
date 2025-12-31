import { onMounted, onUnmounted, h, ref } from 'vue';
import { useAppStore } from '../stores/app';
import { useConfigStore } from '../stores/config';
import { commands } from '../tauri';
import { useDialog, useNotification, NInput } from 'naive-ui';

export function useKeyboardShortcuts() {
  const appStore = useAppStore();
  const configStore = useConfigStore();
  const dialog = useDialog();
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
    if (path) {
      await configStore.loadFile(path);
    }
  }

  function handleNew() {
    // YYYYMMDDHHmmss
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
      
    const defaultName = `未命名-${timestamp}`;
    const fileName = ref(defaultName);

    dialog.create({
      title: '新建文件',
      content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 12px;' }, [
        h('div', { style: 'color: #666; font-size: 12px;' }, '请输入文件名：'),
        h(NInput, {
          value: fileName.value,
          placeholder: '文件名',
          autofocus: true,
          onUpdateValue: (v) => fileName.value = v
        })
      ]),
      positiveText: '创建',
      negativeText: '取消',
      onPositiveClick: () => {
        const name = fileName.value.trim() || defaultName;
        const tab = appStore.createScratchTab('', 'new');
        tab.name = name;
        appStore.activeTabId = tab.id;
        
        notification.success({
            title: '新建成功',
            content: `已创建文件: ${name}`,
            duration: 3000
        });
        return true;
      }
    });
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
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown);
  });
}
