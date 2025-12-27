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
  const isDirty = ref(false);
  
  // Last Valid Configuration Strategy
  const parsedConfig = ref<any>(null);
  const lastValidConfig = ref<any>(null);
  const parseError = ref<string | null>(null);
  const validationErrors = ref<ValidationError[]>([]);
  const cursorPos = ref({ line: 1, col: 1 });
  const locateRequest = ref<string | null>(null);

  // Actions
  async function loadFile(path: string) {
    try {
      const text = await commands.readText(path);
      currentFilePath.value = path;
      rawText.value = text;
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
    isDirty.value = true;
    parseAndValidate(text);
  }

  function parseAndValidate(text: string) {
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
      const formatted = formatJson(data);
      if (formatted !== rawText.value) {
        rawText.value = formatted;
        isDirty.value = true;
      }
    }
  }

  function minify() {
    const { data, error } = safeParse(rawText.value);
    if (!error && data) {
      const minified = minifyJson(data);
      if (minified !== rawText.value) {
        rawText.value = minified;
        isDirty.value = true;
      }
    }
  }

  return {
    currentFilePath,
    rawText,
    isDirty,
    parsedConfig,
    lastValidConfig,
    parseError,
    validationErrors,
    cursorPos,
    locateRequest,
    loadFile,
    saveFile,
    updateText,
    format,
    minify
  };
});
