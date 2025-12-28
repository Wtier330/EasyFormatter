import { defineStore } from 'pinia';
import { ref } from 'vue';
import { commands } from '../tauri';
import { safeParse, formatJson, minifyJson } from '../utils/json';
import { validateConfig } from '../utils/validate';
import { useAppStore } from './app';
import type { ValidationError } from '../types/validation';

export const useConfigStore = defineStore('config', () => {
  const appStore = useAppStore();
  
  const currentFilePath = ref<string | null>(null);
  const rawText = ref('');
  const originalText = ref('');
  const isDirty = ref(false);
  
  // Last Valid Configuration Strategy
  const parsedConfig = ref<any>(null);
  const lastValidConfig = ref<any>(null);
  const parseError = ref<string | null>(null);
  const validationErrors = ref<ValidationError[]>([]);
  const cursorPos = ref({ line: 1, col: 1 });
  const locateRequest = ref<string | null>(null);
  const pasteRequest = ref<string | null>(null);

  // Actions
  async function loadFile(path: string) {
    try {
      const text = await commands.readText(path);
      currentFilePath.value = path;
      rawText.value = text;
      originalText.value = text;
      isDirty.value = false;
      appStore.addRecentFile(path);
      parseAndValidate(text);
    } catch (e) {
      console.error(e);
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
      isDirty.value = false;
    } catch (e) {
      await commands.showError(`保存失败: ${e}`);
    }
  }

  function updateText(text: string) {
    rawText.value = text;
    isDirty.value = text !== originalText.value;
    parseAndValidate(text);
  }
  
  function setActiveBuffer(path: string | null, text: string, dirty: boolean) {
    currentFilePath.value = path;
    rawText.value = text;
    // originalText should be set by the caller (TabsBar) before calling this,
    // or passed as an argument. But since we exposed originalText, 
    // we can rely on caller setting it. 
    // However, for safety, if we are loading a fresh file (dirty=false), we can sync it here.
    if (!dirty) {
        originalText.value = text;
    }
    isDirty.value = dirty;
    parseAndValidate(text);
  }

  function parseAndValidate(text: string) {
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

  return {
    currentFilePath,
    rawText,
    originalText,
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
    format,
    minify,
    setActiveBuffer,
    startMonitoring
  };
});
