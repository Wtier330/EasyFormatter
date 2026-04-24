import { useConfigStore } from '../stores/config';

export function useTransform() {
  const configStore = useConfigStore();

  const transformOptions = [
    { label: '转义 (Escape)', key: 'escape', extra: 'Ctrl+Alt+E' },
    { label: '去转义 (Unescape)', key: 'unescape', extra: 'Ctrl+Alt+Shift+E' },
    { label: '中文 → Unicode', key: 'cn2unicode', extra: 'Ctrl+Alt+U' },
    { label: 'Unicode → 中文', key: 'unicode2cn', extra: 'Ctrl+Alt+Shift+U' }
  ];

  function handleTransformSelect(key: string) {
    configStore.transformRequest = key;
  }

  return {
    transformOptions,
    handleTransformSelect
  };
}