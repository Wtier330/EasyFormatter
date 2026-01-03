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
            <!-- History Mode -->
            <template v-if="isHistoryMode">
                <HistoryWorkbench 
                    v-if="historyWorkspaceStore.compareMode"
                    :currentContent="historyWorkspaceStore.currentContent"
                    :compareContent="historyWorkspaceStore.compareContent"
                    :compareMode="historyWorkspaceStore.compareMode"
                />
                <div v-else class="empty-guide">
                    <n-empty description="请选择左侧文件查看历史" style="margin-top: 100px" />
                </div>
            </template>

            <!-- Files Mode (Default) -->
            <template v-else>
                <transition name="tabs-slide">
                  <TabsBar v-if="hasTabs" />
                </transition>
                <FunctionBar />
                
                <div class="work-area" v-if="hasTabs">
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
                <EmptyState v-else :onNewFile="handleNew" />
            </template>
        </div>

        <!-- 4. Right Drawer -->
        <div 
            v-if="isDrawerVisible && currentDrawerComponent"
            class="right-drawer"
            :style="{ width: drawerWidthPx }"
        >
             <div class="drawer-header">
                <div class="drawer-title"></div>
                <div class="drawer-close" @click="layoutStore.closeRightDrawer">
                   <n-icon size="16"><CloseOutline /></n-icon>
                </div>
             </div>
             <div class="drawer-content">
                 <component :is="currentDrawerComponent" />
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
import { useMessage, NIcon, NEmpty } from 'naive-ui';
import { CloseOutline, CloudUploadOutline } from '@vicons/ionicons5';

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

// Stores
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { panelRegistry } from '../../layout/panelRegistry';

// Composables
import { useGlobalPaste } from '../../composables/useGlobalPaste';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';
import { events, commands } from '../../tauri';
import { analyzeContent } from '../../utils/contentAnalysis';

const appStore = useAppStore();
const configStore = useConfigStore();
const historyWorkspaceStore = useHistoryWorkspaceStore();
const layoutStore = useSidebarLayoutStore();
const message = useMessage();

useGlobalPaste();
const { handleNew } = useKeyboardShortcuts();

// Layout Refs
const mainArea = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const jsonEditorRef = ref<any>(null);
const previewRef = ref<any>(null);

const isResizingPreview = ref(false);
const isDragging = ref(false);

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

// Drawer guards
const isDrawerVisible = computed(() => {
  try {
    return !!(layoutStore as any)?.drawerVisible;
  } catch {
    return false;
  }
});
const drawerWidthPx = computed(() => {
  try {
    const w = (layoutStore as any)?.drawerWidth ?? 0;
    return `${w}px`;
  } catch {
    return '0px';
  }
});

// Computed Drawer Component
const currentDrawerComponent = computed(() => {
    try {
      const key = (layoutStore as any)?.activePanelKey;
      const panel = key ? panelRegistry.get(key) : undefined;
      if (panel && panel.rightDrawer) {
          return panel.rightDrawer.component ?? null;
      }
      return null;
    } catch {
      return null;
    }
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

// Preview Resize Logic (Preserved)
function onResizePreview(delta: number) {
  const el = contentWrapper.value;
  if (!el) return;

  const W = el.clientWidth;
  if (W <= 0) return;

  const cur = W * appStore.previewRatio;
  let next = cur - delta;

  const MIN_PANEL = 200;
  const minByRatio = W * 0.2;
  const maxByRatio = W * 0.8;

  const minPreview = Math.max(MIN_PANEL, minByRatio);
  const maxPreview = Math.min(W - MIN_PANEL, maxByRatio);

  if (maxPreview <= minPreview) {
    next = Math.max(MIN_PANEL, Math.min(cur, W - MIN_PANEL));
  } else {
    next = Math.max(minPreview, Math.min(next, maxPreview));
  }

  appStore.previewRatio = next / W;
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
let unlistenDrop: (() => void) | undefined;
let unlistenHover: (() => void) | undefined;
let unlistenCancel: (() => void) | undefined;

onMounted(async () => {
    window.addEventListener('resize', checkResponsive);
    
    unlistenHover = await events.onFileDropHover(() => {
        isDragging.value = true;
    });

    unlistenCancel = await events.onFileDropCancelled(() => {
        isDragging.value = false;
    });

    unlistenDrop = await events.onFileDrop(async (payload) => {
        isDragging.value = false;
        const paths = Array.isArray(payload) ? payload : (payload as any).paths || [];
        if (!paths || paths.length === 0) return;

        let addedCount = 0;
        let lastSuccessPath = '';

        for (const path of paths) {
            try {
                const stats = await commands.stat(path);
                if (stats.size > 10 * 1024 * 1024) {
                    message.warning(`文件 ${path} 较大...`);
                }

                let content = '';
                try {
                    content = await commands.readText(path);
                } catch (readErr) {
                    // (Simplified Error Handling from previous version)
                    message.error(`无法读取文件 ${path}: ${readErr}`);
                    continue;
                }

                analyzeContent(content);
                // @ts-ignore
                const mtime = stats.mtime ? new Date(stats.mtime).getTime() : Date.now();
                appStore.addRecentFile(path, stats.size, mtime);
                addedCount++;
                lastSuccessPath = path;
                const name = path.split(/[/\\]/).pop() || path;
                appStore.ensureTab(path, name);
            } catch (e) {
                console.error(e);
            }
        }
        
        if (addedCount > 0) {
            message.success(`已导入 ${addedCount} 个文件`);
            if (lastSuccessPath) {
                 const tab = appStore.openTabs.find(t => t.path === lastSuccessPath);
                 if (tab) {
                     appStore.setActive(tab.id);
                     await configStore.loadFile(lastSuccessPath);
                     const currentText = configStore.rawText;
                     const analysis = analyzeContent(currentText);
                     if (analysis.type === 'jsonp') {
                         configStore.updateText(analysis.content);
                         message.info('已自动提取 JSONP 内容');
                     }
                 }
            }
        }
    });
});

onUnmounted(() => {
  cancelAnimationFrame(raf);
  window.removeEventListener('resize', checkResponsive);
  if (unlistenDrop) unlistenDrop();
  if (unlistenHover) unlistenHover();
  if (unlistenCancel) unlistenCancel();
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
    flex-shrink: 0;
    border-left: 1px solid #e0e0e0;
    background: #fff;
    display: flex;
    flex-direction: column;
}

.drawer-header {
    height: 32px; /* Or hidden */
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 8px;
    border-bottom: 1px solid #f0f0f0;
}

.drawer-close {
    cursor: pointer;
    color: #999;
}
.drawer-close:hover {
    color: #333;
}

.drawer-content {
    flex: 1;
    overflow: hidden;
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
</style>
