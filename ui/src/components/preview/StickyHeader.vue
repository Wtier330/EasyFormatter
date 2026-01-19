<template>
  <div 
    class="sticky-header" 
    @click="handleClick"
    :style="{ paddingLeft: (depth * 20 + 8) + 'px' }"
  >
    <!-- Arrow (Always expanded state) -->
    <span class="toggle-icon">
      <span class="arrow expanded">
        <svg viewBox="0 0 24 24" width="14" height="14"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
      </span>
    </span>

    <!-- Key -->
    <span v-if="name !== undefined" class="key">"{{ name }}"</span>
    <span v-if="name !== undefined" class="separator">: </span>

    <!-- Bracket -->
    <span class="bracket">{{ isArray ? '[' : '{' }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  name?: string | number;
  path: string;
  depth: number;
  isArray: boolean;
}>();

const emit = defineEmits<{
  (e: 'click', path: string): void
}>();

function handleClick() {
  emit('click', props.path);
}
</script>

<style scoped>
.sticky-header {
  display: flex;
  align-items: center;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: var(--code-font-size, 13px);
  line-height: 1.5;
  cursor: pointer;
  color: #333;
  width: 100%;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
}

.sticky-header:hover {
  background-color: #f0f0f0;
}

.indent {
  display: inline-block;
  height: 100%;
}

.toggle-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.arrow {
  display: flex;
}

.key {
  color: #92278f;
  font-weight: bold;
}

.separator {
  color: #333;
}

.bracket {
  color: #333;
  font-weight: bold;
}
</style>
