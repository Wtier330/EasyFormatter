<template>
  <div 
    class="splitter" 
    :class="{ dragging: isDragging }"
    @mousedown="startDrag"
  >
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
  width: 12px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: col-resize;
  z-index: 50;
  flex-shrink: 0;
  background-color: transparent;
}

.splitter-line {
  width: 2px;
  height: 100%;
  /* ✅ 默认显示“淡线” */
  background-color: var(--splitter-color-idle);
  transition: var(--splitter-transition);
}

/* hover / dragging / 强制可见时高亮 */
.splitter:hover .splitter-line,
.splitter.dragging .splitter-line,
.splitter.visible .splitter-line {
  background-color: var(--splitter-color-active);
}
</style>
