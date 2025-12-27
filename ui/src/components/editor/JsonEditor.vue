<template>
  <div class="editor-wrapper">
    <!-- Line Numbers -->
    <div 
      class="line-numbers" 
      ref="lineNumbersRef" 
      :style="{ paddingTop: padding + 'px', fontSize: appStore.fontSize + 'px' }"
    >
      <div v-for="n in lineCount" :key="n" class="line-num" :class="{ active: currentLine === n }">
        {{ n }}
      </div>
    </div>

    <!-- Editor -->
    <div class="editor-main">
      <n-input
        ref="inputInst"
        v-model:value="content"
        type="textarea"
        placeholder="请输入或粘贴 JSON..."
        :resizable="false"
        :bordered="false"
        class="editor-input"
        :class="{ 'no-wrap': !appStore.wordWrap }"
        :style="{ fontSize: appStore.fontSize + 'px' }"
        @input="onInput"
        @click="updateCursor"
        @keyup="updateCursor"
        @scroll="syncScroll" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { NInput } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';

const configStore = useConfigStore();
const appStore = useAppStore();

const inputInst = ref<any>(null);
const lineNumbersRef = ref<HTMLElement | null>(null);
const textareaEl = ref<HTMLTextAreaElement | null>(null);

const content = computed({
  get: () => configStore.rawText,
  set: (val) => {
    configStore.updateText(val);
    updateCursor();
  }
});

const lineCount = computed(() => content.value.split('\n').length);
const currentLine = ref(1);
const padding = 12; // Match textarea padding

// Setup scroll sync and element capture
onMounted(() => {
  // NInput renders a div wrapper, then textarea. We need to find the textarea.
  // Using a slight delay to ensure DOM is ready
  setTimeout(() => {
    const el = inputInst.value?.$el?.querySelector('textarea');
    if (el) {
      textareaEl.value = el;
      el.addEventListener('scroll', syncScroll);
      el.addEventListener('click', updateCursor);
      el.addEventListener('keyup', updateCursor);
      // Init cursor
      updateCursor();
    }
  }, 100);
});

function syncScroll(e: Event) {
  if (lineNumbersRef.value && e.target instanceof Element) {
    lineNumbersRef.value.scrollTop = (e.target as Element).scrollTop;
  }
}

function updateCursor() {
  if (!textareaEl.value) return;
  const val = textareaEl.value.value;
  const sel = textareaEl.value.selectionStart;
  
  // Calculate line number
  const before = val.substring(0, sel);
  const line = before.split('\n').length;
  currentLine.value = line;
  
  // Calculate column
  const lastNewLine = before.lastIndexOf('\n');
  const col = sel - lastNewLine;
  
  // Update store (we might need to add this to config store if we want to show in status bar)
  // For now, we just track locally for line highlighting
  // TODO: Emit or store cursor pos for status bar
  configStore.cursorPos = { line, col };
}

function onInput() {
  // Auto scroll to cursor if needed? Usually browser handles it.
}

// Expose locate function
const locate = async (key: string) => {
  if (!textareaEl.value) return;
  
  const text = content.value;
  const index = text.indexOf(`"${key}"`); // Simple search for key
  if (index >= 0) {
    textareaEl.value.focus();
    textareaEl.value.setSelectionRange(index, index + key.length + 2);
    
    // Scroll into view - crude calculation
    const before = text.substring(0, index);
    const line = before.split('\n').length;
    const lineHeight = 22; // approx 14px * 1.6
    const top = (line - 1) * lineHeight;
    
    textareaEl.value.scrollTop = Math.max(0, top - 100); // Center slightly
    
    // Flash effect?
    // Not easy with native textarea without overlay. Selection is good enough.
  }
};

watch(() => configStore.locateRequest, (key) => {
  if (key) {
    locate(key);
    configStore.locateRequest = null; // Reset
  }
});

defineExpose({ locate });
</script>

<style scoped>
.editor-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: #fff;
}

.line-numbers {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 40px;
  background-color: #f5f7fa;
  border-right: 1px solid #eee;
  padding: 12px 0;
  overflow: hidden;
  user-select: none;
  text-align: right;
  color: #999;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  z-index: 10;
}

.editor-main {
  flex: 1;
  overflow: hidden;
  margin-left: 40px;
  display: flex;
  flex-direction: column;
}

.editor-input {
  flex: 1;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
}

/* Deep selector for Naive UI textarea to control height */
:deep(.n-input-wrapper),
:deep(.n-input__textarea-el) {
  height: 100% !important;
}

.line-num {
  padding-right: 8px;
  line-height: 1.5;
  height: 1.5em; /* Fallback */
}
.line-num.active {
  color: #333;
  font-weight: bold;
  background-color: #e6f7ff;
}

.no-wrap :deep(textarea) {
  white-space: pre !important;
  overflow-x: auto !important;
}
</style>
