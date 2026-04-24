import { ref, nextTick } from 'vue';
import { NInput } from 'naive-ui';
import { useConfigStore } from '../stores/config';
import { useAppStore } from '../stores/app';
import { parsePath, setByPath, formatJson } from '../utils/json';

export function useNodeEdit() {
  const configStore = useConfigStore();
  const appStore = useAppStore();

  const editing = ref(false);
  const editingValue = ref('');
  const inputRef = ref<InstanceType<typeof NInput> | null>(null);

  function startEdit(
    valueType: string,
    isExpandable: boolean,
    escapedFullString: string,
    data: any
  ) {
    if (isExpandable) return;

    if (valueType === 'string') {
      editingValue.value = escapedFullString;
    } else {
      editingValue.value = String(data);
    }
    editing.value = true;

    nextTick(() => {
      inputRef.value?.focus();
    });
  }

  function cancelEdit() {
    editing.value = false;
  }

  function commitEdit(
    path: string,
    valueType: string
  ) {
    if (!editing.value) return;

    let newVal: any = editingValue.value;
    try {
      if (valueType === 'string') {
        const jsonSource = editingValue.value
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');

        newVal = JSON.parse(`"${jsonSource}"`);
      } else {
        newVal = JSON.parse(editingValue.value);
      }
    } catch {
      newVal = editingValue.value;
    }

    try {
      const tokens = parsePath(path);
      const root = configStore.lastValidConfig ?? {};
      const next = setByPath(root, tokens, newVal);
      const text = formatJson(next, appStore.indentSize);
      configStore.updateText(text);
      editing.value = false;
    } catch {
      editing.value = false;
    }
  }

  return {
    editing,
    editingValue,
    inputRef,
    startEdit,
    cancelEdit,
    commitEdit
  };
}
