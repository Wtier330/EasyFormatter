<template>
  <div class="editor-wrapper">
    <div class="editor-container" ref="container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as monaco from 'monaco-editor';
import { useNotification } from 'naive-ui';
import { debounce } from '../../utils/debounce';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { parsePath } from '../../utils/json';
import { findNodeRange } from '../../utils/locator';
import { transformText, type TransformMode, TRANSFORM_MODES } from '../../utils/textTransform';

const configStore = useConfigStore();
const appStore = useAppStore();
const notification = useNotification();

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
    accessibilitySupport: 'auto',
    formatOnType: false,
    formatOnPaste: false,
    suggestOnTriggerCharacters: false,
    wordBasedSuggestions: 'off',
    contextmenu: true // Enable context menu for actions
  });

  editor.onDidFocusEditorText(() => {
    appStore.setActivePanel('editor');
  });

  const applyChange = debounce(() => {
    // Sync current model content to store
    // Only if the current model matches the active tab (sanity check)
    const currentModel = editor?.getModel();
    if (currentModel) {
       const text = currentModel.getValue();
       // Only update configStore if it's the active tab
       // (Though editor only shows active tab, so this is implicit)
       configStore.updateText(text, 'editor');
       
       // Also update the cache for the active tab immediately
       if (appStore.activeTabId) {
         appStore.updateTabDirtyById(appStore.activeTabId, true, text);
       }
    }
  }, 150);

  editor.onDidChangeModelContent((e) => {
    if (e.isFlush) return;
    applyChange();
  });
  editor.onDidChangeCursorPosition((e) => {
    const pos = e.position;
    configStore.cursorPos = { line: pos.lineNumber, col: pos.column };
  });

  // --- Transform Logic ---
  const handleTransform = (mode: TransformMode) => {
    if (!editor) return;
    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection();
    const hasSelection = selection && !selection.isEmpty();

    let inputText = '';
    if (hasSelection) {
      inputText = model.getValueInRange(selection);
    } else {
      inputText = model.getValue();
    }

    if (!inputText) {
       notification.warning({ title: '没有文本可变换', duration: 2000 });
       return;
    }

    const result = transformText(inputText, mode);

    if (!result.ok) {
      notification.error({ title: '变换失败', content: result.error, duration: 3000 });
      return;
    }

    const output = result.output;

    if (hasSelection) {
      // Replace selection (undoable)
      editor.executeEdits('transform', [{
        range: selection,
        text: output,
        forceMoveMarkers: true
      }]);
      editor.focus();
    } else {
      // Output to Result Area (using history-aware action)
      configStore.setTransformResult(output, TRANSFORM_MODES[mode]);
      notification.success({ 
        title: '变换成功', 
        content: '未选择文本，结果已输出到右侧结果区',
        duration: 3000 
      });
    }
  };

  // Register Context Menu Actions
  const modes: TransformMode[] = ['escape', 'unescape', 'cn2unicode', 'unicode2cn'];
  modes.forEach((mode, index) => {
    editor!.addAction({
      id: `transform-${mode}`,
      label: `文本变换: ${TRANSFORM_MODES[mode]}`,
      contextMenuGroupId: '1_transform', // Group 1 to be near top or separate
      contextMenuOrder: index + 1,
      run: () => handleTransform(mode)
    });
  });

  // Watch for external requests (from Top Bar / Shortcuts)
  watch(() => configStore.transformRequest, (mode) => {
    if (mode && editor) {
      handleTransform(mode as TransformMode);
      configStore.transformRequest = null;
    }
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
      
      // 确保 EOL 模式与 Store 一致 (特别是在文件加载后)
      const sequence = configStore.eol === 'CRLF' 
        ? monaco.editor.EndOfLineSequence.CRLF 
        : monaco.editor.EndOfLineSequence.LF;
      currentModel.setEOL(sequence);
    }
  });

  // EOL 切换请求
  watch(() => configStore.eolRequest, (type) => {
    if (!type || !editor) return;
    const model = editor.getModel();
    if (model) {
      const sequence = type === 'CRLF' 
        ? monaco.editor.EndOfLineSequence.CRLF 
        : monaco.editor.EndOfLineSequence.LF;
      // pushEOL 将变更推入 Undo 栈，支持撤销
      model.pushEOL(sequence);
    }
    configStore.eolRequest = null;
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

// Editor Action Requests (Undo/Redo/SelectAll/Copy/Cut/Paste)
watch(() => configStore.editorActionRequest, async (action) => {
  if (!action || !editor) return;

  switch (action) {
    case 'undo':
      editor.trigger('toolbar', 'undo', null);
      break;
    case 'redo':
      editor.trigger('toolbar', 'redo', null);
      break;
    case 'selectAll':
      editor.setSelection(editor.getModel()?.getFullModelRange() || new monaco.Range(1, 1, 1, 1));
      editor.focus();
      break;
    case 'copy':
      editor.focus();
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (model) {
         const text = (selection && !selection.isEmpty()) 
           ? model.getValueInRange(selection) 
           : model.getValue(); // Copy all if no selection
         
         try {
           await navigator.clipboard.writeText(text);
           notification.success({ title: '已复制', duration: 1000 });
         } catch (e) {
           editor.trigger('toolbar', 'editor.action.clipboardCopyAction', null);
         }
      }
      break;
    case 'cut':
      editor.focus();
      editor.trigger('toolbar', 'editor.action.clipboardCutAction', null);
      break;
    case 'paste':
      editor.focus();
      // Try native clipboard read first
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
           editor.trigger('keyboard', 'type', { text: text });
        }
      } catch (e) {
        // Fallback to editor action (might not work in all browsers due to permissions)
        editor.trigger('toolbar', 'editor.action.clipboardPasteAction', null);
      }
      break;
  }
  
  configStore.editorActionRequest = null;
});
</script>

<style scoped>
.editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #fff;
  overflow: hidden; /* Ensure wrapper doesn't spill */
}
.editor-container {
  flex: 1;
  overflow: hidden; /* Critical for Monaco to size correctly */
  min-height: 0; /* Flexbox nested scrolling fix */
}
</style>