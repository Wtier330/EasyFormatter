import * as monaco from 'monaco-editor';
import { transformText, type TransformMode, TRANSFORM_MODES } from '../utils/textTransform';
import { useNotification } from 'naive-ui';

export function useEditorTransform() {
  const notification = useNotification();

  function handleTransform(
    editor: monaco.editor.IStandaloneCodeEditor | null,
    mode: TransformMode,
    setTransformResult: (result: string, mode: string) => void
  ) {
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    const selection = editor.getSelection();
    const hasSelection = selection && !selection.isEmpty();

    let inputText = '';
    if (hasSelection) {
      inputText = model.getValueInRange(selection);
    } else {
      inputText = model.getValue();
    }

    if (!inputText) {
      notification.warning({ title: '没有文本可变换', duration: 2000 });
      return;
    }

    const result = transformText(inputText, mode);

    if (!result.ok) {
      notification.error({ title: '变换失败', content: result.error, duration: 3000 });
      return;
    }

    const output = result.output;

    if (hasSelection) {
      editor.executeEdits('transform', [{
        range: selection,
        text: output,
        forceMoveMarkers: true
      }]);
      editor.focus();
    } else {
      setTransformResult(output, TRANSFORM_MODES[mode]);
      notification.success({
        title: '变换成功',
        content: '未选择文本，结果已输出到右侧结果区',
        duration: 3000
      });
    }
  }

  function registerTransformActions(
    editor: monaco.editor.IStandaloneCodeEditor | null,
    onTransform: (mode: TransformMode) => void
  ) {
    if (!editor) return;

    const modes: TransformMode[] = ['escape', 'unescape', 'cn2unicode', 'unicode2cn'];
    modes.forEach((mode, index) => {
      editor!.addAction({
        id: `transform-${mode}`,
        label: `文本变换: ${TRANSFORM_MODES[mode]}`,
        contextMenuGroupId: '1_transform',
        contextMenuOrder: index + 1,
        run: () => onTransform(mode)
      });
    });
  }

  return {
    handleTransform,
    registerTransformActions
  };
}
