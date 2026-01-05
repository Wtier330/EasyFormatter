<template>
  <div class="history-viewer-wrapper">
    <div class="viewer-statusbar">
      <div class="sb-left">
        <div class="sb-title" v-if="record">
          {{ `${getOpLabel(record.op_type)} · ${getRelativeTime(record.ts)}` }}
        </div>
        <div class="sb-title muted" v-else>预览模式：最新版本</div>
      </div>

      <div class="sb-center">
        <n-tooltip v-if="contentTypeLabel">
          <template #trigger>
            <n-tag size="small" :bordered="false" class="sb-tag">{{ contentTypeLabel }}</n-tag>
          </template>
          {{ contentTypeLabel }}
        </n-tooltip>

        <n-tooltip v-if="record">
          <template #trigger>
            <n-tag size="small" :bordered="false" class="sb-tag mono">{{ formatSize(record.payload_size) }}</n-tag>
          </template>
          文件大小：{{ formatSize(record.payload_size) }}
        </n-tooltip>

        <n-tooltip v-if="verificationStatusLabel">
          <template #trigger>
            <n-tag
              size="small"
              :bordered="false"
              class="sb-tag"
              :type="verificationStatusTagType"
            >
              {{ verificationStatusLabel }}
            </n-tag>
          </template>
          {{ verificationStatusLabel }}
        </n-tooltip>
      </div>

      <div class="sb-right">
        <n-button
          size="small"
          type="default"
          secondary
          :disabled="!record"
          @click="handleCopyRestore"
        >
          <template #icon><n-icon><CopyOutline /></n-icon></template>
          复制还原
        </n-button>

        <n-popconfirm
          :show-icon="false"
          :positive-button-props="{ type: 'error' }"
          positive-text="确定"
          negative-text="取消"
          @positive-click="handleRollback"
        >
          <template #trigger>
            <n-button
              size="small"
              type="default"
              secondary
              :disabled="!record"
            >
              <template #icon><n-icon><ArrowUndoOutline /></n-icon></template>
              回滚
            </n-button>
          </template>
          这会覆盖原文件内容，是否继续？
        </n-popconfirm>
      </div>
    </div>

    <div class="viewer-container" ref="container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as monaco from 'monaco-editor';
import { NButton, NIcon, NPopconfirm, NTag, NTooltip, useMessage } from 'naive-ui';
import { ArrowUndoOutline, CopyOutline } from '@vicons/ionicons5';
import { useAppStore } from '../../stores/app';
import { historyService, type VersionSummary } from '../../services/historyService';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';

const props = defineProps<{
  content: string;
  record?: VersionSummary | null;
  language?: string;
  hash?: string;
}>();

const appStore = useAppStore();
const historyStore = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const configStore = useConfigStore();
const message = useMessage();
const container = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const calculatedHash = ref('');
const isVerifying = ref(false);

async function sha256Hex(text: string) {
  const cryptoAny = globalThis.crypto as Crypto | undefined;
  if (!cryptoAny?.subtle) return null;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await cryptoAny.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const verificationStatus = computed(() => {
  if (!props.hash) return 'none';
  if (isVerifying.value) return 'pending';
  if (!calculatedHash.value) return 'pending';
  return calculatedHash.value === props.hash ? 'ok' : 'fail';
});

const verificationStatusLabel = computed(() => {
  if (!props.hash) return null;
  if (verificationStatus.value === 'pending') return '校验中';
  if (verificationStatus.value === 'ok') return '数据一致';
  return '校验失败';
});

const verificationStatusTagType = computed(() => {
  if (!props.hash) return 'default';
  if (verificationStatus.value === 'pending') return 'default';
  if (verificationStatus.value === 'ok') return 'success';
  return 'error';
});

watch(
  () => [props.content, props.hash] as const,
  async ([content]) => {
    if (!props.hash) {
      calculatedHash.value = '';
      isVerifying.value = false;
      return;
    }
    isVerifying.value = true;
    try {
      const hex = await sha256Hex(content);
      calculatedHash.value = hex ?? '';
    } finally {
      isVerifying.value = false;
    }
  },
  { immediate: true }
);

const contentType = computed(() => {
  if (!props.record) return 'unknown';

  const op = props.record.op_type;
  if (op === 'compress') return 'compressed';
  if (op === 'format') return 'formatted';

  const text = props.content;
  if (!text) return 'unknown';

  const lines = text.split('\n').length;
  const length = text.length;

  if (lines === 1 && length > 200) return 'compressed';
  if (lines > 5) return 'formatted';

  return 'raw';
});

const contentTypeLabel = computed(() => {
  switch (contentType.value) {
    case 'compressed':
      return '压缩版本';
    case 'formatted':
      return '格式化版本';
    case 'raw':
      return '原始内容';
    default:
      return null;
  }
});

function getRelativeTime(ts: number) {
  const now = Date.now() / 1000;
  const diff = now - ts;

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}天前`;
  return new Date(ts * 1000).toLocaleDateString();
}

function getOpLabel(op: string) {
  const map: Record<string, string> = {
    save: '保存',
    compress: '压缩',
    format: '格式化',
    escape: '转义',
    unescape: '去转义',
    unicode: 'Unicode',
    rollback: '回滚',
    copy_restore: '复制还原'
  };
  return map[op] || op;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function handleCopyRestore() {
  if (!props.record) return;
  try {
    const path = await historyService.copyRestore(props.record.id);
    message.success(`已复制还原到: ${path}`);

    try {
      const stats = await commands.stat(path);
      const mtimeRaw = (stats as { mtime?: unknown }).mtime;
      const mtime = mtimeRaw ? new Date(mtimeRaw as any).getTime() : Date.now();
      appStore.addRecentFile(path, stats.size, mtime);
    } catch {
      appStore.addRecentFile(path, 0, Date.now());
    }

    layoutStore.setActivePanel('files');
    const name = path.split(/[/\\]/).pop() || path;
    const tab = appStore.ensureTab(path, name);
    appStore.setActive(tab.id);
    await configStore.loadFile(path);
  } catch (e) {
    message.error(`复制还原失败: ${e}`);
  }
}

async function handleRollback() {
  if (!props.record) return;
  try {
    await historyStore.overwriteRestore(props.record);
    message.success('回滚成功');
  } catch (e) {
    message.error(`回滚失败: ${e}`);
  }
}

onMounted(() => {
  if (!container.value) return;

  editor = monaco.editor.create(container.value, {
    value: props.content,
    language: props.language || 'json',
    readOnly: true,
    automaticLayout: true,
    fontSize: appStore.fontSize,
    wordWrap: getWordWrapSetting(),
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    theme: 'vs',
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    domReadOnly: true,
    folding: true,
    foldingStrategy: 'indentation'
  });
});

function getWordWrapSetting() {
  if (contentType.value === 'compressed') return 'on';
  return appStore.wordWrap ? 'on' : 'off';
}

watch(() => props.content, (newVal) => {
  if (editor) {
    const model = editor.getModel();
    if (model && model.getValue() !== newVal) {
      editor.setValue(newVal);
      editor.setScrollTop(0);
    }
    editor.updateOptions({ wordWrap: getWordWrapSetting() });
  }
});

watch(() => props.language, (lang) => {
  if (!editor) return;
  const model = editor.getModel();
  if (!model) return;
  monaco.editor.setModelLanguage(model, lang || 'json');
});

watch(() => props.record, () => {
  editor?.updateOptions({ wordWrap: getWordWrapSetting() });
});

watch(() => appStore.fontSize, (size) => {
  editor?.updateOptions({ fontSize: size });
});

watch(() => appStore.wordWrap, (_wrap) => {
  editor?.updateOptions({ wordWrap: getWordWrapSetting() });
});

onBeforeUnmount(() => {
  editor?.dispose();
});
</script>

<style scoped>
.history-viewer-wrapper {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background-color: #fcfcfc;
}

.viewer-statusbar {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  background: #f9f9f9;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  user-select: none;
}

.sb-left {
  min-width: 180px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.sb-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}

.sb-title.muted {
  font-weight: 500;
  color: #999;
}

.sb-center {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.sb-tag {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sb-tag.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
}

.sb-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-container {
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
</style>
