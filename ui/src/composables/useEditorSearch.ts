import { ref, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';

export function useEditorSearch() {
  const searchVisible = ref(false);
  const showReplace = ref(false);
  const matches = shallowRef<monaco.editor.FindMatch[]>([]);
  const currentMatchIndex = ref(-1);
  let decorationsCollection: monaco.editor.IEditorDecorationsCollection | null = null;
  let currentQuery = '';
  let currentOptions = { regex: false, case: false, word: false };

  function openSearch(replace: boolean) {
    searchVisible.value = true;
    showReplace.value = replace;
  }

  function closeSearch() {
    searchVisible.value = false;
    matches.value = [];
    currentMatchIndex.value = -1;
    decorationsCollection?.clear();
  }

  function updateMatches(editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (!editor || !currentQuery) {
      matches.value = [];
      currentMatchIndex.value = -1;
      decorationsCollection?.clear();
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    let searchString = currentQuery;
    let isRegex = currentOptions.regex;

    if (currentOptions.word && !isRegex) {
      const escaped = searchString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchString = `\\b${escaped}\\b`;
      isRegex = true;
    }

    try {
      const result = model.findMatches(
        searchString,
        false,
        isRegex,
        currentOptions.case,
        null,
        false
      );
      matches.value = result;
      updateDecorations(editor);
      if (editor.getPosition()) {
        updateCurrentMatchIndexFromCursor(editor.getPosition()!);
      }
    } catch {
      matches.value = [];
      decorationsCollection?.clear();
    }
  }

  function updateDecorations(editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (!decorationsCollection || !editor) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = matches.value.map((m, i) => {
      const isCurrent = i === currentMatchIndex.value;
      return {
        range: m.range,
        options: {
          isWholeLine: false,
          className: isCurrent ? 'find-match-highlight-current' : 'find-match-highlight',
          overviewRuler: {
            color: isCurrent ? '#ea5c00' : 'rgba(234, 92, 0, 0.5)',
            position: monaco.editor.OverviewRulerLane.Center
          },
          minimap: {
            color: isCurrent ? '#ea5c00' : 'rgba(234, 92, 0, 0.5)',
            position: monaco.editor.MinimapPosition.Inline
          }
        }
      };
    });

    decorationsCollection.set(newDecorations);
  }

  function updateCurrentMatchIndexFromCursor(position: monaco.Position) {
    if (matches.value.length === 0) {
      currentMatchIndex.value = -1;
      return;
    }

    const insideIndex = matches.value.findIndex(m => m.range.containsPosition(position));
    if (insideIndex !== -1) {
      currentMatchIndex.value = insideIndex;
      return;
    }

    const nextIndex = matches.value.findIndex(m => {
      const start = m.range.getStartPosition();
      return start.lineNumber > position.lineNumber ||
             (start.lineNumber === position.lineNumber && start.column >= position.column);
    });
    currentMatchIndex.value = nextIndex !== -1 ? nextIndex : 0;
  }

  function onNext(editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (matches.value.length === 0 || !editor) return;

    let nextIndex = currentMatchIndex.value + 1;
    if (nextIndex >= matches.value.length) {
      nextIndex = 0;
    }

    jumpToMatch(nextIndex, editor);
  }

  function onPrev(editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (matches.value.length === 0 || !editor) return;

    let prevIndex = currentMatchIndex.value - 1;
    if (prevIndex < 0) {
      prevIndex = matches.value.length - 1;
    }

    jumpToMatch(prevIndex, editor);
  }

  function jumpToMatch(index: number, editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (!editor) return;
    currentMatchIndex.value = index;
    const match = matches.value[index];
    if (match) {
      editor.setSelection(match.range);
      editor.revealRangeInCenter(match.range);
      updateDecorations(editor);
    }
  }

  function onFind(query: string, options: { regex: boolean, case: boolean, word: boolean }) {
    currentQuery = query;
    currentOptions = options;
  }

  function onReplace(text: string, editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (!editor || currentMatchIndex.value === -1 || matches.value.length === 0) {
      return;
    }

    const match = matches.value[currentMatchIndex.value];
    editor.executeEdits('replace', [{
      range: match.range,
      text,
      forceMoveMarkers: true
    }]);
  }

  function onReplaceAll(text: string, editor: monaco.editor.IStandaloneCodeEditor | null) {
    if (!editor || matches.value.length === 0) return;

    const edits = matches.value.map(m => ({
      range: m.range,
      text,
      forceMoveMarkers: true
    }));

    editor.executeEdits('replace-all', edits);
  }

  function setDecorationsCollection(collection: monaco.editor.IEditorDecorationsCollection) {
    decorationsCollection = collection;
  }

  return {
    searchVisible,
    showReplace,
    matches,
    currentMatchIndex,
    openSearch,
    closeSearch,
    updateMatches,
    updateCurrentMatchIndexFromCursor,
    onNext,
    onPrev,
    jumpToMatch,
    onFind,
    onReplace,
    onReplaceAll,
    setDecorationsCollection
  };
}
