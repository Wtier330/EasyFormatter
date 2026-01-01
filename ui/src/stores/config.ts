import { defineStore } from 'pinia';
import { ref, watch, type Ref } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import { commands } from '../tauri';
import { safeParse, formatJson, minifyJson } from '../utils/json';
import { validateConfig } from '../utils/validate';
import { detectWrapper, type WrapperDetection } from '../utils/wrapper';
import { calculateHash } from '../utils/hash';
import { useAppStore } from './app';
import type { ValidationError } from '../types/validation';
import { HistoryManager, type Command } from '../utils/history';
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

const { message } = createDiscreteApi(['message'], {
  messageProviderProps: {
    containerStyle: {
      top: '48px',
      padding: '12px'
    }
  }
});

export const useConfigStore = defineStore('config', () => {
  const appStore = useAppStore();
  
  const currentFilePath = ref<string | null>(null);
  const rawText = ref('');
  const originalHash = ref('');
  const isDirty = ref(false);
  
  // Last Valid Configuration Strategy
  const parsedConfig = ref<any>(null);
  const lastValidConfig = ref<any>(null);
  const parseError = ref<string | null>(null);
  const validationErrors = ref<ValidationError[]>([]);
  const cursorPos = ref({ line: 1, col: 1 });
  const locateRequest = ref<string | null>(null);
  const pasteRequest = ref<string | null>(null);

  // Encoding & EOL
  const encoding = ref('utf-8');
  const eol = ref<'LF' | 'CRLF'>('LF');
  const eolRequest = ref<'LF' | 'CRLF' | null>(null);

  // Text Transform State
  const transformRequest = ref<string | null>(null);
  const transformResult = ref<string | null>(null);
  const transformMode = ref<string | null>(null);
  
  // Transform History
  const historyManager = new HistoryManager(20, 5 * 1024 * 1024);
  const docHistoryManager = new HistoryManager(20, 5 * 1024 * 1024);

  const canUndo = ref(false);
  const canRedo = ref(false);
  const canUndoDocument = ref(false);
  const canRedoDocument = ref(false);

  class UpdateTransformResultCommand implements Command {
    constructor(
      private transformResultRef: Ref<string | null>,
      private transformModeRef: Ref<string | null>,
      private prevResult: string | null,
      private nextResult: string | null,
      private prevMode: string | null,
      private nextMode: string | null
    ) {}

    execute() {
      this.transformResultRef.value = this.nextResult;
      this.transformModeRef.value = this.nextMode;
    }

    undo() {
      this.transformResultRef.value = this.prevResult;
      this.transformModeRef.value = this.prevMode;
    }

    getEstimatedSize() {
      // Estimate size: string length * 2 (UTF-16)
      return (
        (this.prevResult?.length || 0) * 2 + 
        (this.nextResult?.length || 0) * 2 + 
        (this.prevMode?.length || 0) * 2 + 
        (this.nextMode?.length || 0) * 2
      );
    }
  }

  class UpdateDocumentCommand implements Command {
    constructor(
      private updateFn: (text: string) => void,
      private prevText: string,
      private nextText: string
    ) {}

    execute() {
      this.updateFn(this.nextText);
    }

    undo() {
      this.updateFn(this.prevText);
    }

    getEstimatedSize() {
      return (this.prevText.length + this.nextText.length) * 2;
    }
  }

  function setTransformResult(result: string | null, mode: string | null) {
    if (transformResult.value === result && transformMode.value === mode) return;

    const command = new UpdateTransformResultCommand(
      transformResult,
      transformMode,
      transformResult.value,
      result,
      transformMode.value,
      mode
    );

    // Update state
    transformResult.value = result;
    transformMode.value = mode;

    // Record history
    historyManager.push(command);
    updateHistoryState();
  }

  function undoTransform() {
    historyManager.undo();
    updateHistoryState();
  }

  function redoTransform() {
    historyManager.redo();
    updateHistoryState();
  }

  function updateHistoryState() {
    canUndo.value = historyManager.canUndo;
    canRedo.value = historyManager.canRedo;
  }

  function undoDocument() {
    docHistoryManager.undo();
    updateDocumentHistoryState();
  }

  function redoDocument() {
    docHistoryManager.redo();
    updateDocumentHistoryState();
  }

  function updateDocumentHistoryState() {
    canUndoDocument.value = docHistoryManager.canUndo;
    canRedoDocument.value = docHistoryManager.canRedo;
  }
  
  // Editor Action Request (Undo, Redo, etc.)
  const editorActionRequest = ref<'undo' | 'redo' | 'selectAll' | 'cut' | 'copy' | 'paste' | null>(null);

  // Compatible Mode State
  const isCompatibleMode = ref(false);
  const compatibleInfo = ref<WrapperDetection>({ isWrapper: false });

  const EMPTY_HASH = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';

  // Actions
  async function loadFile(path: string) {
    try {
      const bytes = await commands.readFile(path);
      let text = '';
      
      const enc = encoding.value.toLowerCase();
      if (enc === 'utf-8') {
        text = new TextDecoder('utf-8').decode(bytes);
      } else {
        // iconv-lite needs Buffer
        text = iconv.decode(Buffer.from(bytes), enc);
      }

      // Detect EOL
      if (text.includes('\r\n')) {
        eol.value = 'CRLF';
      } else {
        eol.value = 'LF';
      }

      currentFilePath.value = path;
      rawText.value = text;
      originalHash.value = await calculateHash(text);
      isDirty.value = false;
      appStore.addRecentFile(path);
      parseAndValidate(text);

      // Clear history when loading new file
      docHistoryManager.clear();
      updateDocumentHistoryState();
    } catch (e: any) {
      console.error(e);
      
      const errStr = String(e);
      let isMissing = false;

      // 优先根据错误信息判断
      if (errStr.includes('os error 2') || errStr.includes('not found') || errStr.includes('no such file')) {
        isMissing = true;
      } else {
        // 二次确认：检查文件是否存在
        try {
            const exists = await commands.exists(path);
            isMissing = !exists;
        } catch (checkErr) {
            console.error(`[ConfigStore] Error checking file existence`, checkErr);
        }
      }

      if (isMissing) {
          console.log(`[ConfigStore] File deleted detected: ${path}. UI notified.`);
          appStore.removeRecentFile(path);
          
          // Also remove from tabs if open (in case removeRecentFile didn't catch it)
          const tab = appStore.openTabs.find(t => t.path === path);
          if (tab) {
            appStore.removeTab(tab.id);
          }
          
          message.warning('该文件已被删除', { duration: 2500 });
          return;
      }
      
      await commands.showError(`无法读取文件: ${path}`);
    }
  }

  async function saveFile(): Promise<boolean> {
    if (!currentFilePath.value) {
      const path = await commands.saveFile();
      if (!path) return false; // Cancelled
      currentFilePath.value = path;
    }
    
    try {
      let buffer: Uint8Array;
      const enc = encoding.value.toLowerCase();
      
      if (enc === 'utf-8') {
        buffer = new TextEncoder().encode(rawText.value);
      } else {
        buffer = iconv.encode(rawText.value, enc);
      }
      
      await commands.writeFile(currentFilePath.value, buffer);
      originalHash.value = await calculateHash(rawText.value);
      isDirty.value = false;
      return true;
    } catch (e) {
      await commands.showError(`保存失败: ${e}`);
      return false;
    }
  }

  async function setEncoding(enc: string) {
    if (encoding.value === enc) return;
    encoding.value = enc;
    if (currentFilePath.value) {
      await loadFile(currentFilePath.value);
    }
  }

  function setEol(type: 'LF' | 'CRLF') {
    if (eol.value === type) return;
    eol.value = type;
    eolRequest.value = type;
  }

  function internalUpdateText(text: string) {
    rawText.value = text;
    isDirty.value = true;
    parseAndValidate(text);

    const localText = text;
    calculateHash(localText).then(hash => {
      // Prevent out-of-order async hash results from overriding newer edits
      if (rawText.value !== localText) return;
      isDirty.value = hash !== originalHash.value;
    });
  }

  function updateText(text: string, source: 'editor' | 'other' = 'other') {
    if (text === rawText.value) return;

    const command = new UpdateDocumentCommand(
      internalUpdateText,
      rawText.value,
      text
    );

    if (source === 'editor') {
      // Update state immediately
      internalUpdateText(text);
      // Record history (push without re-executing)
      docHistoryManager.push(command);
    } else {
      // Execute via history manager (execute + push)
      docHistoryManager.execute(command);
    }
    updateDocumentHistoryState();
  }
  
  function setActiveBuffer(path: string | null, text: string, dirty: boolean, hash?: string) {
    currentFilePath.value = path;
    rawText.value = text;
    if (hash) {
      originalHash.value = hash;
    } else if (!dirty) {
      // If clean, current text is original, so calc hash
      calculateHash(text).then(h => {
        // Race condition check: ensure we are still on the same content
        if (rawText.value === text) {
          originalHash.value = h;
        }
      });
    } else {
      // Dirty but no hash provided (legacy scratch tab or missing state)
      // Assume original was empty (standard for scratch)
      originalHash.value = EMPTY_HASH;
    }
    isDirty.value = dirty;
    parseAndValidate(text);
    
    // Clear history when switching buffers
    docHistoryManager.clear();
    updateDocumentHistoryState();
  }

  function extractWrapper() {
    if (isCompatibleMode.value && compatibleInfo.value.extracted) {
      updateText(compatibleInfo.value.extracted);
    }
  }

  function parseAndValidate(text: string) {
    // Reset compatible mode
    isCompatibleMode.value = false;
    compatibleInfo.value = { isWrapper: false };

    if (!text.trim()) {
      // Handle empty content (e.g. all tabs closed or new file)
      parseError.value = null;
      parsedConfig.value = null;
      lastValidConfig.value = null; // Explicitly clear tree when input is empty
      validationErrors.value = [];
      return;
    }

    const { data, error } = safeParse(text);
    if (error) {
      // Standard parsing failed, try wrapper detection
      const wrapper = detectWrapper(text);
      if (wrapper.isWrapper && wrapper.extracted) {
        const { data: innerData, error: innerError } = safeParse(wrapper.extracted);
        if (!innerError) {
          // Success! Enter compatible mode
          parseError.value = null;
          parsedConfig.value = innerData;
          lastValidConfig.value = innerData;
          
          isCompatibleMode.value = true;
          compatibleInfo.value = wrapper;
          
          const result = validateConfig(innerData);
          validationErrors.value = result.errors;
          return;
        }
      }

      parseError.value = error;
      // Do NOT update parsedConfig, keep lastValidConfig
    } else {
      parseError.value = null;
      parsedConfig.value = data;
      lastValidConfig.value = data;
      
      // Validate business rules
      const result = validateConfig(data);
      validationErrors.value = result.errors;
    }
  }

  function format() {
    const { data, error } = safeParse(rawText.value);
    if (!error && data) {
      const formatted = formatJson(data, appStore.indentSize);
      if (formatted !== rawText.value) {
        // 格式化改变了文本 -> updateText 将触发脏检查
        updateText(formatted);
      }
    }
  }

  function minify() {
    const { data, error } = safeParse(rawText.value);
    if (!error && data) {
      const minified = minifyJson(data);
      if (minified !== rawText.value) {
        updateText(minified);
      }
    }
  }

  function startMonitoring() {
    setInterval(() => {
        if (appStore.activeTabId) {
           const tab = appStore.openTabs.find(t => t.id === appStore.activeTabId);
           if (tab) {
               if (tab.isDirty !== isDirty.value) {
                   console.warn('Fixed state mismatch for tab', tab.id);
                   tab.isDirty = isDirty.value;
               }
           }
        }
    }, 30000);
  }

  watch([rawText, isDirty], ([text, dirty]) => {
    const id = appStore.activeTabId;
    if (!id) return;
    appStore.updateTabDirtyById(id, dirty, text);
  }, { flush: 'sync' });

  return {
    currentFilePath,
    rawText,
    originalHash,
    isDirty,
    parsedConfig,
    lastValidConfig,
    parseError,
    validationErrors,
    cursorPos,
    locateRequest,
    pasteRequest,
    transformRequest,
    transformResult,
    transformMode,
    setTransformResult,
    undoTransform,
    redoTransform,
    canUndo,
    canRedo,
    undoDocument,
    redoDocument,
    canUndoDocument,
    canRedoDocument,
    encoding,
    eol,
    eolRequest,
    loadFile,
    saveFile,
    setEncoding,
    setEol,
    updateText,
    extractWrapper,
    format,
    minify,
    setActiveBuffer,
    startMonitoring,
    isCompatibleMode,
    compatibleInfo,
    editorActionRequest
  };
});