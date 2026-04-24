import { ref } from 'vue';
import { commands } from '../tauri';
import { useAppStore } from '../stores/app';
import { calculateHash } from '../utils/hash';
import { historyService } from '../services/historyService';
import { createDiscreteApi } from 'naive-ui';
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

const EMPTY_HASH = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';

export function useConfigFileOperations() {
  const currentFilePath = ref<string | null>(null);
  const rawText = ref('');
  const originalHash = ref('');
  const isDirty = ref(false);
  const encoding = ref('utf-8');
  const eol = ref<'LF' | 'CRLF'>('LF');
  const eolRequest = ref<'LF' | 'CRLF' | null>(null);

  async function loadFile(
    path: string,
    _updateText: (text: string) => void,
    parseAndValidate: (text: string) => void,
    docHistoryManager: any
  ) {
    try {
      const bytes = await commands.readFile(path);
      let text = '';

      const enc = encoding.value.toLowerCase();
      if (enc === 'utf-8') {
        text = new TextDecoder('utf-8').decode(bytes);
      } else {
        text = iconv.decode(Buffer.from(bytes), enc);
      }

      if (text.includes('\r\n')) {
        eol.value = 'CRLF';
      } else {
        eol.value = 'LF';
      }

      currentFilePath.value = path;
      rawText.value = text;
      originalHash.value = await calculateHash(text);
      isDirty.value = false;
      parseAndValidate(text);
      docHistoryManager.clear();
    } catch (e: unknown) {
      console.error(e);
      const errStr = String(e);
      let isMissing = false;

      if (errStr.includes('os error 2') || errStr.includes('not found') || errStr.includes('no such file')) {
        isMissing = true;
      } else {
        try {
          const exists = await commands.exists(path);
          isMissing = !exists;
        } catch {
          console.error(`[ConfigStore] Error checking file existence`, e);
        }
      }

      if (isMissing) {
        const appStore = useAppStore();
        console.log(`[ConfigStore] File deleted detected: ${path}. UI notified.`);
        appStore.removeRecentFile(path);
        const tab = appStore.openTabs.find((t: any) => t.path === path);
        if (tab) {
          appStore.removeTab(tab.id);
        }
        message.warning('该文件已被删除', { duration: 2500 });
      } else {
        await commands.showError(`无法读取文件: ${path}`);
      }
    }
  }

  async function saveFile(text: string) {
    if (!currentFilePath.value) {
      const path = await commands.saveFile();
      if (!path) return false;
      currentFilePath.value = path;
    }

    try {
      let buffer: Uint8Array;
      const enc = encoding.value.toLowerCase();

      if (enc === 'utf-8') {
        buffer = new TextEncoder().encode(text);
      } else {
        buffer = iconv.encode(text, enc);
      }

      await commands.writeFile(currentFilePath.value, buffer);
      originalHash.value = await calculateHash(text);
      isDirty.value = false;
      await historyService.recordCheckpointStub(currentFilePath.value, text, undefined, 'save');
      return true;
    } catch (e) {
      await commands.showError(`保存失败: ${e}`);
      return false;
    }
  }

  async function setEncoding(enc: string, loadFileFn: typeof loadFile, currentPath: string | null, updateText: (t: string) => void, parseAndValidate: (t: string) => void, docHistoryManager: any) {
    if (encoding.value === enc) return;
    encoding.value = enc;
    if (currentPath) {
      await loadFileFn(currentPath, updateText, parseAndValidate, docHistoryManager);
    }
  }

  function setEol(type: 'LF' | 'CRLF') {
    if (eol.value === type) return;
    eol.value = type;
    eolRequest.value = type;
  }

  function setActiveBuffer(
    path: string | null,
    text: string,
    dirty: boolean,
    hash: string | undefined,
    updateText: (t: string) => void,
    parseAndValidate: (t: string) => void,
    docHistoryManager: any
  ) {
    currentFilePath.value = path;
    rawText.value = text;
    if (hash) {
      originalHash.value = hash;
    } else if (!dirty) {
      calculateHash(text).then(h => {
        if (rawText.value === text) {
          originalHash.value = h;
        }
      });
    } else {
      originalHash.value = EMPTY_HASH;
    }
    isDirty.value = dirty;
    updateText(text);
    parseAndValidate(text);
    docHistoryManager.clear();
  }

  return {
    currentFilePath,
    rawText,
    originalHash,
    isDirty,
    encoding,
    eol,
    eolRequest,
    loadFile,
    saveFile,
    setEncoding,
    setEol,
    setActiveBuffer
  };
}
