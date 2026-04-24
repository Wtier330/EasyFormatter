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
    contextmenu: true
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

  editor.onDidChangeCursorPosition((e) => {
    if (searchVisible.value && matches.value.length > 0) {
      updateCurrentMatchIndexFromCursor(e.position);
    }
  });

  decorationsCollection = editor.createDecorationsCollection([]);

  const applyChange = debounce(() => {
    const currentModel = editor?.getModel();
    if (currentModel) {
      const text = currentModel.getValue();
      configStore.updateText(text, 'editor');

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

  // Register Transform Actions
  const modes: TransformMode[] = ['escape', 'unescape', 'cn2unicode', 'unicode2cn'];
  modes.forEach((mode, index) => {
    editor!.addAction({
      id: `transform-${mode}`,
      label: `文本变换: ${TRANSFORM_MODES[mode]}`,
      contextMenuGroupId: '1_transform',
      contextMenuOrder: index + 1,
      run: () => handleTransform(mode)
    });
  });

  // Watch for external transform requests
  watch(() => configStore.transformRequest, (mode) => {
    if (mode && editor) {
      handleTransform(mode as TransformMode);
      configStore.transformRequest = null;
    }
  });
}

function handleTransform(mode: TransformMode) {
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
    editor.executeEdits('transform', [{
      range: selection,
      text: output,
      forceMoveMarkers: true
    }]);
    editor.focus();
  } else {
    configStore.setTransformResult(output, TRANSFORM_MODES[mode]);
    notification.success({
      title: '变换成功',
      content: '未选择文本，结果已输出到右侧结果区',
      duration: 3000
    });
  }
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

// Tab switching
watch(() => appStore.activeTabId, (newId) => {
  if (!editor || !newId) return;

  const tab = appStore.openTabs.find(t => t.id === newId);
  const text = tab?.cachedText ?? configStore.rawText ?? '';

  const model = getOrCreateModel(newId, text);
  if (editor.getModel() !== model) {
    editor.setModel(model);
  }
});

// Cleanup closed tabs
watch(() => appStore.openTabs, (tabs) => {
  const currentIds = new Set(tabs.map(t => t.id));
  for (const [id, model] of modelMap.entries()) {
    if (id !== 'default' && !currentIds.has(id)) {
      model.dispose();
      modelMap.delete(id);
    }
  }
}, { deep: true });

// External text changes
watch(() => configStore.rawText, (text) => {
  const currentModel = editor?.getModel();
  if (currentModel && text !== currentModel.getValue()) {
    currentModel.setValue(text);

    const sequence = configStore.eol === 'CRLF'
      ? monaco.editor.EndOfLineSequence.CRLF
      : monaco.editor.EndOfLineSequence.LF;
    currentModel.setEOL(sequence);
  }
});

// EOL request
watch(() => configStore.eolRequest, (type) => {
  if (!type || !editor) return;
  const model = editor.getModel();
  if (model) {
    const sequence = type === 'CRLF'
      ? monaco.editor.EndOfLineSequence.CRLF
      : monaco.editor.EndOfLineSequence.LF;
    model.pushEOL(sequence);
  }
  configStore.eolRequest = null;
});

// Font size and word wrap
watch(() => appStore.fontSize, (size) => {
  editor?.updateOptions({ fontSize: size });
});

watch(() => appStore.wordWrap, (wrap) => {
  editor?.updateOptions({ wordWrap: wrap ? 'on' : 'off' });
});

// Locate request
watch(() => configStore.locateRequest, (req) => {
  const currentModel = editor?.getModel();
  if (!req || !editor || !currentModel) return;

  const text = currentModel.getValue();
  const tokens = parsePath(req);
  const rangeInfo = findNodeRange(text, tokens);

  if (rangeInfo) {
    const startPos = currentModel.getPositionAt(rangeInfo.start);
    const endPos = currentModel.getPositionAt(rangeInfo.end);
    const selection = new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column);
    editor.setSelection(selection);
    editor.revealRangeInCenter(selection);
  } else {
    const matches = currentModel.findMatches(`"${req}"`, true, false, false, null, false);
    if (matches.length) {
      const range = matches[0].range;
      editor.setSelection(range);
      editor.revealRangeInCenter(range);
    }
  }

  configStore.locateRequest = null;
});

// Paste request
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

// Editor action requests
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
          : model.getValue();

        try {
          await navigator.clipboard.writeText(text);
          notification.success({ title: '已复制', duration: 1000 });
        } catch {
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
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.trigger('keyboard', 'type', { text });
        }
      } catch {
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
  const selection = editor?.getSelection();
  if (selection && !selection.isEmpty()) {
    const text = editor?.getModel()?.getValueInRange(selection);
    if (text && text.length < 100 && !text.includes('\n')) {
      searchWidgetRef.value?.setFindText(text);
      currentQuery = text;
      onFind(text, currentOptions);
    }
  }
}

function closeSearch() {
  try {
    searchWidgetRef.value?.persistLastSearch?.();
  } catch {}
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

  let searchString = currentQuery;
  let isRegex = currentOptions.regex;

  if (currentOptions.word && !isRegex) {
    const escaped = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    searchString = `\\b${escaped}\\b`;
    isRegex = true;
  }

  try {
    const result = model.findMatches(
      searchString,
      false,
      isRegex,
      currentOptions.case,
      null,
      false
    );
    matches.value = result;
    updateDecorations();
    if (editor.getPosition()) {
      updateCurrentMatchIndexFromCursor(editor.getPosition()!);
    }
  } catch {
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
  if (matches.value.length === 0) {
    currentMatchIndex.value = -1;
    return;
  }

  const insideIndex = matches.value.findIndex(m => m.range.containsPosition(position));
  if (insideIndex !== -1) {
    currentMatchIndex.value = insideIndex;
    updateDecorations();
    return;
  }

  const nextIndex = matches.value.findIndex(m => {
    const start = m.range.getStartPosition();
    return start.lineNumber > position.lineNumber ||
           (start.lineNumber === position.lineNumber && start.column >= position.column);
  });
  currentMatchIndex.value = nextIndex !== -1 ? nextIndex : 0;
  updateDecorations();
}

function onNext() {
  if (matches.value.length === 0) return;
  let nextIndex = currentMatchIndex.value + 1;
  if (nextIndex >= matches.value.length) {
    nextIndex = 0;
  }
  jumpToMatch(nextIndex);
}

function onPrev() {
  if (matches.value.length === 0) return;
  let prevIndex = currentMatchIndex.value - 1;
  if (prevIndex < 0) {
    prevIndex = matches.value.length - 1;
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
    return;
  }
  const match = matches.value[currentMatchIndex.value];
  editor.executeEdits('replace', [{
    range: match.range,
    text,
    forceMoveMarkers: true
  }]);
  updateMatches();
  if (matches.value.length > 0) {
    let nextIdx = currentMatchIndex.value;
    if (nextIdx >= matches.value.length) nextIdx = 0;
    jumpToMatch(nextIdx);
  }
}

function onReplaceAll(text: string) {
  if (!editor || matches.value.length === 0) return;
  const edits = matches.value.map(m => ({
    range: m.range,
    text,
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
  overflow: hidden;
}
.editor-container {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

:global(.find-match-highlight) {
  background-color: rgba(255, 200, 0, 0.3);
}
:global(.find-match-highlight-current) {
  background-color: rgba(255, 150, 0, 0.6);
  border: 1px solid #ff9900;
  box-sizing: border-box;
}
</style>
