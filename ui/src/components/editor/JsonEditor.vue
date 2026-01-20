<template>
  <div class="editor-wrapper">
    <div class="editor-container" ref="container"></div>
    <SearchWidget
      ref="searchWidgetRef"
      v-model:visible="searchVisible"
      :show-replace="showReplace"
      :matches-count="matches.length"
      :current-match-index="currentMatchIndex"
      @find="onFind"
      @next="onNext"
      @prev="onPrev"
      @replace="onReplace"
      @replace-all="onReplaceAll"
      @close="closeSearch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';
import { useNotification } from 'naive-ui';
import { debounce } from '../../utils/debounce';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { parsePath } from '../../utils/json';
import { findNodeRange } from '../../utils/locator';
import { transformText, type TransformMode, TRANSFORM_MODES } from '../../utils/textTransform';
import SearchWidget from './SearchWidget.vue';

const configStore = useConfigStore();
const appStore = useAppStore();
const notification = useNotification();

const container = ref<HTMLElement | null>(null);
const searchWidgetRef = ref<any>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
const modelMap = new Map<string, monaco.editor.ITextModel>();

// Search State
const searchVisible = ref(false);
const showReplace = ref(false);
const matches = shallowRef<monaco.editor.FindMatch[]>([]);
const currentMatchIndex = ref(-1);
let decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;

// Search Options
let currentQuery = '';
let currentOptions = { regex: false, case: false, word: false };

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
  
  // Custom Search Actions
  editor.addAction({
    id: 'custom-find',
    label: 'Find',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
    run: () => openSearch(false)
  });

  editor.addAction({
    id: 'custom-replace',
    label: 'Replace',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
    run: () => openSearch(true)
  });

  editor.onDidFocusEditorText(() => {
    appStore.setActivePanel('editor');
  });

  // Listen to cursor changes to update current match index if user clicks around
  editor.onDidChangeCursorPosition((e) => {
    if (searchVisible.value && matches.value.length > 0) {
      updateCurrentMatchIndexFromCursor(e.position);
    }
  });
  
  decorationsCollection = editor.createDecorationsCollection([]);

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
  window.addEventListener('keydown', handleGlobalKeydown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown, true);
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

// --- Search Logic ---

function openSearch(replace: boolean) {
  searchVisible.value = true;
  showReplace.value = replace;
  // Get current selection to seed search
  const selection = editor?.getSelection();
  if (selection && !selection.isEmpty()) {
    const text = editor?.getModel()?.getValueInRange(selection);
    if (text && text.length < 100 && !text.includes('\n')) {
      // Set text in widget
      searchWidgetRef.value?.setFindText(text);
      currentQuery = text; // Optimistic update
      // Trigger find immediately
      onFind(text, currentOptions);
    }
  }
}

function closeSearch() {
  try {
    searchWidgetRef.value?.persistLastSearch?.();
  } catch {
  }
  searchVisible.value = false;
  matches.value = [];
  currentMatchIndex.value = -1;
  decorationsCollection?.clear();
  editor?.focus();
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (!searchVisible.value) return;
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  closeSearch();
}

function onFind(query: string, options: { regex: boolean, case: boolean, word: boolean }) {
  currentQuery = query;
  currentOptions = options;
  updateMatches();
}

function updateMatches() {
  if (!editor || !currentQuery) {
    matches.value = [];
    currentMatchIndex.value = -1;
    decorationsCollection?.clear();
    return;
  }

  const model = editor.getModel();
  if (!model) return;

  // Monaco findMatches
  // searchString, searchOnlyEditableRange, isRegex, matchCase, wordSeparators, captureMatches
  // wordSeparators: default is null (uses standard)
  // searchOnlyEditableRange: false
  
  // Handling Word Match: Monaco findMatches doesn't have "whole word" boolean directly in this signature?
  // Wait, ITextModel.findMatches signature:
  // (searchString: string, searchOnlyEditableRange: boolean, isRegex: boolean, matchCase: boolean, wordSeparators: string | null, captureMatches: boolean, limitResultCount?: number): FindMatch[]
  // It seems "Whole Word" is usually implemented by regex \b...\b or passing wordSeparators.
  // Actually, standard Monaco FindController uses a more complex logic.
  // But wait, there is another overload or method?
  // Let's use `model.findMatches(query, ...)`
  
  // If word match is ON, and not regex, we can wrap in \b (if query is simple).
  // Or stick to Monaco's behavior.
  // If `wordSeparators` is provided, it might help. 
  // Actually, if matchWholeWord is true, we can simulate it if not regex.
  
  let searchString = currentQuery;
  let isRegex = currentOptions.regex;
  
  if (currentOptions.word && !isRegex) {
    // Escape regex chars in query
    const escaped = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchString = `\\b${escaped}\\b`;
    isRegex = true;
  }

  try {
    const result = model.findMatches(
      searchString,
      false, // searchOnlyEditableRange
      isRegex,
      currentOptions.case,
      null, // wordSeparators
      false // captureMatches
    );
    matches.value = result;
    
    // Update decorations
    updateDecorations();
    
    // Update current index based on cursor
    if (editor.getPosition()) {
       updateCurrentMatchIndexFromCursor(editor.getPosition()!);
    }
  } catch (e) {
    // Regex error probably
    matches.value = [];
    decorationsCollection?.clear();
  }
}

function updateDecorations() {
  if (!decorationsCollection) return;
  
  const newDecorations: monaco.editor.IModelDeltaDecoration[] = matches.value.map((m, i) => {
    const isCurrent = i === currentMatchIndex.value;
    return {
      range: m.range,
      options: {
        isWholeLine: false,
        className: isCurrent ? 'find-match-highlight-current' : 'find-match-highlight',
        overviewRuler: {
          color: isCurrent ? '#ea5c00' : 'rgba(234, 92, 0, 0.5)',
          position: monaco.editor.OverviewRulerLane.Center
        },
        minimap: {
          color: isCurrent ? '#ea5c00' : 'rgba(234, 92, 0, 0.5)',
          position: monaco.editor.MinimapPosition.Inline
        }
      }
    };
  });
  
  decorationsCollection.set(newDecorations);
}

function updateCurrentMatchIndexFromCursor(position: monaco.Position) {
  // Find the match that contains or is after the cursor
  // Simple logic: find first match where range.start >= cursor
  // Or if cursor is inside a match, that's the current one.
  
  if (matches.value.length === 0) {
    currentMatchIndex.value = -1;
    return;
  }

  // Sort matches just in case (Monaco usually returns sorted)
  // matches.value.sort(...) 

  // Check if cursor is inside any match
  const insideIndex = matches.value.findIndex(m => m.range.containsPosition(position));
  if (insideIndex !== -1) {
    currentMatchIndex.value = insideIndex;
    updateDecorations(); // update current highlight
    return;
  }
  
  // Otherwise find the next one
  // If we are before all matches, index 0?
  // If we are after all, index -1? or 0 (wrap)?
  // Usually "current match" implies the one we just found or are about to find.
  // Let's leave it as is until explicit navigation.
}

function onNext() {
  if (matches.value.length === 0) return;
  
  let nextIndex = currentMatchIndex.value + 1;
  if (nextIndex >= matches.value.length) {
    nextIndex = 0; // Wrap
  }
  
  jumpToMatch(nextIndex);
}

function onPrev() {
  if (matches.value.length === 0) return;
  
  let prevIndex = currentMatchIndex.value - 1;
  if (prevIndex < 0) {
    prevIndex = matches.value.length - 1; // Wrap
  }
  
  jumpToMatch(prevIndex);
}

function jumpToMatch(index: number) {
  currentMatchIndex.value = index;
  const match = matches.value[index];
  
  if (editor && match) {
    editor.setSelection(match.range);
    editor.revealRangeInCenter(match.range);
    updateDecorations();
  }
}

function onReplace(text: string) {
  if (!editor || currentMatchIndex.value === -1 || matches.value.length === 0) {
     onNext(); // Try to find one first
     return;
  }
  
  const match = matches.value[currentMatchIndex.value];
  // Ensure the selection matches the match (safety)
  // editor.setSelection(match.range);
  
  editor.executeEdits('replace', [{
    range: match.range,
    text: text,
    forceMoveMarkers: true
  }]);
  
  // After replace, the match is gone/changed. Re-run search.
  // Ideally incremental, but simple re-run is safer.
  updateMatches();
  
  // Move to next (which might be the same index now occupied by next match)
  // If we replaced match at index N, the next match is now at index N (shifted up)
  // So we just call onNext? Or stay at index?
  // Standard behavior: replace and find next.
  // Since we re-ran search, matches changed.
  // The cursor is at the end of replacement.
  // We should find the next match after cursor.
  
  // Force finding next
  // onNext(); 
  // Actually updateMatches calls updateCurrentMatchIndexFromCursor.
  // If cursor is after replacement, it should find the next one.
  // Let's explicitly jump to the next one if available.
  
  if (matches.value.length > 0) {
     let nextIdx = currentMatchIndex.value; // Stay at index (which is now the next item)
     if (nextIdx >= matches.value.length) nextIdx = 0;
     jumpToMatch(nextIdx);
  }
}

function onReplaceAll(text: string) {
  if (!editor || matches.value.length === 0) return;
  
  // Construct all edits
  const edits = matches.value.map(m => ({
    range: m.range,
    text: text,
    forceMoveMarkers: true
  }));
  
  editor.executeEdits('replace-all', edits);
  
  updateMatches();
}

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

/* Decoration Styles (Global because Monaco renders outside scoped) */
:global(.find-match-highlight) {
  background-color: rgba(255, 200, 0, 0.3);
}
:global(.find-match-highlight-current) {
  background-color: rgba(255, 150, 0, 0.6);
  border: 1px solid #ff9900;
  box-sizing: border-box;
}
</style>
