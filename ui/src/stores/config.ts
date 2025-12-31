import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { createDiscreteApi } from 'naive-ui';
import { commands } from '../tauri';
import { safeParse, formatJson, minifyJson } from '../utils/json';
import { validateConfig } from '../utils/validate';
import { detectWrapper, type WrapperDetection } from '../utils/wrapper';
import { calculateHash } from '../utils/hash';
import { useAppStore } from './app';
import type { ValidationError } from '../types/validation';

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

  // Compatible Mode State
  const isCompatibleMode = ref(false);
  const compatibleInfo = ref<WrapperDetection>({ isWrapper: false });

  const EMPTY_HASH = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';

  // Actions
  async function loadFile(path: string) {
    try {
      const text = await commands.readText(path);
      currentFilePath.value = path;
      rawText.value = text;
      originalHash.value = await calculateHash(text);
      isDirty.value = false;
      appStore.addRecentFile(path);
      parseAndValidate(text);
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

  async function saveFile() {
    if (!currentFilePath.value) {
      const path = await commands.saveFile();
      if (!path) return; // Cancelled
      currentFilePath.value = path;
    }
    
    try {
      await commands.writeText(currentFilePath.value, rawText.value);
      originalHash.value = await calculateHash(rawText.value);
      isDirty.value = false;
    } catch (e) {
      await commands.showError(`保存失败: ${e}`);
    }
  }

  function updateText(text: string) {
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
    loadFile,
    saveFile,
    updateText,
    extractWrapper,
    format,
    minify,
    setActiveBuffer,
    startMonitoring,
    isCompatibleMode,
    compatibleInfo
  };
});