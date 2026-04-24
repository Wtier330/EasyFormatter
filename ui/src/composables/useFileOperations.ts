import { useNotification } from 'naive-ui';
import { useConfigStore } from '../stores/config';
import { useAppStore } from '../stores/app';
import { commands } from '../tauri';

export function useFileOperations() {
  const configStore = useConfigStore();
  const appStore = useAppStore();
  const notification = useNotification();

  async function openFile() {
    const path = await commands.pickFile();
    const resolvedPath = Array.isArray(path) ? path[0] : path;
    if (!resolvedPath) return;
    await configStore.loadFile(resolvedPath);
  }

  async function saveFile() {
    const success = await configStore.saveFile();
    if (success) {
      notification.success({ title: '已保存', duration: 2000 });
    }
  }

  async function handleExport() {
    try {
      const defaultPath = appStore.lastExportPath || undefined;
      const path = await commands.saveFile(defaultPath);
      if (path) {
        appStore.lastExportPath = path;
        await commands.writeText(path, configStore.rawText);
        notification.success({ title: '导出成功', duration: 2000 });
      }
    } catch (e) {
      notification.error({ title: '导出失败', content: String(e) });
    }
  }

  function handleCopy() {
    configStore.editorActionRequest = 'copy';
  }

  return {
    openFile,
    saveFile,
    handleExport,
    handleCopy
  };
}