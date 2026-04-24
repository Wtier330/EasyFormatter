import { ref, type Ref } from 'vue';
import { HistoryManager, type Command } from '../utils/history';

export class UpdateTransformResultCommand implements Command {
  constructor(
    private transformResultRef: Ref<string | null>,
    private transformModeRef: Ref<string | null>,
    private prevResult: string | null,
    private nextResult: string | null,
    private prevMode: string | null,
    private nextMode: string | null
  ) {}

  execute() {
    this.transformResultRef.value = this.nextResult;
    this.transformModeRef.value = this.nextMode;
  }

  undo() {
    this.transformResultRef.value = this.prevResult;
    this.transformModeRef.value = this.prevMode;
  }

  getEstimatedSize() {
    return (
      (this.prevResult?.length || 0) * 2 +
      (this.nextResult?.length || 0) * 2 +
      (this.prevMode?.length || 0) * 2 +
      (this.nextMode?.length || 0) * 2
    );
  }
}

export class UpdateDocumentCommand implements Command {
  constructor(
    private updateFn: (text: string) => void,
    private prevText: string,
    private nextText: string
  ) {}

  execute() {
    this.updateFn(this.nextText);
  }

  undo() {
    this.updateFn(this.prevText);
  }

  getEstimatedSize() {
    return (this.prevText.length + this.nextText.length) * 2;
  }
}

export function useConfigHistory() {
  const historyManager = new HistoryManager(20, 5 * 1024 * 1024);
  const docHistoryManager = new HistoryManager(20, 5 * 1024 * 1024);

  const canUndo = ref(false);
  const canRedo = ref(false);
  const canUndoDocument = ref(false);
  const canRedoDocument = ref(false);

  function setTransformResult(
    result: string | null,
    mode: string | null,
    transformResult: Ref<string | null>,
    transformMode: Ref<string | null>
  ) {
    if (transformResult.value === result && transformMode.value === mode) return;

    const command = new UpdateTransformResultCommand(
      transformResult,
      transformMode,
      transformResult.value,
      result,
      transformMode.value,
      mode
    );

    transformResult.value = result;
    transformMode.value = mode;
    historyManager.push(command);
    updateHistoryState();
  }

  function undoTransform() {
    historyManager.undo();
    updateHistoryState();
  }

  function redoTransform() {
    historyManager.redo();
    updateHistoryState();
  }

  function updateHistoryState() {
    canUndo.value = historyManager.canUndo;
    canRedo.value = historyManager.canRedo;
  }

  function undoDocument() {
    docHistoryManager.undo();
    updateDocumentHistoryState();
  }

  function redoDocument() {
    docHistoryManager.redo();
    updateDocumentHistoryState();
  }

  function updateDocumentHistoryState() {
    canUndoDocument.value = docHistoryManager.canUndo;
    canRedoDocument.value = docHistoryManager.canRedo;
  }

  function updateText(
    text: string,
    source: 'editor' | 'other',
    internalUpdateText: (text: string) => void
  ) {
    const command = new UpdateDocumentCommand(
      internalUpdateText,
      '', // prev text will be set by the caller
      text
    );

    if (source === 'editor') {
      internalUpdateText(text);
      docHistoryManager.push(command);
    } else {
      docHistoryManager.execute(command);
    }
    updateDocumentHistoryState();
  }

  return {
    historyManager,
    docHistoryManager,
    canUndo,
    canRedo,
    canUndoDocument,
    canRedoDocument,
    setTransformResult,
    undoTransform,
    redoTransform,
    undoDocument,
    redoDocument,
    updateText,
    UpdateTransformResultCommand,
    UpdateDocumentCommand
  };
}
