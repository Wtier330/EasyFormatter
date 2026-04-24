import * as Diff from 'diff';
import * as jsonpatch from 'fast-json-patch';
import { ref } from 'vue';
import * as monaco from 'monaco-editor';
import { safeParse } from '../utils/json';

export interface DiffStats {
  added: number;
  removed: number;
}

export interface JsonChange {
  op: string;
  path: string;
  value?: any;
}

export function useDiffCompute() {
  const stats = ref<DiffStats>({ added: 0, removed: 0 });
  const changeList = ref<{ startLine: number; endLine: number }[]>([]);
  const jsonChanges = ref<JsonChange[]>([]);

  function computeDiff(
    editor: monaco.editor.IStandaloneCodeEditor | null,
    baseText: string,
    targetText: string
  ) {
    if (!editor) return;

    const parts = Diff.diffLines(baseText, targetText);
    const changes: { startLine: number; endLine: number }[] = [];

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

    return { stats, changeList };
  }

  function computeJsonDiff(currentContent: string, compareContent: string) {
    const { data: latest } = safeParse(currentContent);
    const { data: selected } = safeParse(compareContent);

    if (latest && selected) {
      jsonChanges.value = jsonpatch.compare(latest, selected);
    } else {
      jsonChanges.value = [];
    }

    return jsonChanges;
  }

  function applyDecorations(
    editor: monaco.editor.IStandaloneCodeEditor | null,
    decorations: string[]
  ) {
    if (!editor) return;

    const decos = changeList.value.map(c => ({
      range: new monaco.Range(c.startLine, 1, c.endLine, 1),
      options: {
        isWholeLine: true,
        className: 'diff-line'
      }
    }));

    return editor.deltaDecorations(decorations, decos);
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

  return {
    stats,
    changeList,
    jsonChanges,
    computeDiff,
    computeJsonDiff,
    applyDecorations,
    getOpType,
    formatVal
  };
}
