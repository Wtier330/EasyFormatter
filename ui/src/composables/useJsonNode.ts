import { computed, ref } from 'vue';
import { useConfigStore } from '../stores/config';
import { useAppStore } from '../stores/app';
import { parsePath, setByPath, formatJson } from '../utils/json';

export function useJsonNode(props: {
  name?: string | number;
  data: any;
  path: string;
  depth: number;
  isLast: boolean;
  expandLevel: number;
}) {
  const configStore = useConfigStore();
  const appStore = useAppStore();

  const isArray = computed(() => Array.isArray(props.data));
  const isObject = computed(() => props.data !== null && typeof props.data === 'object');
  const isExpandable = computed(() => isObject.value);

  const childrenEntries = computed(() => {
    if (!isExpandable.value) return [];
    if (isArray.value) {
      return props.data.map((item: any, index: number) => ({
        key: index,
        value: item,
        isLast: index === props.data.length - 1
      }));
    } else {
      const keys = Object.keys(props.data);
      return keys.map((key, index) => ({
        key: key,
        value: props.data[key],
        isLast: index === keys.length - 1
      }));
    }
  });

  const valueType = computed(() => {
    if (props.data === null) return 'null';
    return typeof props.data;
  });

  const listSummary = computed(() => {
    if (!isArray.value) return '';
    return ` ${props.data.length} `;
  });

  const objSummary = computed(() => {
    if (!isObject.value || isArray.value) return '';
    return ` ${Object.keys(props.data).length} `;
  });

  const truncatedString = computed(() => {
    if (typeof props.data !== 'string') return '';
    let str = props.data;

    str = str
      .replace(/\/g, '\')
      .replace(/\n/g, '\n')
      .replace(/\r/g, '\r')
      .replace(/\t/g, '\t')
      .replace(/"/g, '"');

    return str.length > 40 ? str.substring(0, 40) + '...' : str;
  });

  const isUrl = computed(() => {
    if (typeof props.data !== 'string') return false;
    const str = props.data.trim();
    return /^https?:\/\//i.test(str);
  });

  const escapedFullString = computed(() => {
    if (typeof props.data !== 'string') return String(props.data);
    return props.data
      .replace(/\/g, '\')
      .replace(/\n/g, '\n')
      .replace(/\r/g, '\r')
      .replace(/\t/g, '\t')
      .replace(/"/g, '"');
  });

  // Edit state
  const editing = ref(false);
  const editingValue = ref('');

  function startEdit(onUpdate: (val: any) => void) {
    if (isExpandable.value) return;

    if (valueType.value === 'string') {
      editingValue.value = escapedFullString.value;
    } else {
      editingValue.value = String(props.data);
    }
    editing.value = true;
  }

  function cancelEdit() {
    editing.value = false;
  }

  function commitEdit(onUpdate: (val: any) => void) {
    if (!editing.value) return;
    let newVal: any = editingValue.value;
    try {
      if (valueType.value === 'string') {
        const jsonSource = editingValue.value
          .replace(/"/g, '"')
          .replace(/\n/g, '\n')
          .replace(/\r/g, '\r')
          .replace(/\t/g, '\t');

        newVal = JSON.parse(`"${jsonSource}"`);
      } else {
        newVal = JSON.parse(editingValue.value);
      }
    } catch {
      newVal = editingValue.value;
    }
    onUpdate(newVal);
    editing.value = false;
  }

  function getNextPath(key: string | number) {
    if (isArray.value) {
      return `${props.path}[${key}]`;
    }
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(key))) {
      return props.path && props.path !== 'root' ? `${props.path}.${key}` : String(key);
    } else {
      return `${props.path}["${key}"]`;
    }
  }

  async function handleLocate() {
    if (props.path) {
      configStore.locateRequest = props.path;
    }
  }

  async function commitEditValue(newVal: any) {
    try {
      const tokens = parsePath(props.path);
      const root = configStore.lastValidConfig ?? {};
      const next = setByPath(root, tokens, newVal);
      const text = formatJson(next, appStore.indentSize);
      configStore.updateText(text);
    } catch (e) {
      // Error handling
    }
  }

  function toggle(onUpdate: (val: boolean) => void) {
    onUpdate(!editing.value);
  }

  return {
    isArray,
    isObject,
    isExpandable,
    childrenEntries,
    valueType,
    listSummary,
    objSummary,
    truncatedString,
    isUrl,
    escapedFullString,
    editing,
    editingValue,
    startEdit,
    cancelEdit,
    commitEdit,
    getNextPath,
    handleLocate,
    commitEditValue,
    toggle
  };
}