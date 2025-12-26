<template>
  <div class="splitter" @mousedown="startDrag"></div>
</template>

<script setup lang="ts">
import { onUnmounted } from 'vue';

const emit = defineEmits<{
  (e: 'resize', delta: number): void
}>();

let startX = 0;

function startDrag(e: MouseEvent) {
  startX = e.clientX;
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
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

onUnmounted(() => stopDrag()); // cleanup safety
</script>

<style scoped>
.splitter {
  width: 4px;
  background-color: var(--n-border-color);
  cursor: col-resize;
  transition: background-color 0.2s;
  z-index: 10;
  flex-shrink: 0;
}
.splitter:hover, .splitter:active {
  background-color: var(--n-primary-color);
}
</style>
