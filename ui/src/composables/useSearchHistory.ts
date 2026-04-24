import { ref, computed } from 'vue';
import { debounce } from '../utils/debounce';

const STORAGE_KEY = 'last_search_content';

export function useSearchHistory() {
  const history = ref<string[]>([]);
  const lastPersisted = ref('');

  const historyOptions = computed(() => {
    return history.value.map(v => ({ label: v, value: v }));
  });

  function loadLastSearch(getFindText: () => string, setFindText: (v: string) => void) {
    if (getFindText()) return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (typeof stored === 'string' && stored) {
        setFindText(stored);
        lastPersisted.value = stored;
      }
    } catch {}
  }

  function persistLastSearch(getFindText: () => string) {
    const text = getFindText() ?? '';
    if (text === lastPersisted.value) return;
    try {
      localStorage.setItem(STORAGE_KEY, String(text));
      lastPersisted.value = text;
    } catch {}
  }

  function addToHistory(searchText: string) {
    if (searchText && !history.value.includes(searchText)) {
      history.value.unshift(searchText);
      if (history.value.length > 10) {
        history.value.pop();
      }
    }
  }

  const debouncedPersist = debounce((getFindText: () => string) => {
    persistLastSearch(getFindText);
  }, 600);

  return {
    history,
    historyOptions,
    loadLastSearch,
    persistLastSearch,
    addToHistory,
    debouncedPersist
  };
}
