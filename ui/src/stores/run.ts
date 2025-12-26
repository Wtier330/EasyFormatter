import { defineStore } from 'pinia';
import { ref } from 'vue';
import { commands, events } from '../tauri';

export const useRunStore = defineStore('run', () => {
  const isRunning = ref(false);
  const logs = ref<string[]>([]);
  
  // Setup listener
  events.onDecryptLog((payload: any) => {
    // payload might be string or object
    const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
    logs.value.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  });

  async function runDecrypt(configJson: string, workingDir: string) {
    if (isRunning.value) return;
    
    isRunning.value = true;
    logs.value = ['=== 开始运行解密任务 ==='];
    
    try {
      await commands.runDecrypt(configJson, workingDir);
    } catch (e) {
      logs.value.push(`Error: ${e}`);
    } finally {
      isRunning.value = false;
      logs.value.push('=== 任务结束 ===');
    }
  }

  return {
    isRunning,
    logs,
    runDecrypt
  };
});
