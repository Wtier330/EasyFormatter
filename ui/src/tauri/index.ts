import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as dialogOpen, save as dialogSave, message } from '@tauri-apps/plugin-dialog';

// Re-export specific commands
export const commands = {
  greet: (name: string) => invoke<string>('greet', { name }),
  
  readText: (path: string) => invoke<string>('read_text', { path }),
  writeText: (path: string, content: string) => invoke<void>('write_text', { path, content }),
  
  // Reuse json_apply for server-side processing if needed
  jsonApply: (input: string, mode: 'Format' | 'Minify') => 
    invoke<string>('json_apply', { input, mode, options: {} }),

  revealInExplorer: (path: string) => invoke<void>('reveal_in_explorer', { path }),
  
  runDecrypt: (configJson: string, workingDir: string) => 
    invoke<void>('run_decrypt', { configJson, workingDir }),
    
  // Frontend-only wrappers
  pickFile: async () => {
    return await dialogOpen({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json', 'jsonc', 'txt'] }]
    });
  },
  
  saveFile: async (defaultPath?: string) => {
    return await dialogSave({
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
  },
  
  showError: async (msg: string) => {
    await message(msg, { kind: 'error', title: '错误' });
  }
};

export const events = {
  onDecryptLog: (callback: (payload: any) => void) => 
    listen('decrypt-log', (event) => callback(event.payload)),
    
  onCloseRequested: (callback: () => void) => 
    listen('tauri://close-requested', callback)
};
