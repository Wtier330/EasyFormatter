import { ref, shallowRef } from 'vue';
import * as monaco from 'monaco-editor';

export function useMonacoEditor() {
  const container = ref<HTMLElement | null>(null);
  const editor = shallowRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelMap = new Map<string, monaco.editor.ITextModel>();

  function getOrCreateModel(id: string, initialText: string): monaco.editor.ITextModel {
    if (modelMap.has(id)) {
      return modelMap.get(id)!;
    }
    const model = monaco.editor.createModel(initialText, 'json');
    modelMap.set(id, model);
    return model;
  }

  function createEditor(
    containerRef: HTMLElement,
    model: monaco.editor.ITextModel,
    options: {
      fontSize: number;
      wordWrap: boolean;
    }
  ): monaco.editor.IStandaloneCodeEditor {
    const newEditor = monaco.editor.create(containerRef, {
      model,
      language: 'json',
      automaticLayout: true,
      fontSize: options.fontSize,
      wordWrap: options.wordWrap ? 'on' : 'off',
      minimap: { enabled: false },
      smoothScrolling: false,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      largeFileOptimizations: true,
      rulers: [],
      theme: 'vs',
      lineNumbers: 'on',
      cursorSmoothCaretAnimation: 'off',
      stickyScroll: { enabled: false },
      accessibilitySupport: 'auto',
      formatOnType: false,
      formatOnPaste: false,
      suggestOnTriggerCharacters: false,
      wordBasedSuggestions: 'off',
      contextmenu: true
    });

    // Add custom actions
    newEditor.addAction({
      id: 'custom-find',
      label: 'Find',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF],
      run: () => { /* Will be handled externally */ }
    });

    newEditor.addAction({
      id: 'custom-replace',
      label: 'Replace',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR],
      run: () => { /* Will be handled externally */ }
    });

    return newEditor;
  }

  function disposeEditor() {
    editor.value?.dispose();
    modelMap.forEach(model => model.dispose());
    modelMap.clear();
    editor.value = null;
  }

  function switchModel(id: string, text: string) {
    if (!editor.value) return null;
    const model = getOrCreateModel(id, text);
    if (editor.value.getModel() !== model) {
      editor.value.setModel(model);
    }
    return model;
  }

  function cleanupClosedTabs(tabs: any[]) {
    const currentIds = new Set(tabs.map(t => t.id));
    for (const [id, model] of modelMap.entries()) {
      if (id !== 'default' && !currentIds.has(id)) {
        model.dispose();
        modelMap.delete(id);
      }
    }
  }

  return {
    container,
    editor,
    modelMap,
    getOrCreateModel,
    createEditor,
    disposeEditor,
    switchModel,
    cleanupClosedTabs
  };
}
