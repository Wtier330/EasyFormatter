import { ref, computed } from 'vue';
import { debounce } from '../utils/debounce';
import { useSearchHistory } from './useSearchHistory';

export function useSearchWidget(
  emit: (event: string, ...args: any[]) => void,
  props: {
    matchesCount: Ref<number>;
    currentMatchIndex: Ref<number>;
  }
) {
  const findText = ref('');
  const replaceText = ref('');
  const matchCase = ref(false);
  const matchWholeWord = ref(false);
  const useRegex = ref(false);

  const { history, historyOptions, addToHistory, loadLastSearch, persistLastSearch, debouncedPersist } = useSearchHistory();

  const matchesCountStr = computed(() => {
    if (props.matchesCount.value === 0) return '无结果';
    const current = props.currentMatchIndex.value >= 0 ? props.currentMatchIndex.value + 1 : 0;
    return `${current} / ${props.matchesCount.value}`;
  });

  const hasMatches = computed(() => props.matchesCount.value > 0);

  const debouncedFind = debounce((query: string, options: { regex: boolean, case: boolean, word: boolean }) => {
    emit('find', query, options);
  }, 200);

  function toggleCase() {
    matchCase.value = !matchCase.value;
  }

  function toggleWord() {
    matchWholeWord.value = !matchWholeWord.value;
  }

  function toggleRegex() {
    useRegex.value = !useRegex.value;
  }

  function onFindNext() {
    addToHistory(findText.value);
    emit('next');
  }

  function onFindPrev() {
    addToHistory(findText.value);
    emit('prev');
  }

  function onReplace() {
    emit('replace', replaceText.value);
  }

  function onReplaceAll() {
    emit('replace-all', replaceText.value);
  }

  function close() {
    persistLastSearch(() => findText.value);
    emit('close');
  }

  function onSelectOption(value: string | number) {
    if (import.meta.env.DEV) {
      console.debug('[SearchWidget] option selected', { value });
    }
  }

  return {
    findText,
    replaceText,
    matchCase,
    matchWholeWord,
    useRegex,
    historyOptions,
    matchesCountStr,
    hasMatches,
    toggleCase,
    toggleWord,
    toggleRegex,
    onFindNext,
    onFindPrev,
    onReplace,
    onReplaceAll,
    close,
    onSelectOption,
    loadLastSearch,
    debouncedPersist
  };
}