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
        <span v-if="isOpen" class="arrow expanded">▼</span>
        <span v-else class="arrow">▶</span>
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
      <span v-else class="value" :class="valueType" :title="String(data)">
        <template v-if="valueType === 'string'">"{{ truncatedString }}"</template>
        <template v-else>{{ String(data) }}</template>
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

    <!-- Children -->
    <div v-if="isExpandable && isOpen" class="children">
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

    <!-- Closing Bracket (on new line if open) -->
    <div v-if="isExpandable && isOpen" class="node-line">
      <span class="indent" :style="{ width: depth * 20 + 'px' }"></span>
      <span class="toggle-placeholder"></span>
      <span class="bracket">{{ isArray ? ']' : '}' }}</span>
      <span v-if="!isLast" class="comma">,</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { copyToClipboard } from '../../utils/path';
import { useConfigStore } from '../../stores/config';

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
const isOpen = ref(true);
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

// Watch expandLevel changes to auto-expand/collapse
watch(() => props.expandLevel, (val) => {
  if (val > props.depth) {
    isOpen.value = true;
  } else if (val === 0) {
    isOpen.value = false;
  }
});

function toggle() {
  isOpen.value = !isOpen.value;
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
</script>

<style scoped>
.json-node {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}
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
  text-align: center;
  cursor: pointer;
  user-select: none;
  color: #999;
  font-size: 10px;
}
.toggle-placeholder {
  width: 16px;
}
.key {
  color: #92278f; /* Json.cn purple key */
  font-weight: bold;
  cursor: pointer;
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

.children {
  /* No extra margin needed as indent handles it */
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
</style>
