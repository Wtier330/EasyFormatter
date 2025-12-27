<template>
  <div class="toolbar">
    <!-- Left: Branding -->
    <div class="toolbar-left" data-tauri-drag-region>
      <div class="app-branding">
        <img src="/icon.png" class="app-icon" alt="Logo" />
        <span class="app-title">EasyFormatter</span>
      </div>
    </div>

    <!-- Middle: Spacer -->
    <div class="toolbar-middle" data-tauri-drag-region></div>

    <!-- Right: Window Controls -->
    <div class="window-actions" data-tauri-drag-region="false">
      <div class="win-btn" data-tauri-drag-region="false" @click.stop="minimize" title="最小化" aria-label="最小化">
        <n-icon size="16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M400 256H112"/></svg></n-icon>
      </div>
      <div class="win-btn" data-tauri-drag-region="false" @click.stop="toggleMaximize" title="最大化/还原" aria-label="最大化或还原">
        <n-icon size="14"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="96" y="96" width="320" height="320" rx="24" ry="24" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
      </div>
      <div class="win-btn close" data-tauri-drag-region="false" @click.stop="close" title="关闭" aria-label="关闭">
        <n-icon size="16"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M368 368L144 144M368 144L144 368"/></svg></n-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window';
import { NIcon } from 'naive-ui';

// Initialize window instance
const win = getCurrentWindow();

async function minimize() {
  await win.minimize();
}

async function toggleMaximize() {
  await win.toggleMaximize();
}

async function close() {
  await win.close();
}
</script>

<style scoped>
.toolbar {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;

  height: 32px;
  display: flex;
  align-items: center;

  z-index: 100000;
  pointer-events: auto;
  user-select: none;
}


.toolbar-left {
  display: flex;
  align-items: center;
  padding-left: 12px;
}
.toolbar-middle,
.window-actions {
  height: 100%;
  display: flex;
  align-items: center;
}

.app-branding {
  display: flex;
  align-items: center;
  gap: 8px;
  /* Prevent text from capturing mouse events, letting drag region handle it */
  pointer-events: auto;
}

.app-icon {
  width: 20px;
  height: 20px;
}

.app-title {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}


.toolbar-middle {
  flex: 1 1 auto;
  min-width: 1px; /* 防止空元素命中为 0 */
}


.window-actions {
  display: flex;
  height: 100%;
  pointer-events: auto;
}


.win-btn {
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: background-color 0.2s;
}

.win-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.win-btn.close:hover {
  background-color: #e81123;
  color: white;
}
</style>
