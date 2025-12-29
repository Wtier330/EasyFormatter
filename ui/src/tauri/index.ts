import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as dialogOpen, save as dialogSave, message } from '@tauri-apps/plugin-dialog';
import { stat, watch } from '@tauri-apps/plugin-fs';

// 重新导出特定命令
export const commands = {
  greet: (name: string) => invoke<string>('greet', { name }),
  
  readText: (path: string) => invoke<string>('read_text', { path }),
  writeText: (path: string, content: string) => invoke<void>('write_text', { path, content }),
  
  // 如果需要，复用 json_apply 进行服务端处理
  jsonApply: (input: string, mode: 'Format' | 'Minify') => 
    invoke<string>('json_apply', { input, mode, options: {} }),

  revealInExplorer: (path: string) => invoke<void>('reveal_in_explorer', { path }),
  
  openDevtools: () => invoke<void>('open_devtools'),
    
  // 前端专用包装器
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
  },

  // 文件系统包装器
  exists: async (path: string) => {
    return await invoke<boolean>('file_exists', { path });
  },
  
  stat: async (path: string) => {
    return await stat(path);
  },

  watchFile: async (path: string, cb: (event: any) => void) => {
    return await watch(path, cb);
  }
};

export const events = {
  onDecryptLog: (callback: (payload: any) => void) => 
    listen('decrypt-log', (event) => callback(event.payload)),
    
  onCloseRequested: (callback: () => void) => 
    listen('tauri://close-requested', callback)
};
