﻿import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { useAppStore } from '../stores/app';
import { useConfigStore } from '../stores/config';
import { analyzeContent } from '../utils/contentAnalysis';

export function useFileDrop() {
  const message = useMessage();
  const appStore = useAppStore();
  const configStore = useConfigStore();

  const isDragging = ref(false);
  let unlistenDrop: (() => void) | undefined;
  let unlistenHover: (() => void) | undefined;
  let unlistenCancel: (() => void) | undefined;

  async function openPaths(paths: string[]) {
    const normalized = Array.isArray(paths) ? paths.filter(Boolean) : [];
    if (normalized.length === 0) return;

    let lastPath = '';
    for (const path of normalized) {
      const name = path.split(/[/\\]/).pop() || path;
      appStore.ensureTab(path, name);
      appStore.addRecentFile(path);
      lastPath = path;
    }

    if (!lastPath) return;
    const tab = appStore.openTabs.find(t => t.path === lastPath);
    if (tab) {
      appStore.setActive(tab.id);
    }
    await configStore.loadFile(lastPath);
    const analysis = analyzeContent(configStore.rawText);
    if (analysis.type === 'jsonp') {
      configStore.updateText(analysis.content);
      message.info('已自动提�?JSONP 内容');
    }
  }

  async function setupFileDrop() {
    const { events, commands } = await import('../tauri');

    unlistenHover = await events.onFileDropHover(() => {
      isDragging.value = true;
    });

    unlistenCancel = await events.onFileDropCancelled(() => {
      isDragging.value = false;
    });

    unlistenDrop = await events.onFileDrop(async (payload) => {
      isDragging.value = false;
      const paths = Array.isArray(payload) ? payload : (payload as any).paths || [];
      if (!paths || paths.length === 0) return;

      let addedCount = 0;
      let lastSuccessPath = '';

      for (const path of paths) {
        try {
          const stats = await commands.stat(path);
          if (stats.size > 10 * 1024 * 1024) {
            message.warning(`文件 ${path} 较大...`);
          }

          let content = '';
          try {
            content = await commands.readText(path);
          } catch (readErr) {
            message.error(`无法读取文件 ${path}: ${readErr}`);
            continue;
          }

          analyzeContent(content);
          // @ts-ignore
          const mtime = stats.mtime ? new Date(stats.mtime).getTime() : Date.now();
          appStore.addRecentFile(path, stats.size, mtime);
          addedCount++;
          lastSuccessPath = path;
          const name = path.split(/[/\\]/).pop() || path;
          appStore.ensureTab(path, name);
        } catch (e) {
          console.error(e);
        }
      }

      if (addedCount > 0) {
        message.success(`已导�?${addedCount} 个文件`);
        if (lastSuccessPath) {
          const tab = appStore.openTabs.find(t => t.path === lastSuccessPath);
          if (tab) {
            appStore.setActive(tab.id);
            await configStore.loadFile(lastSuccessPath);
            const currentText = configStore.rawText;
            const analysis = analyzeContent(currentText);
            if (analysis.type === 'jsonp') {
              configStore.updateText(analysis.content);
              message.info('已自动提�?JSONP 内容');
            }
          }
        }
      }
    });
  }

  function cleanupFileDrop() {
    if (unlistenDrop) unlistenDrop();
    if (unlistenHover) unlistenHover();
    if (unlistenCancel) unlistenCancel();
  }

  return {
    isDragging,
    openPaths,
    setupFileDrop,
    cleanupFileDrop
  };
}
