<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    
    <div class="main-area" ref="mainArea">
      <!-- Sidebar -->
      <div class="sidebar-area" :style="{ width: appStore.sidebarWidth + 'px' }">
        <SidebarFiles />
      </div>
      
      <!-- Splitter 1 -->
      <Splitter @resize="onResizeSidebar" />
      
      <!-- Editor -->
      <div class="editor-area">
        <JsonEditor />
      </div>
      
      <!-- Splitter 2 -->
      <Splitter @resize="onResizePreview" />
      
      <!-- Preview -->
      <div class="preview-area" :style="{ width: appStore.previewWidth + 'px' }">
        <PreviewPanel />
      </div>
    </div>
    
    <StatusBar class="footer-area" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Toolbar from './Toolbar.vue';
import StatusBar from './StatusBar.vue';
import SidebarFiles from './SidebarFiles.vue';
import Splitter from './Splitter.vue';
import JsonEditor from '../editor/JsonEditor.vue';
import PreviewPanel from '../preview/PreviewPanel.vue';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
const mainArea = ref<HTMLElement | null>(null);

function onResizeSidebar(delta: number) {
  const newWidth = appStore.sidebarWidth + delta;
  if (newWidth >= 150 && newWidth <= 500) {
    appStore.sidebarWidth = newWidth;
  }
}

function onResizePreview(delta: number) {
  // Dragging right splitter right means editor grows, preview shrinks.
  // So delta > 0 => preview shrinks.
  const newWidth = appStore.previewWidth - delta;
  if (newWidth >= 200 && newWidth <= 800) {
    appStore.previewWidth = newWidth;
  }
}
</script>

<style scoped>
.app-shell {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.header-area {
  flex-shrink: 0;
}
.footer-area {
  flex-shrink: 0;
}
.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.sidebar-area {
  flex-shrink: 0;
  overflow: hidden;
}
.editor-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.preview-area {
  flex-shrink: 0;
  overflow: hidden;
}
</style>
