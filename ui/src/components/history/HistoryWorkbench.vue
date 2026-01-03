<template>
  <div class="history-workbench">
    <CompareBar 
      v-if="compareMode"
      :record="store.selectedRecord"
      :base-record="null"
      :stats="stats"
      :loading="store.loading"
      :current-base-mode="store.compareBaseMode"
      :change-index="changeIndex"
      :total-changes="changeList.length"
      @update:base-mode="store.setCompareBaseMode"
      @nav="navChange"
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
import { NTag, NButtonGroup, NButton, NIcon, NDivider, NSwitch } from 'naive-ui';
import { ChevronUp, ChevronDown } from '@vicons/ionicons5';
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
    // Simple logic: Find key in text. 
    // Better: Use source map / AST. But we don't have it easily.
    // Fallback: Search for the key string (last segment of path).
    
    const segments = path.split('/').filter(Boolean);
    const key = segments[segments.length - 1];
    
    if (!key) return; // Root?
    
    const model = editor.getModel();
    if (!model) return;
    
    // Naive search: find matches of key
    const matches = model.findMatches('"' + key + '"', true, false, false, null, true);
    // Or index? If array path /0.
    
    if (matches.length > 0) {
        // Just jump to first match for now. 
        // Real implementation needs robust JSON Path locator.
        const range = matches[0].range;
        editor.revealRangeInCenter(range);
        editor.setSelection(range);
    }
}

function computeDiff() {
  if (!editor) return;
  
  const changes = Diff.diffLines(props.currentContent, props.compareContent);
  const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
  const changesIndices: { startLine: number, endLine: number }[] = [];
  
  let lineNumber = 1;
  let addedCount = 0;
  let removedCount = 0;

  changes.forEach(part => {
    const lines = part.count || 0;
    if (part.added) {
      addedCount += lines;
      const start = lineNumber;
      const end = lineNumber + lines - 1;
      
      newDecorations.push({
        range: new monaco.Range(start, 1, end, 1),
        options: {
          isWholeLine: true,
          className: 'diff-line-added',
          linesDecorationsClassName: 'diff-gutter-added'
        }
      });
      
      changesIndices.push({ startLine: start, endLine: end });
      
      lineNumber += lines;
    } else if (part.removed) {
      removedCount += lines;
      // We can add a decoration at current line to indicate deletion
      // Glyph margin decoration
      newDecorations.push({
          range: new monaco.Range(lineNumber, 1, lineNumber, 1),
          options: {
              glyphMarginClassName: 'diff-glyph-removed',
              glyphMarginHoverMessage: { value: `Deleted ${lines} lines here (relative to latest)` }
          }
      });
      // But we don't increment lineNumber
    } else {
      lineNumber += lines;
    }
  });

  decorations = editor.deltaDecorations(decorations, newDecorations);
  stats.value = { added: addedCount, removed: removedCount };
  changeList.value = changesIndices;
  changeIndex.value = -1;
}

function navChange(dir: number) {
    if (changeList.value.length === 0) return;
    
    let next = changeIndex.value + dir;
    if (next < 0) next = 0;
    if (next >= changeList.value.length) next = changeList.value.length - 1;
    
    changeIndex.value = next;
    const change = changeList.value[next];
    
    if (editor) {
        editor.revealLineInCenter(change.startLine);
        editor.setSelection(new monaco.Range(change.startLine, 1, change.endLine, 1000));
    }
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
