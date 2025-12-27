<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    <FunctionBar />
    
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
      <div class="content-wrapper" ref="contentWrapper">
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
          :style="{ width: (appStore.previewRatio * 100) + '%' }"
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
import FunctionBar from './FunctionBar.vue';
import StatusBar from './StatusBar.vue';
import SidebarFiles from './SidebarFiles.vue';
import Splitter from './Splitter.vue';
import JsonEditor from '../editor/JsonEditor.vue';
import PreviewPanel from '../preview/PreviewPanel.vue';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();
const mainArea = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const isResizingPreview = ref(false);

function onResizeSidebar(delta: number) {
  const proposedWidth = appStore.sidebarWidth + delta;
  
  // Hard limits + Percentage safety check (approximate)
  if (proposedWidth < 150) return;
  if (mainArea.value && proposedWidth > mainArea.value.clientWidth * 0.4) return;

  appStore.sidebarWidth = proposedWidth;
}

function onResizePreview(delta: number) {
  if (!contentWrapper.value) return;
  
  const containerWidth = contentWrapper.value.clientWidth;
  if (containerWidth <= 0) return;

  // Calculate current width in pixels from ratio
  const currentPx = containerWidth * appStore.previewRatio;
  
  // delta > 0 => preview shrinks
  const proposedPx = currentPx - delta;
  
  // Convert to ratio
  let newRatio = proposedPx / containerWidth;

  // Constraints: 20% to 80%
  if (newRatio < 0.2) newRatio = 0.2;
  if (newRatio > 0.8) newRatio = 0.8;
  
  // Min pixel check (e.g. 200px) for both Preview and Editor
  // Ensure Preview is at least 200px
  if (newRatio * containerWidth < 200) {
    newRatio = 200 / containerWidth;
  }
  // Ensure Editor (remaining space) is at least 200px
  if ((1 - newRatio) * containerWidth < 200) {
    newRatio = (containerWidth - 200) / containerWidth;
  }
  
  // Safety clamp 0.1-0.9 to prevent total collapse
  if (newRatio < 0.1) newRatio = 0.1;
  if (newRatio > 0.9) newRatio = 0.9;

  appStore.previewRatio = newRatio;
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
  padding-top: 32px; /* 与 toolbar 高度一致 */
  height: 100vh;
  box-sizing: border-box;
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
  overflow: hidden;
  position: relative;
  /* Add padding to create separation from window edges if desired, 
     but usually IDEs fill the space. 
     Based on "unified UI", let's keep it flush but use internal padding in panels. */
  padding: 8px; /* Outer padding for the floating panel look */
  gap: 0; /* Gap is handled by Splitter */
}

.sidebar-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
  /* Optional: shadow */
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  /* No border/bg for wrapper itself, it just holds Editor+Splitter+Preview */
}

.editor-area {
  flex: 1; /* Takes remaining space */
  display: flex;
  flex-direction: column;
  min-width: 0; /* Important for flex child text truncation */
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
}

.preview-area {
  flex-shrink: 0; /* Fixed width based on style */
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
}

/* Panel Active State for resizing visualization */
.panel-active {
  border-color: var(--panel-border-active);
  transition: border-color 0.2s;
}

/* Unified Panel Class (can be moved to global if needed) */
.ui-panel {
  overflow: hidden; /* Ensure content doesn't spill rounded corners */
}
</style>