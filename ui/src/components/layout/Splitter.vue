<template>
  <div class="splitter" @mousedown="startDrag">
    <div class="splitter-line"></div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';

const emit = defineEmits<{
  (e: 'resize', delta: number): void;
  (e: 'dragStart'): void;
  (e: 'dragEnd'): void;
}>();

let startX = 0;
const isDragging = ref(false);

function startDrag(e: MouseEvent) {
  startX = e.clientX;
  isDragging.value = true;
  emit('dragStart');
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function onDrag(e: MouseEvent) {
  const delta = e.clientX - startX;
  startX = e.clientX;
  emit('resize', delta);
}

function stopDrag() {
  isDragging.value = false;
  emit('dragEnd');
  
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

onUnmounted(() => stopDrag()); // cleanup safety
</script>

<style scoped>
.splitter {
  width: 12px; /* Maintain hit area */
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 10;
  flex-shrink: 0;
  background-color: transparent;
}

.splitter-line {
  width: 1px; /* Refined to 1px for cleaner look or 2px as requested previously? User said "Default ... Gray". Usually 1px is cleaner for gray lines. Let's stick to 2px for visibility or 1px for precision. User requirement doesn't specify width, just color. I'll keep 2px for easier clicking visual, or 1px for standard UI. Let's use 2px to match "visual state" emphasis. */
  width: 2px;
  height: 100%;
  background-color: var(--splitter-color-idle);
  transition: var(--splitter-transition);
}

.splitter:hover .splitter-line,
.splitter:active .splitter-line {
  background-color: var(--splitter-color-active);
}

/* When dragging, force active color even if cursor moves out slightly */
.splitter:active .splitter-line {
  background-color: var(--splitter-color-active);
}
</style>
