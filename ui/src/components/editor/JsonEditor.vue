<template>
  <div class="editor-wrapper">
    <div class="editor-container" ref="container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as monaco from 'monaco-editor';
import { debounce } from '../../utils/debounce';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { parsePath } from '../../utils/json';
import { findNodeRange } from '../../utils/locator';

const configStore = useConfigStore();
const appStore = useAppStore();

const container = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
const modelMap = new Map<string, monaco.editor.ITextModel>();

function getOrCreateModel(id: string, initialText: string): monaco.editor.ITextModel {
  if (modelMap.has(id)) {
    return modelMap.get(id)!;
  }
  const model = monaco.editor.createModel(initialText, 'json');
  modelMap.set(id, model);
  return model;
}

function createEditor() {
  if (!container.value) return;
  
  // Initialize with active tab or default
  const activeId = appStore.activeTabId;
  const initialText = configStore.rawText || '';
  const model = getOrCreateModel(activeId || 'default', initialText);

  editor = monaco.editor.create(container.value, {
    model,
    language: 'json',
    automaticLayout: true,
    fontSize: appStore.fontSize,
    wordWrap: appStore.wordWrap ? 'on' : 'off',
    minimap: { enabled: false },
    smoothScrolling: false,
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection',
    largeFileOptimizations: true,
    rulers: [],
    theme: 'vs',
    lineNumbers: 'on',
    cursorSmoothCaretAnimation: 'off',
    stickyScroll: { enabled: false },
    accessibilitySupport: 'off',
    formatOnType: false,
    formatOnPaste: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off'
  });

  const applyChange = debounce(() => {
    // Sync current model content to store
    // Only if the current model matches the active tab (sanity check)
    const currentModel = editor?.getModel();
    if (currentModel) {
       const text = currentModel.getValue();
       // Only update configStore if it's the active tab
       // (Though editor only shows active tab, so this is implicit)
       configStore.updateText(text);
       
       // Also update the cache for the active tab immediately
       if (appStore.activeTabId) {
         appStore.updateTabDirtyById(appStore.activeTabId, true, text);
       }
    }
  }, 150);

  editor.onDidChangeModelContent(applyChange);
  editor.onDidChangeCursorPosition((e) => {
    const pos = e.position;
    configStore.cursorPos = { line: pos.lineNumber, col: pos.column };
  });
}

onMounted(() => {
  createEditor();
});

onBeforeUnmount(() => {
  editor?.dispose();
  modelMap.forEach(model => model.dispose());
  modelMap.clear();
});

// 监听活动标签页以切换模型
watch(() => appStore.activeTabId, (newId) => {
  if (!editor || !newId) return;
  
  // 如果模型不存在，尝试从 store 查找内容
  // 我们期望标签页在 openTabs 中，并且如果已加载则有 cachedText
  const tab = appStore.openTabs.find(t => t.id === newId);
  const text = tab?.cachedText ?? configStore.rawText ?? '';
  
  const model = getOrCreateModel(newId, text);
  if (editor.getModel() !== model) {
    editor.setModel(model);
  }
});

// 清理已关闭的标签页
watch(() => appStore.openTabs, (tabs) => {
  const currentIds = new Set(tabs.map(t => t.id));
  for (const [id, model] of modelMap.entries()) {
    if (id !== 'default' && !currentIds.has(id)) {
      model.dispose();
      modelMap.delete(id);
    }
  }
}, { deep: true });

// 响应外部文本变化 (例如：格式化/压缩/加载)
watch(() => configStore.rawText, (text) => {
  const currentModel = editor?.getModel();
  if (currentModel && text !== currentModel.getValue()) {
    // 仅在文本真正改变时更新 (避免循环)
    // 这处理 "格式化", "压缩", 和 "文件加载"
    currentModel.setValue(text);
  }
});

// 字体大小和换行更新
watch(() => appStore.fontSize, (size) => {
  editor?.updateOptions({ fontSize: size });
});
watch(() => appStore.wordWrap, (wrap) => {
  editor?.updateOptions({ wordWrap: wrap ? 'on' : 'off' });
});

// 定位请求：选中并展示
watch(() => configStore.locateRequest, (req) => {
  const currentModel = editor?.getModel();
  if (!req || !editor || !currentModel) return;

  const text = currentModel.getValue();
  // 尝试解析为路径进行精确查找
  const tokens = parsePath(req);
  const rangeInfo = findNodeRange(text, tokens);

  if (rangeInfo) {
    const startPos = currentModel.getPositionAt(rangeInfo.start);
    const endPos = currentModel.getPositionAt(rangeInfo.end);
    const selection = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
    editor.setSelection(selection);
    editor.revealRangeInCenter(selection);
  } else {
    // 降级策略：如果路径查找失败，尝试直接搜索字符串
    // 这保持了对非标准路径或简单搜索的支持
    const matches = currentModel.findMatches(`\"${req}\"`, true, false, false, null, false);
    if (matches.length) {
      const range = matches[0].range;
      editor.setSelection(range);
      editor.revealRangeInCenter(range);
    }
  }
  
  configStore.locateRequest = null;
});

// 粘贴请求：在光标处插入文本
watch(() => configStore.pasteRequest, (text) => {
  if (!text || !editor) return;
  const position = editor.getPosition();
  if (position) {
    editor.executeEdits('paste', [{
      range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
      text: text,
      forceMoveMarkers: true
    }]);
    editor.focus();
  }
  configStore.pasteRequest = null;
});
</script>

<style scoped>
.editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #fff;
}
.editor-container {
  flex: 1;
}
</style>
