<template>
  <div class="json-node">
    <div 
      class="node-line" 
      :class="{ 'hover-active': isHovered }"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Indentation -->
      <span class="indent" :style="{ width: depth * 20 + 'px' }"></span>

      <!-- Expand Toggle -->
      <span 
        class="toggle-icon" 
        @click="toggle"
        :style="{ visibility: isExpandable ? 'visible' : 'hidden' }"
      >
        <span v-if="isOpen" class="arrow expanded">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
        </span>
        <span v-else class="arrow">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M10 17l5-5-5-5z" fill="currentColor"/></svg>
        </span>
      </span>

      <!-- Key -->
      <span v-if="name !== undefined" class="key" @click="handleLocate">"{{ name }}"</span>
      <span v-if="name !== undefined" class="separator">: </span>

      <!-- Value -->
      
      <!-- Object/Array -->
      <span v-if="isExpandable">
        <span class="bracket">{{ isArray ? '[' : '{' }}</span>
        
        <span v-if="!isOpen" class="summary" @click="toggle">
           {{ isArray ? listSummary : objSummary }} 
        </span>
        
        <span v-if="isOpen" class="bracket-end"></span>
      </span>

      <!-- Primitive -->
      <span v-else class="value" :class="valueType" :title="String(data)" @dblclick="startEdit">
        <template v-if="editing">
          <n-input
            v-model:value="editingValue"
            size="small"
            class="inline-editor"
            @keyup.enter="commitEdit"
            @blur="commitEdit"
          />
        </template>
        <template v-else>
          <template v-if="valueType === 'string'">"{{ truncatedString }}"</template>
          <template v-else>{{ String(data) }}</template>
        </template>
      </span>

      <!-- Comma -->
      <span v-if="!isLast" class="comma">,</span>

      <!-- Copy Path Icon -->
      <span 
        v-if="isHovered" 
        class="action-icon copy-icon" 
        title="复制路径"
        @click.stop="copyPath"
      >
        <svg viewBox="0 0 24 24" width="12" height="12"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/></svg>
      </span>
    </div>

    <!-- Collapsible Content -->
    <Transition
      name="expand"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @leave="onLeave"
    >
      <div v-if="isExpandable && isOpen" class="collapsible-content">
        <!-- Children -->
        <div class="children">
          <JsonNode
            v-for="child in childrenEntries"
            :key="child.key"
            :name="isArray ? undefined : child.key"
            :data="child.value"
            :path="getNextPath(child.key)"
            :depth="depth + 1"
            :is-last="child.isLast"
            :expand-level="expandLevel"
          />
        </div>

        <!-- Closing Bracket -->
        <div class="node-line">
          <span class="indent" :style="{ width: depth * 20 + 'px' }"></span>
          <span class="toggle-placeholder"></span>
          <span class="bracket">{{ isArray ? ']' : '}' }}</span>
          <span v-if="!isLast" class="comma">,</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, inject } from 'vue';
import { copyToClipboard } from '../../utils/path';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { parsePath, setByPath, formatJson } from '../../utils/json';
import { NInput } from 'naive-ui';

// Circular dependency solution for recursive components
defineOptions({
  name: 'JsonNode'
});

const props = defineProps<{
  name?: string | number;
  data: any;
  path: string;
  depth: number;
  isLast: boolean;
  expandLevel: number; // Controlled by parent
}>();

const configStore = useConfigStore();
const appStore = useAppStore();

const treeState = inject<{
  expandedPaths: any,
  toggleExpansion: (path: string, val: boolean) => void
}>('treeState');

// Initialize isOpen based on persistent state or default (root only)
const isOpen = ref(treeState?.expandedPaths.value.has(props.path) ?? false);

const isHovered = ref(false);

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
  const str = props.data;
  return str.length > 40 ? str.substring(0, 40) + '...' : str;
});

// Watch isOpen to update persistent state
watch(isOpen, (val) => {
  treeState?.toggleExpansion(props.path, val);
});

// Watch expandLevel changes to auto-expand/collapse
watch(
  () => props.expandLevel,
  (val) => {
    if (val === 999) {
      isOpen.value = true;
    } else if (val === 0) {
      isOpen.value = false;
    }
  },
  { immediate: true }
);

function toggle() {
  isOpen.value = !isOpen.value;
}

const editing = ref(false);
const editingValue = ref('');

function startEdit() {
  if (isExpandable.value) return;
  // preset without quotes for strings
  if (valueType.value === 'string') {
    editingValue.value = String(props.data);
  } else {
    editingValue.value = String(props.data);
  }
  editing.value = true;
}

function commitEdit() {
  if (!editing.value) return;
  let newVal: any = editingValue.value;
  try {
    if (valueType.value === 'string') {
      newVal = editingValue.value;
    } else {
      // try parse JSON literal
      newVal = JSON.parse(editingValue.value);
    }
  } catch {
    // fallback to string
    newVal = editingValue.value;
  }
  try {
    const tokens = parsePath(props.path);
    const root = configStore.lastValidConfig ?? {};
    const next = setByPath(root, tokens, newVal);
    const text = formatJson(next, appStore.indentSize);
    configStore.updateText(text);
    editing.value = false;
  } catch (e) {
    editing.value = false;
  }
}

function getNextPath(key: string | number) {
  if (isArray.value) {
    return `${props.path}[${key}]`;
  }
  // Simple check: if key is simple identifier, use dot. Else bracket.
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(String(key))) {
    return props.path && props.path !== 'root' ? `${props.path}.${key}` : String(key);
  } else {
    return `${props.path}["${key}"]`;
  }
}

async function copyPath() {
  await copyToClipboard(props.path);
}

function handleLocate() {
  if (props.name !== undefined) {
    configStore.locateRequest = String(props.name);
  }
}

// Animation hooks
function onEnter(el: Element) {
  const element = el as HTMLElement;
  element.style.height = '0';
  element.style.opacity = '0';
  // Force reflow
  element.offsetHeight;
  element.style.height = element.scrollHeight + 'px';
  element.style.opacity = '1';
}

function onAfterEnter(el: Element) {
  const element = el as HTMLElement;
  element.style.height = 'auto';
  element.style.opacity = '';
}

function onLeave(el: Element) {
  const element = el as HTMLElement;
  element.style.height = element.scrollHeight + 'px';
  element.style.opacity = '1';
  // Force reflow
  element.offsetHeight;
  element.style.height = '0';
  element.style.opacity = '0';
}
</script>

<style scoped>
.json-node {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--code-font-size, 13px);
  line-height: 1.5;
  color: #333;
  contain: content; /* Performance optimization */
}
/* ... existing styles ... */
.node-line {
  display: flex;
  align-items: center;
  white-space: pre;
  cursor: default;
}
.node-line:hover {
  background-color: #f0f0f0;
}
.indent {
  display: inline-block;
  flex-shrink: 0;
}
.toggle-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  color: #999;
}
.toggle-placeholder {
  width: 16px;
}
.key {
  color: #92278f; /* Json.cn purple key */
  font-weight: bold;
  cursor: pointer;
}
.key:hover {
  background-color: rgba(146,39,143,0.08);
  border: 1px solid rgba(146,39,143,0.25);
  border-radius: 3px;
}
.separator {
  color: #333;
}
.bracket, .bracket-end, .comma {
  color: #333;
  font-weight: bold;
}
.summary {
  color: #999;
  cursor: pointer;
  font-style: italic;
}
.value.string { color: #3ab54a; /* Green */ }
.value.number { color: #25aae2; /* Blue */ }
.value.boolean { color: #f15a24; /* Orange */ }
.value.null { color: #f15a24; }
.value:hover {
  background-color: rgba(37,170,226,0.08);
  border: 1px solid rgba(37,170,226,0.25);
  border-radius: 3px;
}

.collapsible-content {
  overflow: hidden;
  transition: height 0.3s ease-in-out, opacity 0.3s ease-in-out;
  content-visibility: auto; /* Performance optimization for large trees */
}

.action-icon {
  margin-left: 8px;
  cursor: pointer;
  color: #ccc;
  display: flex;
  align-items: center;
}
.action-icon:hover {
  color: #666;
}
.inline-editor :deep(.n-input__input-el) {
  padding: 0 4px;
  height: 20px;
  font-size: var(--code-font-size, 13px);
}
</style>
