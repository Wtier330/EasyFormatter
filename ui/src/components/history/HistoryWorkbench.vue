<template>
  <div class="history-workbench">
    <CompareBar 
      v-if="compareMode"
      :record="store.selectedRecord"
      :base-record="null"
      :stats="stats"
      :loading="store.loading"
      :current-base-mode="store.compareBaseMode"
      @update:base-mode="store.setCompareBaseMode"
      @close="store.closeCompare"
    >
        <template #extra>
            <n-switch v-model:value="showPathList" size="small">
                <template #checked>列表</template>
                <template #unchecked>列表</template>
            </n-switch>
        </template>
    </CompareBar>
    
    <div class="wb-body">
        <div class="editor-host" ref="container"></div>
        
        <div class="path-list" v-if="compareMode && showPathList">
            <div class="pl-header">变更列表</div>
            <div class="pl-content">
                <div v-if="jsonChanges.length === 0" class="pl-empty">无变更</div>
                <div 
                   v-for="(item, idx) in jsonChanges" 
                   :key="idx" 
                   class="pl-item"
                   @click="jumpToPath(item.path)"
                >
                    <div class="pl-row">
                        <n-tag size="tiny" :type="getOpType(item.op)">{{ item.op }}</n-tag>
                        <span class="pl-path" :title="item.path">{{ item.path }}</span>
                    </div>
                    <div class="pl-val" v-if="item.value !== undefined">
                        {{ formatVal(item.value) }}
                    </div>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as monaco from 'monaco-editor';
import * as Diff from 'diff';
import * as jsonpatch from 'fast-json-patch';
import { NTag, NSwitch } from 'naive-ui';
import { safeParse } from '../../utils/json';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import CompareBar from './CompareBar.vue';

const props = defineProps<{
  currentContent: string;
  compareContent: string;
  compareMode: boolean;
  language?: string;
}>();

const store = useHistoryWorkspaceStore();
const container = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let decorations: string[] = [];

const stats = ref({ added: 0, removed: 0 });
const changeList = ref<{ startLine: number, endLine: number }[]>([]);
const changeIndex = ref(-1);
const showPathList = ref(true);

const jsonChanges = ref<any[]>([]);

onMounted(() => {
  if (container.value) {
    editor = monaco.editor.create(container.value, {
      value: props.compareMode ? props.compareContent : props.currentContent,
      language: props.language || 'json',
      readOnly: true,
      minimap: { enabled: false },
      automaticLayout: true,
      fontSize: 14,
      lineNumbers: 'on',
      theme: 'vs',
      renderWhitespace: 'selection'
    });
    
    // Keybinding
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => navChange(1));
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => navChange(-1));
    
    updateContent();
  }
});

onBeforeUnmount(() => {
  editor?.dispose();
});

watch(() => [props.currentContent, props.compareContent, props.compareMode], () => {
  updateContent();
});

function updateContent() {
  if (!editor) return;

  const targetContent = props.compareMode ? props.compareContent : props.currentContent;
  const currentModel = editor.getModel();
  
  if (currentModel && currentModel.getValue() !== targetContent) {
    editor.setValue(targetContent);
  }

  // Update Decorations if in compare mode
  if (props.compareMode) {
    computeDiff();
    computeJsonDiff();
  } else {
    // Clear decorations
    decorations = editor.deltaDecorations(decorations, []);
    stats.value = { added: 0, removed: 0 };
    changeList.value = [];
    changeIndex.value = -1;
    jsonChanges.value = [];
  }
}

function computeDiff() {
  if (!editor) return;

  const baseText = props.currentContent ?? '';
  const targetText = props.compareContent ?? '';

  const parts = Diff.diffLines(baseText, targetText);
  const changes: { startLine: number, endLine: number }[] = [];

  let targetLine = 1;
  let added = 0;
  let removed = 0;

  const countLines = (value: string) => {
    if (!value) return 0;
    const trimmed = value.endsWith('\n') ? value.slice(0, -1) : value;
    if (!trimmed) return 1;
    return trimmed.split('\n').length;
  };

  for (const part of parts) {
    const lines = countLines(part.value);
    if (part.added) {
      added += lines;
      changes.push({ startLine: targetLine, endLine: targetLine + lines - 1 });
      targetLine += lines;
      continue;
    }
    if (part.removed) {
      removed += lines;
      const anchor = Math.max(1, Math.min(targetLine, editor.getModel()?.getLineCount() ?? 1));
      changes.push({ startLine: anchor, endLine: anchor });
      continue;
    }
    targetLine += lines;
  }

  stats.value = { added, removed };
  changeList.value = changes;
  changeIndex.value = changes.length > 0 ? 0 : -1;

  const decos = changes.map(c => ({
    range: new monaco.Range(c.startLine, 1, c.endLine, 1),
    options: {
      isWholeLine: true,
      className: 'diff-line'
    }
  }));

  decorations = editor.deltaDecorations(decorations, decos);
}

function computeJsonDiff() {
    // Current (Latest) vs Compare (Selected)
    // We want patch: Latest -> Selected? 
    // Or Selected -> Latest?
    // User wants "Selected vs Latest". 
    // Usually means "Show Selected". 
    // Path list should explain "What happened to turn Latest into Selected"?
    // Or "What happened in Selected compared to Latest"?
    // If we use patch(Latest, Selected), we get ops to transform Latest to Selected.
    // e.g. if Latest has {a:1}, Selected has {a:2}. Patch is replace /a value:2.
    // This matches "Selected has modified /a".
    
    const { data: latest } = safeParse(props.currentContent);
    const { data: selected } = safeParse(props.compareContent);
    
    if (latest && selected) {
        jsonChanges.value = jsonpatch.compare(latest, selected);
    } else {
        jsonChanges.value = [];
    }
}

function getOpType(op: string) {
    if (op === 'add') return 'success';
    if (op === 'remove') return 'error';
    if (op === 'replace') return 'warning';
    return 'default';
}

function formatVal(v: any) {
    const s = JSON.stringify(v);
    if (s.length > 20) return s.slice(0, 20) + '...';
    return s;
}

function jumpToPath(path: string) {
    if (!editor) return;

    const segments = path.split('/').filter(Boolean);
    const key = segments[segments.length - 1];
    
    if (!key) return; 
    
    const model = editor.getModel();
    if (!model) return;
    
    const matches = model.findMatches('"' + key + '"', true, false, false, null, true);
    
    if (matches.length > 0) {
        const range = matches[0].range;
        editor.revealRangeInCenter(range);
        editor.setSelection(range);
    }
}

function navChange(dir: number) {
  if (!editor) return;
  if (changeList.value.length === 0) return;

  const next = (() => {
    if (changeIndex.value < 0) return 0;
    const idx = changeIndex.value + dir;
    if (idx < 0) return changeList.value.length - 1;
    if (idx >= changeList.value.length) return 0;
    return idx;
  })();

  changeIndex.value = next;
  const c = changeList.value[next];
  const range = new monaco.Range(c.startLine, 1, c.endLine, 1);
  editor.revealRangeInCenter(range);
  editor.setSelection(range);
}
</script>

<style scoped>
.history-workbench {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.diff-panel {
  padding: 8px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.diff-summary {
  display: flex;
  gap: 8px;
  align-items: center;
}

.diff-desc {
  font-size: 12px;
  color: #666;
}

.wb-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.editor-host {
  flex: 1;
  overflow: hidden;
}

.diff-line {
  background: rgba(24, 160, 88, 0.08);
}

.path-list {
    width: 250px;
    border-left: 1px solid #eee;
    background: #fdfdfd;
    display: flex;
    flex-direction: column;
}

.pl-header {
    padding: 8px;
    font-weight: bold;
    font-size: 12px;
    border-bottom: 1px solid #eee;
    background: #fafafa;
}

.pl-content {
    flex: 1;
    overflow-y: auto;
}

.pl-item {
    padding: 6px 8px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    font-size: 12px;
}

.pl-item:hover {
    background: #f0f5ff;
}

.pl-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
}

.pl-path {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #333;
    font-family: monospace;
}

.pl-val {
    color: #999;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding-left: 4px;
}

.pl-empty {
    padding: 20px;
    text-align: center;
    color: #ccc;
    font-size: 12px;
}

:deep(.diff-line-added) {
  background-color: rgba(40, 167, 69, 0.1);
}

:deep(.diff-gutter-added) {
  background-color: rgba(40, 167, 69, 0.4);
  width: 5px !important;
  margin-left: 5px;
}

:deep(.diff-glyph-removed) {
    background: red;
    width: 0px !important; /* Triangle? */
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid red;
    margin-left: 5px;
}
</style>
