<template>
  <div v-if="visible" class="search-widget" @keydown.stop="onWidgetKeydown">
    <!-- Find Row -->
    <div class="search-row">
      <div class="input-wrapper">
        <n-auto-complete
          ref="findInputRef"
          v-model:value="findText"
          :options="historyOptions"
          placeholder="查找"
          size="small"
          class="find-input"
          @keydown.capture="onFindInputKeydown"
          @select="onSelectOption"
          @focus="onInputFocus"
        >
          <template #prefix>
            <n-icon class="prefix-icon" size="16">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M456.69 421.39L362.6 327.3a173.81 173.81 0 0034.84-104.58C397.44 126.38 319.06 48 222.72 48S48 126.38 48 222.72s78.38 174.72 174.72 174.72A173.81 173.81 0 00327.3 362.6l94.09 94.09a25 25 0 0035.3-35.3zM97.92 222.72a124.8 124.8 0 11124.8 124.8 124.95 124.95 0 01-124.8-124.8z" fill="currentColor"/></svg>
            </n-icon>
          </template>
          <template #suffix>
            <div class="toggles">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <div class="toggle-btn" :class="{ active: matchCase }" @click="toggleCase">
                    <span class="codicon">Aa</span>
                  </div>
                </template>
                区分大小写 (Alt+C)
              </n-tooltip>
              
              <n-tooltip trigger="hover">
                <template #trigger>
                  <div class="toggle-btn" :class="{ active: matchWholeWord }" @click="toggleWord">
                    <span class="codicon">Ab|</span>
                  </div>
                </template>
                全字匹配 (Alt+W)
              </n-tooltip>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <div class="toggle-btn" :class="{ active: useRegex }" @click="toggleRegex">
                    <span class="codicon">.*</span>
                  </div>
                </template>
                正则表达式 (Alt+R)
              </n-tooltip>
            </div>
          </template>
        </n-auto-complete>
      </div>

      <div class="actions">
        <span class="matches-count" v-if="findText">{{ matchesCountStr }}</span>
        
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary size="small" @click="onFindPrev" :disabled="!hasMatches">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 244l144-144 144 144M256 120v292"/></svg></n-icon>
              </template>
            </n-button>
          </template>
          上一个匹配 (Shift+Enter)
        </n-tooltip>

        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary size="small" @click="onFindNext" :disabled="!hasMatches">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 268l144 144 144-144M256 392V100"/></svg></n-icon>
              </template>
            </n-button>
          </template>
          下一个匹配 (Enter)
        </n-tooltip>

        <n-button quaternary size="small" @click="close">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144M368 144L144 368"/></svg></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- Replace Row -->
    <div class="search-row replace-row" v-if="showReplace">
      <div class="input-wrapper">
        <n-input
          v-model:value="replaceText"
          placeholder="替换"
          size="small"
          class="replace-input"
          @keydown.enter.prevent="onReplace"
          @keydown.shift.enter.prevent="onReplaceAll"
        >
          <template #prefix>
            <n-icon class="prefix-icon" size="16">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 48l112 112-112 112M398.87 160H96"/></svg>
            </n-icon>
          </template>
        </n-input>
      </div>
      
      <div class="actions replace-actions">
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button quaternary size="small" @click="onReplace" :disabled="!hasMatches">
              <template #icon>
                 <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M400 148l-21.12-24.57A191.43 191.43 0 00240 64C134 64 48 150 48 256s86 192 192 192a192.09 192.09 0 00181.07-128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M464 97.42V208a16 16 0 01-16 16H337.42c-14.26 0-21.4-17.23-11.32-27.31L436.69 86.1C446.77 76 464 83.16 464 97.42z" fill="currentColor"/></svg></n-icon>
              </template>
            </n-button>
          </template>
          替换 (Enter)
        </n-tooltip>

        <n-tooltip trigger="hover">
          <template #trigger>
             <n-button quaternary size="small" @click="onReplaceAll" :disabled="!hasMatches">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="32" y="48" width="448" height="416" rx="48" ry="48" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M160 368L32 256l128-112M352 368l128-112-128-112"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 256H80"/></svg></n-icon>
              </template>
            </n-button>
          </template>
          全部替换 (Ctrl+Alt+Enter)
        </n-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { NInput, NAutoComplete, NButton, NIcon, NTooltip } from 'naive-ui';
import { debounce } from '../../utils/debounce';
// 由于 utils/searchInputKeydown 模块不存在，这里直接在组件内实现 handleSearchFindInputKeydown 的功能
function handleSearchFindInputKeydown(
  e: { key: string; shiftKey: boolean; isComposing?: boolean },
  actions: { next: () => void; prev: () => void }
): { handled: boolean; preventDefault?: boolean; stopPropagation?: boolean } {
  if (e.isComposing) return { handled: false };
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      actions.prev();
    } else {
      actions.next();
    }
    return { handled: true, preventDefault: true, stopPropagation: true };
  }
  return { handled: false };
}

const STORAGE_KEY = 'last_search_content';
const isDev = import.meta.env.DEV;

const props = defineProps<{
  visible: boolean;
  showReplace: boolean;
  matchesCount: number;
  currentMatchIndex: number;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
  (e: 'find', query: string, options: { regex: boolean, case: boolean, word: boolean }): void;
  (e: 'next'): void;
  (e: 'prev'): void;
  (e: 'replace', text: string): void;
  (e: 'replace-all', text: string): void;
  (e: 'close'): void;
}>();

const findText = ref('');
const replaceText = ref('');
const matchCase = ref(false);
const matchWholeWord = ref(false);
const useRegex = ref(false);
const findInputRef = ref<any>(null);
let lastPersisted = '';

const history = ref<string[]>([]);
const historyOptions = computed(() => {
  return history.value.map(v => ({ label: v, value: v }));
});

const matchesCountStr = computed(() => {
  if (props.matchesCount === 0) return '无结果';
  const current = props.currentMatchIndex >= 0 ? props.currentMatchIndex + 1 : 0;
  return `${current} / ${props.matchesCount}`;
});

const hasMatches = computed(() => props.matchesCount > 0);

const debouncedFind = debounce((query: string, options: { regex: boolean, case: boolean, word: boolean }) => {
  emit('find', query, options);
}, 200);

const debouncedPersist = debounce(() => {
  persistLastSearch();
}, 600);

watch([findText, matchCase, matchWholeWord, useRegex], () => {
  debouncedFind(findText.value, {
    regex: useRegex.value,
    case: matchCase.value,
    word: matchWholeWord.value
  });
});

watch(findText, () => {
  debouncedPersist();
});

watch(findText, (val, oldVal) => {
  if (!isDev) return;
  console.debug('[SearchWidget] findText changed', { oldVal, val });
});

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => {
      findInputRef.value?.focus();
      selectInputText();
      loadLastSearch();
    });
  }
});

function toggleCase() { matchCase.value = !matchCase.value; }
function toggleWord() { matchWholeWord.value = !matchWholeWord.value; }
function toggleRegex() { useRegex.value = !useRegex.value; }

function onFindNext() {
  addToHistory();
  emit('next');
}

function onFindPrev() {
  addToHistory();
  emit('prev');
}

function onReplace() {
  emit('replace', replaceText.value);
}

function onReplaceAll() {
  emit('replace-all', replaceText.value);
}

function close() {
  persistLastSearch();
  emit('close');
}

function onSelectOption(value: string | number) {
  if (!isDev) return;
  console.debug('[SearchWidget] option selected', { value });
}

function selectInputText() {
  // NAutoComplete doesn't expose select() directly, access DOM input
  const el = findInputRef.value?.$el;
  if (el) {
    const input = el.querySelector('input');
    input?.select();
  }
}

function loadLastSearch() {
  if (findText.value) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (typeof stored === 'string' && stored) {
      findText.value = stored;
      lastPersisted = stored;
    }
  } catch {
  }
}

function persistLastSearch() {
  const text = findText.value ?? '';
  if (text === lastPersisted) return;
  try {
    localStorage.setItem(STORAGE_KEY, String(text));
    lastPersisted = text;
  } catch {
  }
}

function onWidgetKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    close();
  }
}

function onFindInputKeydown(e: KeyboardEvent) {
  const result = handleSearchFindInputKeydown(
    { key: e.key, shiftKey: e.shiftKey, isComposing: (e as any).isComposing === true },
    {
      next: () => onFindNext(),
      prev: () => onFindPrev()
    }
  );
  if (!result.handled) return;
  if (result.preventDefault) e.preventDefault();
  if (result.stopPropagation) e.stopPropagation();
  if (isDev) console.debug('[SearchWidget] enter handled', { shiftKey: e.shiftKey });
}

function onInputFocus() {
  selectInputText();
}

function addToHistory() {
  if (findText.value && !history.value.includes(findText.value)) {
    history.value.unshift(findText.value);
    if (history.value.length > 10) history.value.pop();
  }
}

// Expose methods to parent if needed
defineExpose({
  setFindText: (text: string) => { findText.value = text; },
  persistLastSearch,
  loadLastSearch
});
</script>

<style scoped>
.search-widget {
  position: absolute;
  top: 8px;
  right: 12px;
  width: clamp(280px, 42vw, 380px);
  max-width: calc(100% - 24px);
  background: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border-radius: 0 0 4px 4px;
  border: 1px solid #eee;
  border-top: none;
  z-index: 100;
  padding: 4px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.search-row:last-child {
  margin-bottom: 0;
}

.input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.prefix-icon {
  color: #999;
}

.find-input, .replace-input {
  width: 100%;
  min-width: 0;
}

.toggles {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-right: 4px;
}

.toggle-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 3px;
  color: #999;
  font-size: 10px;
  user-select: none;
}

.toggle-btn:hover {
  background-color: #f0f0f0;
  color: #666;
}

.toggle-btn.active {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: bold;
}

.codicon {
  font-family: 'Consolas', monospace;
}

.actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}

.matches-count {
  font-size: 12px;
  color: #999;
  margin-right: 4px;
  white-space: nowrap;
  min-width: 40px;
  text-align: right;
}

.replace-actions {
  /* Align with top actions */
}

@media (max-width: 420px) {
  .search-widget {
    left: 8px;
    right: 8px;
    width: auto;
    max-width: none;
  }
}
</style>
