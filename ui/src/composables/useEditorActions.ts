import * as monaco from 'monaco-editor';
import { useNotification } from 'naive-ui';

export type EditorAction = 'undo' | 'redo' | 'selectAll' | 'cut' | 'copy' | 'paste';

export function useEditorActions() {
  const notification = useNotification();

  async function handleAction(
    action: EditorAction,
    editor: monaco.editor.IStandaloneCodeEditor | null
  ) {
    if (!editor) return;

    switch (action) {
      case 'undo':
        editor.trigger('toolbar', 'undo', null);
        break;

      case 'redo':
        editor.trigger('toolbar', 'redo', null);
        break;

      case 'selectAll': {
        const model = editor.getModel();
        if (model) {
          const range = model.getFullModelRange();
          editor.setSelection(range);
          editor.focus();
        }
        break;
      }

      case 'copy': {
        editor.focus();
        const selection = editor.getSelection();
        const model = editor.getModel();
        if (model) {
          const text = (selection && !selection.isEmpty())
            ? model.getValueInRange(selection)
            : model.getValue();

          try {
            await navigator.clipboard.writeText(text);
            notification.success({ title: '已复制', duration: 1000 });
          } catch {
            editor.trigger('toolbar', 'editor.action.clipboardCopyAction', null);
          }
        }
        break;
      }

      case 'cut':
        editor.focus();
        editor.trigger('toolbar', 'editor.action.clipboardCutAction', null);
        break;

      case 'paste':
        editor.focus();
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            editor.trigger('keyboard', 'type', { text });
          }
        } catch {
          editor.trigger('toolbar', 'editor.action.clipboardPasteAction', null);
        }
        break;
    }
  }

  return {
    handleAction
  };
}
