<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    
    <div class="main-area" ref="mainArea">
      <!-- Sidebar -->
      <div 
        class="sidebar-area" 
        :style="{ width: appStore.sidebarWidth + 'px' }"
      >
        <SidebarFiles />
      </div>
      
      <!-- Splitter 1 -->
      <Splitter 
        @resize="onResizeSidebar" 
      />
      
      <!-- Content Wrapper for Editor and Preview -->
      <div class="content-wrapper">
        <!-- Editor (Main) -->
        <div 
          class="editor-area ui-panel"
          :class="{ 'panel-active': isResizingPreview }"
        >
          <JsonEditor />
        </div>
        
        <!-- Splitter 2 -->
        <Splitter 
          @resize="onResizePreview" 
          @dragStart="isResizingPreview = true"
          @dragEnd="isResizingPreview = false"
        />
        
        <!-- Preview -->
        <div 
          class="preview-area ui-panel" 
          :style="{ width: appStore.previewWidth + 'px' }"
          :class="{ 'panel-active': isResizingPreview }"
        >
          <PreviewPanel />
        </div>
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
const isResizingPreview = ref(false);

function onResizeSidebar(delta: number) {
  const proposedWidth = appStore.sidebarWidth + delta;
  
  // Hard limits + Percentage safety check (approximate)
  if (proposedWidth < 150) return;
  if (mainArea.value && proposedWidth > mainArea.value.clientWidth * 0.4) return;

  appStore.sidebarWidth = proposedWidth;
}

function onResizePreview(delta: number) {
  // delta > 0 => preview shrinks
  const proposedWidth = appStore.previewWidth - delta;
  
  if (proposedWidth < 200) return;
  if (mainArea.value && proposedWidth > mainArea.value.clientWidth * 0.6) return;

  appStore.previewWidth = proposedWidth;
}
</script>

<style scoped>
.app-shell {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #f5f7fa; /* Unified background */
}
.header-area {
  flex-shrink: 0;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
}
.footer-area {
  flex-shrink: 0;
  background-color: #fff;
  border-top: 1px solid #e5e7eb;
}
.main-area {
  flex: 1;
  display: flex;
  min-height: 0; /* Fix flex overflow */
}
.sidebar-area {
  flex-shrink: 0;
  background-color: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
}
.content-wrapper {
  flex: 1;
  display: flex;
  min-width: 0;
  padding: 12px 12px 12px 0; /* Padding for editor/preview area */
  gap: 0; /* Gap handled by splitter width */
}
.ui-panel {
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
  padding: var(--panel-padding);
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.panel-active {
  border-color: var(--panel-border-active);
}
.editor-area {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
}
.preview-area {
  flex-shrink: 0;
  height: 100%;
}
</style>
