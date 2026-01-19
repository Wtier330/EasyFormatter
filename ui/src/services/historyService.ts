type NoiseRecordMode = 'disable' | 'redirect' | 'allow';

const noiseRecordMode: NoiseRecordMode =
  (import.meta.env.VITE_HISTORY_NOISE_RECORD_MODE as NoiseRecordMode) ?? 'disable';

function isTauriRuntime() {
  return typeof window !== 'undefined' && !!((window as any).__TAURI__ || (window as any).__TAURI_INTERNALS__);
}

async function invokeTauri<T>(cmd: string, args?: Record<string, unknown>) {
  if (!isTauriRuntime()) {
    throw new Error('当前运行环境不支持 Tauri API');
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return await invoke<T>(cmd, args);
}

function getNullSinkPath(): string {
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('windows')) return 'NUL';
  }
  return '/dev/null';
}

function isNoiseFilePath(filePath: string): boolean {
  const name = filePath.split(/[/\\]/).pop() || filePath;
  return /^EF_.+\.json$/i.test(name);
}

export interface HistoryHealthCheckResult {
  enabled: boolean;
  db_path: string | null;
  status: string;
}

export interface FileRecord {
  id: number;
  logical_path: string;
  created_at: number;
  updated_at: number;
}

export interface VersionSummary {
  id: number;
  ts: number;
  op_type: string;
  note?: string;
  payload_size: number;
  is_checkpoint: boolean;
}

export interface DebugDbInfo {
    path: string;
    exists: boolean;
    readonly: boolean;
    wal_enabled: boolean;
    file_size: number;
}

export interface HistoryDeleteResult {
  removed_count: number;
  removed_bytes: number;
}

export interface ConvertLegacyResult {
  scanned: number;
  converted: number;
  skipped: number;
}

/**
 * 历史回滚服务 (History Rollback Service)
 * 
 * 职责：
 * - 封装与后端 history 模块的通信
 * - 提供配置回滚、版本查询等能力的接口
 * - 只有在 "部署模式" (deployment mode) 下才可用
 */
export const historyService = {
  /**
   * 检查历史服务健康状态及是否启用
   */
  async healthCheck(): Promise<HistoryHealthCheckResult> {
    try {
      return await invokeTauri<HistoryHealthCheckResult>('history_health_check');
    } catch (e) {
      console.error('History health check failed:', e);
      return { enabled: false, db_path: null, status: String(e) };
    }
  },

  /**
   * 列出有历史记录的文件
   */
  async listFiles(): Promise<FileRecord[]> {
    try {
      return await invokeTauri<FileRecord[]>('history_list_files');
    } catch (e) {
      console.warn('List history files failed (feature might be disabled):', e);
      return [];
    }
  },

  /**
   * 列出指定文件的版本历史
   */
  async listVersions(fileId: number): Promise<VersionSummary[]> {
    try {
      return await invokeTauri<VersionSummary[]>('history_list_versions', { fileId });
    } catch (e) {
      console.warn(`List versions failed for file ${fileId}:`, e);
      return [];
    }
  },

  /**
   * 记录一个版本快照 (Stub)
   * 目前仅记录全量，不做 diff/patch
   * 
   * @param filePath 文件完整路径
   * @param content 文件内容
   * @param note 备注 (可选，如 "rollback_from")
   * @param opType 操作类型 (可选，如 "save", "format", "compress", "transform")
   */
  async recordCheckpointStub(filePath: string, content: string, note?: string, opType?: string): Promise<number> {
    try {
      if (isNoiseFilePath(filePath)) {
        if (noiseRecordMode === 'disable') return 0;
        if (noiseRecordMode === 'redirect') {
          filePath = getNullSinkPath();
        }
      }
      return await invokeTauri<number>('history_record_stub', { filePath, content, note, opType });
    } catch (e) {
      // 失败不应阻断主流程，仅打日志
      console.warn('Record checkpoint failed:', e);
      return 0;
    }
  },
  
  /**
    * 复制还原指定版本到新文件
    * @param versionId 历史版本ID
    * @param targetDir 目标目录 (可选)
    * @returns 新文件路径
    */
   async copyRestore(versionId: number, targetDir?: string): Promise<string> {
     return await invokeTauri<string>('history_copy_restore', { versionId, targetDir });
   },

   /**
    * 获取指定版本的内容 (用于预览/对照)
    * @param versionId 历史版本ID
    */
   async getVersionContent(versionId: number): Promise<string> {
     return await invokeTauri<string>('history_get_version_content', { versionId });
   },

   async materialize(versionId: number): Promise<{ content: string, hash: string }> {
    return await invokeTauri<{ content: string, hash: string }>('history_materialize', { versionId });
  },

  async getStats(): Promise<any> {
    return await invokeTauri('history_stats');
  },

  async gc(maxDays?: number, maxRecords?: number): Promise<{ removed_count: number, removed_bytes: number }> {
    return await invokeTauri('history_gc', { maxDays, maxRecords });
  },

  async deleteVersions(fileId: number, versionIds: number[]): Promise<HistoryDeleteResult> {
    return await invokeTauri<HistoryDeleteResult>('history_delete_versions', { fileId, versionIds });
  },

  async deleteFileHistory(fileId: number): Promise<HistoryDeleteResult> {
    return await invokeTauri<HistoryDeleteResult>('history_delete_file_history', { fileId });
  },

  async convertLegacyCheckpoints(fileId?: number, limit?: number): Promise<ConvertLegacyResult> {
    return await invokeTauri<ConvertLegacyResult>('history_convert_legacy_checkpoints', { fileId, limit });
  },

  /**
   * 获取调试信息
   */
  async getDebugDbInfo(): Promise<DebugDbInfo> {
    return await invokeTauri('history_debug_db_info');
  }
};

// 未来埋点建议：
// 1. 在 ConfigStore.saveFile 成功后调用 recordCheckpointStub
// 2. 在 ConfigStore.loadFile 成功后，若文件已有历史，可静默同步状态
// 3. 在 ConfigStore.format/minify/transform 成功后，可选择性记录（需防抖）
