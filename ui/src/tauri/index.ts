export function isTauriRuntime() {
  return typeof window !== 'undefined' && !!((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持 Tauri API');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args);
}

async function listenTauri(event: string, handler: (event: any) => void) {
  if (!isTauriRuntime()) {
    return () => {};
  }
  const { listen } = await import('@tauri-apps/api/event');
  return await listen(event, handler);
}

async function openDialog(options: any) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件对话框');
  }
  const { open } = await import('@tauri-apps/plugin-dialog');
  return await open(options);
}

async function saveDialog(options: any) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件对话框');
  }
  const { save } = await import('@tauri-apps/plugin-dialog');
  return await save(options);
}

async function showDialogMessage(msg: string, options: any) {
  if (!isTauriRuntime()) {
    throw new Error(msg);
  }
  const { message } = await import('@tauri-apps/plugin-dialog');
  return await message(msg, options);
}

async function fsStat(path: string) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件系统 API');
  }
  const { stat } = await import('@tauri-apps/plugin-fs');
  return await stat(path);
}

async function fsWatch(path: string, cb: (event: any) => void) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件系统 API');
  }
  const { watch } = await import('@tauri-apps/plugin-fs');
  return await watch(path, cb);
}

async function fsReadFile(path: string) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件系统 API');
  }
  const { readFile } = await import('@tauri-apps/plugin-fs');
  return await readFile(path);
}

async function fsWriteFile(path: string, data: Uint8Array) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持文件系统 API');
  }
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  return await writeFile(path, data);
}

// 重新导出特定命令
export const commands = {
  greet: (name: string) => invokeTauri<string>('greet', { name }),
  
  readText: (path: string) => invokeTauri<string>('read_text', { path }),
  readFile: (path: string) => fsReadFile(path),
  writeText: (path: string, content: string) => invokeTauri<void>('write_text', { path, content }),
  writeFile: (path: string, data: Uint8Array) => fsWriteFile(path, data),
  
  // 如果需要，复用 json_apply 进行服务端处理
  jsonApply: (input: string, mode: 'Format' | 'Minify') => 
    invokeTauri<string>('json_apply', { input, mode, options: {} }),

  revealInExplorer: (path: string) => invokeTauri<void>('reveal_in_explorer', { path }),
  
  openDevtools: () => invokeTauri<void>('open_devtools'),
    
  // 前端专用包装器
  pickFile: async () => {
    return await openDialog({
      multiple: false,
      filters: [{ name: 'JSON', extensions: ['json', 'jsonc', 'txt'] }]
    });
  },

  pickFolder: async () => {
    return await openDialog({
      multiple: false,
      directory: true
    });
  },
  
  saveFile: async (defaultPath?: string) => {
    return await saveDialog({
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
  },
  
  showError: async (msg: string) => {
    await showDialogMessage(msg, { kind: 'error', title: '错误' });
  },

  // 文件系统包装器
  exists: async (path: string) => {
    return await invokeTauri<boolean>('file_exists', { path });
  },
  
  stat: async (path: string) => {
    return await fsStat(path);
  },

  watchFile: async (path: string, cb: (event: any) => void) => {
    return await fsWatch(path, cb);
  },

  takePendingOpenPaths: async () => {
    return await invokeTauri<string[]>('take_pending_open_paths');
  }
};

export const events = {
  onDecryptLog: (callback: (payload: any) => void) => 
    listenTauri('decrypt-log', (event) => callback(event.payload)),
    
  onCloseRequested: (callback: () => void) => 
    listenTauri('tauri://close-requested', callback),

  onFileDrop: (callback: (payload: { paths: string[], position: { x: number, y: number } }) => void) => 
    listenTauri('tauri://drag-drop', (event) => callback(event.payload as any)),

  onFileDropHover: (callback: (payload: { paths: string[], position: { x: number, y: number } }) => void) => 
    listenTauri('tauri://drag-enter', (event) => callback(event.payload as any)),

  onFileDropCancelled: (callback: () => void) => 
    listenTauri('tauri://drag-leave', callback),

  onOpenPaths: (callback: (paths: string[]) => void) =>
    listenTauri('open-paths', (event) => callback((event as any).payload as any))
};
