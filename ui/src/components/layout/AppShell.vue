<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    
    <div class="main-workspace">
      <div class="main-area" ref="mainArea">
        <!-- 1. Activity Bar -->
        <ActivityBar />

        <!-- 2. Sidebar -->
        <CollapsibleResizableSidebar />

        <!-- 3. Main Content -->
        <div class="content-wrapper" ref="contentWrapper">
            <!-- Files Mode (Always Present) -->
            <transition name="tabs-slide">
              <TabsBar v-if="hasTabs && !isHistoryMode" />
            </transition>
            <FunctionBar />
            
            <!-- Mode 1: Normal Editor Mode -->
            <div class="work-area" v-if="hasTabs && !isHistoryMode">
                <!-- Editor -->
                <div class="editor-area ui-panel" :class="{ 'panel-active': isResizingPreview }">
                    <JsonEditor ref="jsonEditorRef" />
                </div>
                
                <!-- Splitter -->
                <Splitter
                  :always-visible="true"
                  @resize="onResizePreview"
                  @dragStart="isResizingPreview = true"
                  @dragEnd="isResizingPreview = false"
                />

                <!-- Preview -->
                <div
                  class="preview-area ui-panel"
                  :style="{ width: appStore.previewRatio * 100 + '%' }"
                  :class="{ 'panel-active': isResizingPreview }"
                >
                    <PreviewPanel ref="previewRef" />
                </div>
            </div>

            <!-- Mode 2: History Browse Mode (Single Viewer) -->
            <div class="work-area history-browse" v-else-if="isHistoryMode">
              <div class="history-host">
                <HistorySingleViewer 
                  :content="historyWorkspaceStore.selectedRecord ? historyWorkspaceStore.compareContent : historyWorkspaceStore.currentContent" 
                  :record="historyWorkspaceStore.selectedRecord ?? (historyWorkspaceStore.records[0] ?? null)"
                  :language="computedHistoryLanguage"
                  :hash="historyWorkspaceStore.selectedRecord ? historyWorkspaceStore.compareHash : historyWorkspaceStore.currentHash"
                />

                <!-- History Detail Overlay (Inspect Phase) -->
                <div v-if="historyWorkspaceStore.inspectMode" class="history-overlay">
                  <HistoryWorkbench 
                    :currentContent="historyWorkspaceStore.currentContent"
                    :compareContent="historyWorkspaceStore.compareContent"
                    :compareMode="historyWorkspaceStore.compareMode"
                    :language="computedHistoryLanguage"
                  />
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <EmptyState v-else :onNewFile="handleNew" />

        </div>

        <!-- 4. Right Drawer -->
        <div v-if="isDrawerVisible && currentDrawerComponent" class="right-drawer-overlay">
          <div class="drawer-mask" @click="closeDrawer" />

          <div class="right-drawer" :style="{ width: drawerWidthPx }" @click.stop>
            <div class="drawer-resizer" @mousedown.prevent="beginResizeDrawer" />
            <div class="drawer-content">
              <component :is="currentDrawerComponent" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <StatusBar class="footer-area" />
    
    <!-- Drag Overlay -->
    <div v-if="isDragging" class="drag-overlay">
       <div class="drag-content">
          <n-icon size="64"><CloudUploadOutline /></n-icon>
          <div class="drag-text">释放以导入JSON文件</div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue';
import { useMessage, NIcon } from 'naive-ui';
import { CloudUploadOutline } from '@vicons/ionicons5';

// Core Layout Components
import Toolbar from './Toolbar.vue';
import FunctionBar from './FunctionBar.vue';
import StatusBar from './StatusBar.vue';
import ActivityBar from './ActivityBar.vue';
import CollapsibleResizableSidebar from './CollapsibleResizableSidebar.vue';
import Splitter from './Splitter.vue';
import TabsBar from './TabsBar.vue';
import EmptyState from './EmptyState.vue';

// Content Components
import JsonEditor from '../editor/JsonEditor.vue';
import PreviewPanel from '../preview/PreviewPanel.vue';
import HistoryWorkbench from '../history/HistoryWorkbench.vue';
import HistorySingleViewer from '../history/HistorySingleViewer.vue';

// Stores
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { panelRegistry } from '../../layout/panelRegistry';

// Composables
import { useGlobalPaste } from '../../composables/useGlobalPaste';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';
import { useFileDrop } from '../../composables/useFileDrop';
import { useLayoutResponsive } from '../../composables/useLayoutResponsive';
import { usePreviewResize } from '../../composables/usePreviewResize';
import { useDrawerResize } from '../../composables/useDrawerResize';
import { useGlobalKeydown } from '../../composables/useGlobalKeydown';
import { useOpenPaths } from '../../composables/useOpenPaths';
import { analyzeContent } from '../../utils/contentAnalysis';

// Tauri API
import * as tauri from '../../tauri';
const { commands, events } = tauri;

const appStore = useAppStore();
const configStore = useConfigStore();
const historyWorkspaceStore = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const message = useMessage();

useGlobalPaste();
const { handleNew } = useKeyboardShortcuts();

// Use composables
const { isDragging, setupFileDrop, cleanupFileDrop } = useFileDrop();
const { setupResponsive: setupLayoutResponsive, cleanupResponsive: cleanupLayoutResponsive } = useLayoutResponsive();
const { beginResizeDrawer, cleanupDrawerResize } = useDrawerResize();
const { onGlobalKeydown, setupGlobalKeydown, cleanupGlobalKeydown } = useGlobalKeydown();

// Layout Refs
const mainArea = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const jsonEditorRef = ref<any>(null);
const previewRef = ref<any>(null);

const isResizingPreview = ref(false);

// Setup responsive
setupLayoutResponsive();

// Guarded history mode check to avoid store initialization timing issues
const isHistoryMode = computed(() => {
  try {
    return (layoutStore?.activePanelKey ?? 'files') === 'history';
  } catch {
    return false;
  }
});

// Guarded tabs availability to avoid early undefined access
const hasTabs = computed(() => {
  try {
    const tabs = (appStore as any)?.openTabs;
    return Array.isArray(tabs) && tabs.length > 0;
  } catch {
    return false;
  }
});

// Drawer helpers
const isDrawerVisible = computed(() => {
  try {
    return !!(layoutStore as any)?.drawerVisible;
  } catch {
    return false;
  }
});

// Computed Drawer Component
const currentDrawerComponent = computed(() => {
    try {
      const key = (layoutStore as any)?.activeDrawerKey;
      const panel = key ? panelRegistry.get(key) : undefined;
      if (panel && panel.rightDrawer) {
          return panel.rightDrawer.component ?? null;
      }
      return null;
    } catch {
      return null;
    }
});

const drawerWidthPx = computed(() => `${layoutStore.drawerWidth}px`);

const computedHistoryLanguage = computed(() => {
    const path = historyWorkspaceStore.activeFile?.logical_path || '';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.xml')) return 'xml';
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    return 'json';
});


// Responsive & Drag Logic (Preserved from old AppShell but cleaned up)
const WINDOW_BREAKPOINT = 1200;

function checkResponsive() {
  if (window.innerWidth < WINDOW_BREAKPOINT) {
     if (!layoutStore.isCollapsed && layoutStore.sidebarWidth > 300) {
         // Maybe auto shrink?
     }
  }
}

// Preview Resize
const { onResizePreview } = usePreviewResize(contentWrapper);

function closeDrawer() {
  layoutStore.closeRightDrawer();
}

let raf = 0;
watch(
  () => appStore.previewRatio,
  () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      jsonEditorRef.value?.layout?.();
      previewRef.value?.layout?.();
      previewRef.value?.refresh?.();
      window.dispatchEvent(new Event('resize'));
    });
  }
);

// Drag & Drop (Preserved)
let unlistenOpenPaths: (() => void) | undefined;

async function openPaths(paths: string[]) {
  const normalized = Array.isArray(paths) ? paths.filter(Boolean) : [];
  if (normalized.length === 0) return;

  let lastPath = '';
  for (const path of normalized) {
    const name = path.split(/[/\\]/).pop() || path;
    appStore.ensureTab(path, name);
    appStore.addRecentFile(path);
    lastPath = path;
  }

  if (!lastPath) return;
  const tab = appStore.openTabs.find(t => t.path === lastPath);
  if (tab) {
    appStore.setActive(tab.id);
  }
  await configStore.loadFile(lastPath);
  const analysis = analyzeContent(configStore.rawText);
  if (analysis.type === 'jsonp') {
    configStore.updateText(analysis.content);
    message.info('已自动提取 JSONP 内容');
  }
}

onMounted(async () => {
    setupGlobalKeydown();
    setupFileDrop();
    window.addEventListener('resize', checkResponsive);

    try {
      const pending = await commands.takePendingOpenPaths();
      await openPaths(pending);
    } catch {}

    try {
      unlistenOpenPaths = await events.onOpenPaths(async (paths) => {
        await openPaths(paths);
      });
    } catch {}
});

onUnmounted(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener('resize', checkResponsive);
  cleanupDrawerResize();
  cleanupFileDrop();
  cleanupGlobalKeydown();
  cleanupLayoutResponsive();
  if (unlistenOpenPaths) unlistenOpenPaths();
});
</script>

<style scoped>
.app-shell {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fff;
  padding-top: 32px;
  box-sizing: border-box;
}

.header-area {
  flex-shrink: 0;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.footer-area {
  flex-shrink: 0;
  background-color: #fff;
  border-top: 1px solid #e0e0e0;
}

.main-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  position: relative;
}

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 0;
  gap: 0;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
  background-color: #fff;
}

.work-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0;
}

.history-host {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  display: flex;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #fff;
  overflow: hidden;
}

.preview-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #fff;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

.right-drawer {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  border-left: 1px solid #e0e0e0;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
}

.drawer-content {
    flex: 1;
    overflow: hidden;
}

.right-drawer-overlay {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: 100%;
  z-index: 200;
  pointer-events: none;
}

.drawer-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.08);
  pointer-events: auto;
}

.right-drawer {
  pointer-events: auto;
}

.drawer-resizer {
  position: absolute;
  left: -4px;
  top: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
}

.empty-guide {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f9f9f9;
}

/* Drag Overlay Styles */
.drag-overlay {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  height: 90%;
  background: rgba(240, 240, 255, 0.85);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 3px dashed #2080f0;
  border-radius: 16px;
  backdrop-filter: blur(6px);
  pointer-events: none;
  transition: all 0.3s ease;
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #2080f0;
  animation: bounce 1s infinite;
}

.drag-text {
  font-size: 24px;
  margin-top: 16px;
  font-weight: bold;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.tabs-slide-enter-active,
.tabs-slide-leave-active {
  transition: opacity 0.16s ease-out, transform 0.16s ease-out;
}

.tabs-slide-enter-from,
.tabs-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.history-overlay {
  position: absolute;
  top: 44px;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 100;
  display: flex;
  flex-direction: column;
}
</style>
