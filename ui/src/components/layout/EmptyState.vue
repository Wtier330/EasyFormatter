<template>
  <div class="empty-state" @dblclick="onDoubleClick">
    <div class="empty-content">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
          <path d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/>
          <path d="M256 56v120a32 32 0 0032 32h120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/>
        </svg>
      </div>
      <div class="empty-text title">
        打开或新建文件开始处理
      </div>
      <div class="shortcuts-container">
        <div class="shortcut-item">
          <span class="shortcut">Ctrl + O</span> <span class="action">打开</span>
        </div>
        <div class="shortcut-item">
          <span class="shortcut">Ctrl + N</span> <span class="action">新建</span>
        </div>
      </div>
      <div class="empty-text subtext">
        打开后可在顶部标签栏快速切换
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  onNewFile: () => void;
}>();

// Debounce logic for double click
const lastClickTime = ref(0);

function onDoubleClick() {
  // Native dblclick event is already debounced by OS usually, 
  // but user asked for "double click event with appropriate debounce (300ms)".
  // Standard @dblclick works fine. If we need manual double click simulation:
  // const now = Date.now();
  // if (now - lastClickTime.value < 300) { ... }
  // lastClickTime.value = now;
  
  // Since we use @dblclick, it fires only on valid double clicks. 
  // We can add a simple throttle to prevent rapid firing if user spams clicks.
  const now = Date.now();
  if (now - lastClickTime.value < 1000) return; // Prevent multiple dialogs
  lastClickTime.value = now;
  
  props.onNewFile();
}
</script>

<style scoped>
.empty-state {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9; /* Or match theme */
  user-select: none;
}

.empty-content {
  text-align: center;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 8px;
  color: #ddd;
}

.empty-text {
  font-size: 14px;
  line-height: 1.6;
}

.title {
  font-size: 16px;
  font-weight: 500;
  color: #555;
  margin-bottom: 8px;
}

.subtext {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
}

.shortcuts-container {
  display: flex;
  gap: 24px;
  margin: 4px 0;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.shortcut {
  background-color: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  color: #555;
  font-weight: 500;
  border: 1px solid #e0e0e0;
}

.action {
  color: #666;
}

/* Dark theme support */
:global(body.dark-theme) .empty-state {
  background-color: #1e1e1e;
}

:global(body.dark-theme) .empty-content {
  color: #666;
}

:global(body.dark-theme) .empty-icon {
  color: #333;
}

:global(body.dark-theme) .title {
  color: #aaa;
}

:global(body.dark-theme) .subtext {
  color: #555;
}

:global(body.dark-theme) .shortcut {
  background-color: #2d2d2d;
  color: #aaa;
  border-color: #333;
}

:global(body.dark-theme) .action {
  color: #888;
}
</style>
