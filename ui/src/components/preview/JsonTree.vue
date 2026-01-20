<template>
  <div class="json-tree-container">
    <!-- Sticky Overlay -->
    <div class="sticky-overlay" v-if="stickyStack.length > 0">
      <div :style="{ transform: `translateX(-${scrollLeft}px)` }">
        <TransitionGroup name="sticky-list">
          <StickyHeader
            v-for="node in stickyStack"
            :key="node.path"
            :name="node.name"
            :path="node.path"
            :depth="node.depth"
            :is-array="node.isArray"
            @click="handleJump"
          />
        </TransitionGroup>
      </div>
    </div>

    <div class="tree-content" v-if="hasData" ref="treeContentRef" @scroll="handleScroll">
      <JsonNode
        :data="treeData"
        path="root"
        :depth="0"
        :is-last="true"
        :expand-level="expandLevel"
      />
    </div>
    
    <div v-else class="empty-tree">
      <n-icon size="48" color="#eee"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M32 464a48 48 0 0048 48h288a48 48 0 0048-48V128H32zm272-256a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zm-96 0a16 16 0 0132 0v224a16 16 0 01-32 0zM432 32H312l-9.4-18.7A24 24 0 00281.1 0H166.8a23.72 23.72 0 00-21.4 13.3L136 32H16A16 16 0 000 48v32a16 16 0 0016 16h416a16 16 0 0016-16V48a16 16 0 00-16-16z" fill="currentColor"/></svg></n-icon>
      <div class="empty-text">无数据</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, provide } from 'vue';
import { NIcon } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import JsonNode from './JsonNode.vue';
import StickyHeader from './StickyHeader.vue';
import { parsePath } from '../../utils/json';

const configStore = useConfigStore();
const appStore = useAppStore();
const expandLevel = ref(1); // 0=none, 999=all
const treeContentRef = ref<HTMLElement | null>(null);
const scrollLeft = ref(0);

// Persistent expansion state
const expandedPaths = ref(new Set<string>(['root']));

function toggleExpansion(path: string, expanded: boolean) {
  if (expanded) {
    expandedPaths.value.add(path);
  } else {
    expandedPaths.value.delete(path);
  }
}

provide('treeState', {
  expandedPaths,
  toggleExpansion
});

// Sticky Scroll Logic
interface StickyNode {
  path: string;
  depth: number;
  name?: string | number;
  isArray: boolean;
}

const stickyStack = ref<StickyNode[]>([]);

function getJsonByPath(root: any, path: string) {
  if (path === 'root') return root;
  const tokens = parsePath(path);
  let current = root;
  for (const token of tokens) {
    if (current === undefined || current === null) return undefined;
    current = current[token];
  }
  return current;
}

function handleScroll() {
  if (!treeContentRef.value) return;
  const container = treeContentRef.value;
  scrollLeft.value = container.scrollLeft;
  const containerRect = container.getBoundingClientRect();
  const topThreshold = containerRect.top;
  
  const newStack: StickyNode[] = [];
  
  const traverse = (element: Element) => {
    const rect = element.getBoundingClientRect();
    
    // Check if the node's top line is scrolled out (top < threshold)
    // AND the node is still visible (bottom > threshold)
    // We assume the header height is small, so we stick it as soon as it touches top.
    // Actually, sticky behavior: sticks when top reaches 0.
    // So if rect.top <= topThreshold.
    // And stops sticking when bottom reaches bottom of sticky header.
    // But here we stack them.
    // If rect.bottom <= topThreshold, it's gone.
    
    // One edge case: The node header itself.
    // If rect.top > topThreshold, it's visible normally, no need to stick.
    // So condition: rect.top < topThreshold && rect.bottom > topThreshold.
    
    if (rect.top < topThreshold && rect.bottom > topThreshold) {
       const path = element.getAttribute('data-path');
       if (path) {
          const data = getJsonByPath(treeData.value, path);
          if (data !== undefined) {
             const tokens = path === 'root' ? [] : parsePath(path);
             const depth = tokens.length;
             const name = tokens.length > 0 ? tokens[tokens.length - 1] : undefined;
             
             newStack.push({
               path,
               depth,
               name,
               isArray: Array.isArray(data)
             });
          }
       }
       
       const childrenContainer = element.querySelector(':scope > .collapsible-content > .children');
       if (childrenContainer) {
         for (const child of childrenContainer.children) {
           if (child.classList.contains('json-node')) {
             traverse(child);
             // Found the active child path, no need to check other siblings
             if (newStack.length > 0 && newStack[newStack.length - 1].path !== path) {
                break;
             }
           }
         }
       }
    }
  };
  
  const rootNode = container.querySelector('.json-node');
  if (rootNode) traverse(rootNode);
  
  stickyStack.value = newStack;
}

function handleJump(path: string) {
  if (!treeContentRef.value) return;
  // Find element
  // Use CSS.escape to safely handle special characters (quotes, brackets, etc.) in the path
  const element = treeContentRef.value.querySelector(`.json-node[data-path=${CSS.escape(path)}]`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // After jump, the sticky header might cover the node.
    // But since sticky header is transparent-ish or we want it at top.
    // If we scroll to start, it will be under the sticky stack if stack persists.
    // But if we scroll to start, that node is now at top.
    // So it will be sticky?
    // If rect.top === topThreshold, it is sticky.
    // Ideally we want to scroll it slightly below the sticky stack?
    // Or just accept it.
  }
}

// Reset state when file changes
watch(() => configStore.currentFilePath, () => {
  expandedPaths.value.clear();
  expandedPaths.value.add('root');
  expandLevel.value = 1;
  stickyStack.value = [];
});

const treeData = computed(() => {
  return configStore.lastValidConfig;
});

const hasData = computed(() => treeData.value !== null && treeData.value !== undefined);

function expandAll() {
  expandLevel.value = 999;
}

function collapseAll() {
  expandLevel.value = 0;
}

// Watch for global triggers from FunctionBar
watch(() => appStore.triggerExpand, () => {
  expandAll();
});

watch(() => appStore.triggerCollapse, () => {
  collapseAll();
});

defineExpose({
  expandAll,
  collapseAll
});
</script>

<style scoped>
.json-tree-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  overflow: hidden; /* Ensure container doesn't spill */
  position: relative;
}
.sticky-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid #eee;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  pointer-events: auto;
  max-height: 50%; /* Don't cover too much */
  overflow: hidden;
}
.tree-content {
  flex: 1;
  overflow: auto; /* Enable both scrollbars */
  padding: 8px;
  white-space: nowrap; /* Force horizontal scroll for long lines */
  min-height: 0; /* Flexbox scroll fix */
}
.empty-tree {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ccc;
}
.empty-text {
  margin-top: 10px;
  font-size: 12px;
}

.sticky-list-enter-active,
.sticky-list-leave-active {
  transition: all 0.2s ease;
}
.sticky-list-enter-from,
.sticky-list-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
