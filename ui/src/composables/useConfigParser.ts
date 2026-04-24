import { computed } from 'vue';
import { useConfigStore } from '../stores/config';
import { useAppStore } from '../stores/app';
import { safeParse, formatJson } from '../utils/json';
import { validateConfig } from '../utils/validate';
import { detectWrapper } from '../utils/wrapper';
import { historyService } from '../services/historyService';

export function useConfigParser() {
  const configStore = useConfigStore();
  const appStore = useAppStore();

  function parseAndValidate(text: string) {
    configStore.parseError = null;
    configStore.validationErrors = [];

    if (!text.trim()) {
      configStore.parsedConfig = null;
      configStore.lastValidConfig = null;
      configStore.validationErrors = [];
      return;
    }

    const { data, error } = safeParse(text);
    if (error) {
      configStore.parseError = error;

      const wrapper = detectWrapper(text);
      if (wrapper.isWrapper && wrapper.extracted) {
        const { data: innerData, error: innerError } = safeParse(wrapper.extracted);
        if (!innerError) {
          configStore.parsedConfig = innerData;
          configStore.lastValidConfig = innerData;
          configStore.compatibleInfo = wrapper;

          const result = validateConfig(innerData);
          configStore.validationErrors = result.errors;
          configStore.isCompatibleMode = true;
          return;
        }
      }

      configStore.lastValidConfig = data;
      return;
    }

    configStore.parsedConfig = data;
    configStore.lastValidConfig = data;

    const result = validateConfig(data);
    configStore.validationErrors = result.errors;
  }

  async function format() {
    const { data, error } = safeParse(configStore.rawText);
    if (!error && data) {
      const formatted = formatJson(data, appStore.indentSize);
      if (formatted !== configStore.rawText) {
        configStore.updateText(formatted);
        if (configStore.currentFilePath) {
          await historyService.recordCheckpointStub(configStore.currentFilePath, formatted, undefined, 'format');
        }
      }
    }
  }

  async function minify() {
    const { data, error } = safeParse(configStore.rawText);
    if (!error && data) {
      const minified = JSON.stringify(data);
      if (minified !== configStore.rawText) {
        configStore.updateText(minified);
        if (configStore.currentFilePath) {
          await historyService.recordCheckpointStub(configStore.currentFilePath, minified, undefined, 'compress');
        }
      }
    }
  }

  function extractWrapper() {
    if (configStore.isCompatibleMode && configStore.compatibleInfo?.extracted) {
      configStore.updateText(configStore.compatibleInfo.extracted);
    }
  }

  function isCompatibleMode() {
    return computed(() => configStore.isCompatibleMode);
  }

  return {
    parseAndValidate,
    format,
    minify,
    extractWrapper,
    isCompatibleMode
  };
}
