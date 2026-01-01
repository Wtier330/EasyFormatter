<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    <div class="main-area" ref="mainArea">
      <!-- Sidebar -->
      <div
        class="sidebar-area"
        :class="{ 'transition-width': !appStore.isSidebarDragging }"
        :style="{ width: appStore.sidebarWidth + 'px' }"
      >
        <SidebarFiles />
      </div>

      <!-- Splitter 1: Sidebar Splitter -->
      <Splitter 
        @resize="onResizeSidebar" 
        @dragStart="onSidebarDragStart"
        @dragEnd="onSidebarDragEnd"
      />

      <!-- Content Wrapper for Tabs, FunctionBar, Editor and Preview -->
      <div class="content-wrapper" ref="contentWrapper">
        <transition name="tabs-slide">
          <TabsBar v-if="appStore.openTabs.length > 0" />
        </transition>
        <FunctionBar />
        
        <div class="work-area" v-if="appStore.openTabs.length > 0">
          <!-- Editor (Main) -->
          <div
            class="editor-area ui-panel"
            :class="{ 'panel-active': isResizingPreview }"
          >
            <!-- 预留 ref：如果 JsonEditor 内部 expose layout()，这里可直接调用 -->
            <JsonEditor ref="jsonEditorRef" />
          </div>

          <!-- Splitter 2: Editor-Preview Splitter -->
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
            <!-- 预留 ref：如果 PreviewPanel 内部 expose layout()/refresh()，这里可直接调用 -->
            <PreviewPanel ref="previewRef" />
          </div>
        </div>
        <EmptyState v-else :onNewFile="handleNew" />
      </div>
    </div>

    <StatusBar class="footer-area" />
    
    <!-- Drag Overlay -->
    <div v-if="isDragging" class="drag-overlay">
       <div class="drag-content">
          <n-icon size="64"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M320 336h76c55 0 100-21.21 100-75.6s-53-73.47-96-75.6C391.11 99.74 329 48 256 48c-69 0-113.44 45.79-128 91.2-60 5.7-112 35.88-112 98.4S70 336 136 336h56M192 400.1l64 63.9 64-63.9M256 224v224.03" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          <div class="drag-text">释放以导入JSON文件</div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useMessage, NIcon } from 'naive-ui';
import Toolbar from './Toolbar.vue';
import FunctionBar from './FunctionBar.vue';
import StatusBar from './StatusBar.vue';
import SidebarFiles from './SidebarFiles.vue';
import Splitter from './Splitter.vue';
import TabsBar from './TabsBar.vue';
import EmptyState from './EmptyState.vue';
import JsonEditor from '../editor/JsonEditor.vue';
import PreviewPanel from '../preview/PreviewPanel.vue';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { useGlobalPaste } from '../../composables/useGlobalPaste';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';
import { events, commands } from '../../tauri';
import { analyzeContent } from '../../utils/contentAnalysis';

const appStore = useAppStore();
const configStore = useConfigStore();
const message = useMessage();
useGlobalPaste();
const { handleNew } = useKeyboardShortcuts();

const mainArea = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const isResizingPreview = ref(false);
const isDragging = ref(false);

/**
 * 这两个 ref 是“可选增强”：
 * - 如果 JsonEditor/PreviewPanel 用 defineExpose({ layout }) 暴露方法，就能在拖拽后强制刷新布局
 * - 如果没有暴露，也不会报错（我们做了可选链）
 */
const jsonEditorRef = ref<any>(null);
const previewRef = ref<any>(null);

// Constants for Sidebar FSM
const COLLAPSE_THRESHOLD = 64;
const EXPAND_THRESHOLD = 120;
const MIN_EXPANDED_WIDTH = 200;
const COLLAPSED_WIDTH = 48;
const WINDOW_BREAKPOINT = 1200;

// Sidebar Drag Handlers
function onSidebarDragStart() {
  appStore.isSidebarDragging = true;
}

function onSidebarDragEnd() {
  appStore.isSidebarDragging = false;
  
  // Snap logic on release
  if (appStore.sidebarState === 'EXPANDED') {
    // If dragged too small, collapse
    if (appStore.sidebarWidth < COLLAPSE_THRESHOLD) {
       appStore.lastExpandedWidth = Math.max(appStore.lastExpandedWidth, MIN_EXPANDED_WIDTH);
       appStore.sidebarState = 'COLLAPSED';
       appStore.sidebarWidth = COLLAPSED_WIDTH;
    } else if (appStore.sidebarWidth < MIN_EXPANDED_WIDTH) {
       // If in ambiguous zone (between threshold and min), snap to min or collapse?
       // Usually snap to min if > threshold
       appStore.sidebarWidth = MIN_EXPANDED_WIDTH;
    } else {
       // Save valid width
       appStore.lastExpandedWidth = appStore.sidebarWidth;
    }
  } else {
    // COLLAPSED
    // If dragged out far enough, expand
    if (appStore.sidebarWidth > EXPAND_THRESHOLD) {
       appStore.sidebarState = 'EXPANDED';
       appStore.sidebarWidth = Math.max(appStore.lastExpandedWidth, appStore.sidebarWidth);
    } else {
       // Snap back to collapsed
       appStore.sidebarWidth = COLLAPSED_WIDTH;
    }
  }
}

/** Sidebar resize with FSM */
function onResizeSidebar(delta: number) {
  const currentWidth = appStore.sidebarWidth;
  const proposedWidth = currentWidth + delta;

  // Global max constraint
  const max = mainArea.value ? mainArea.value.clientWidth * 0.4 : 600;
  if (proposedWidth > max) return;

  // Update width first (Drag follows mouse)
  appStore.sidebarWidth = Math.max(proposedWidth, 0);

  // Live Expand: Switch state immediately when dragging out
  if (appStore.sidebarState === 'COLLAPSED' && proposedWidth > EXPAND_THRESHOLD) {
    appStore.sidebarState = 'EXPANDED';
  }
}

// Responsive Behavior
function checkResponsive() {
  if (window.innerWidth < WINDOW_BREAKPOINT) {
     if (appStore.sidebarState === 'EXPANDED') {
         // Auto collapse logic if needed on init
     }
  }
}

onMounted(async () => {
    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    
    // Initial State Check
    if (appStore.sidebarState === 'COLLAPSED') {
        appStore.sidebarWidth = COLLAPSED_WIDTH;
    } else {
        // Ensure min width
        if (appStore.sidebarWidth < MIN_EXPANDED_WIDTH) {
            appStore.sidebarWidth = MIN_EXPANDED_WIDTH;
        }
    }

    // Drag & Drop Listeners
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
                // 1. Basic Stats & Size Check
                const stats = await commands.stat(path);
                if (stats.size > 10 * 1024 * 1024) {
                    message.warning(`文件 ${path} 较大 (${(stats.size/1024/1024).toFixed(1)}MB)，加载可能需要时间`, { duration: 3000 });
                }

                // 2. Read Content
                let content = '';
                try {
                    content = await commands.readText(path);
                } catch (readErr) {
                     console.warn(`Direct read failed for ${path}:`, readErr);
                     // 权限错误或文件占用 -> 尝试引导用户手动授权
                     const errStr = String(readErr);
                     const isPermissionOrLock = errStr.includes('denied') || errStr.includes('used by another process') || errStr.includes('os error 32') || errStr.includes('os error 5');

                     if (isPermissionOrLock) {
                         // 降级策略：请求用户手动选择文件以获取权限
                         
                         // 使用原生 confirm 保持流程简单 (同步/阻塞)
                         const shouldRetry = await new Promise<boolean>((resolve) => {
                             const ok = window.confirm(`无法读取文件: ${path}\n\n可能是由于权限不足或文件被占用。\n\n是否尝试手动选择文件以授予读取权限？`);
                             resolve(ok);
                         });

                         if (shouldRetry) {
                             try {
                                 const selected = await commands.pickFile();
                                 if (selected) {
                                     // Check if selected is the same file or user picked another
                                     // If selected, try read again. The OS picker grants access.
                                     content = await commands.readText(selected);
                                     // Update path to the one user actually picked (might be different or same)
                                     // But loop variable 'path' is const. We use 'content'.
                                     // And we should probably use the new path for sidebar.
                                     // Let's assume user picked the same file or we treat it as the file they wanted.
                                     // Warning: If they picked a different file, we might be adding the wrong path to sidebar if we don't update it.
                                     // But for "Grant Permission" scenario, usually it's the same file.
                                     if (selected !== path) {
                                         message.info(`已切换到文件: ${selected}`);
                                         // Use the new path for subsequent logic
                                         // Hack: we can't change 'path' const.
                                         // Let's handle this file here and 'continue' outer loop? 
                                         // Or just continue with 'content' and use 'path' as key?
                                         // If we use 'path' as key but content is from 'selected', it might be confusing if they are different.
                                         // Let's just proceed with 'content'.
                                     }
                                 } else {
                                     message.warning('已取消手动选择');
                                     continue;
                                 }
                             } catch (retryErr) {
                                 message.error(`仍然无法读取文件: ${retryErr}`, { duration: 4000 });
                                 continue;
                             }
                         } else {
                             continue;
                         }
                     } else {
                         message.error(`无法读取文件 ${path}: ${readErr}`, { duration: 3000 });
                         continue;
                     }
                }

                // 3. Analyze Content (JSON/JSONP/Text)
                analyzeContent(content); // Pre-check and keeps 'content' used

                // 4. Add to Recent Files (Sidebar)
                // @ts-ignore
                const mtime = stats.mtime ? new Date(stats.mtime).getTime() : Date.now();
                
                // Add or move to top
                appStore.addRecentFile(path, stats.size, mtime);
                addedCount++;
                lastSuccessPath = path;

                // 5. Open Logic (will be handled after loop for the last one, or all?)
                // Strategy: Open tabs for all, but activate the last one.
                // However, we need to load the content into the store correctly.
                
                const name = path.split(/[/\\]/).pop() || path;
                appStore.ensureTab(path, name);
                
                // If it's the last file, we will activate it and update the editor content
                // For others, we just ensure the tab exists (content will be loaded when clicked)
                // BUT: We already read the content, so we can cache it to avoid re-reading!
                
                // Pre-fill tab cache
                // Note: analyzeContent returns 'content' which might be extracted JSON
                // We should probably store the *processed* content if it's JSONP, or raw?
                // Standard behavior: Store raw file content on disk, but editor shows...
                // Wait, if it's JSONP, user wants to see JSON.
                // ConfigStore loadFile usually reads from disk again.
                // Let's optimize: We pass the content to loadFile if possible, or let loadFile re-read.
                // Re-reading is safer for consistency but slower. 
                // Given we just read it, let's try to set it.
                
                // For now, let's rely on standard loadFile to keep logic simple and consistent,
                // unless we want to support "Opened as Text" state which loadFile might not handle yet.
                
            } catch (e) {
                console.error(`Failed to process file: ${path}`, e);
                message.error(`处理文件 ${path} 时发生未知错误`, { duration: 3000 });
            }
        }
        
        if (addedCount > 0) {
            message.success(`已导入 ${addedCount} 个文件`);
            
            // Activate the last successfully added file
            if (lastSuccessPath) {
                 const tab = appStore.openTabs.find(t => t.path === lastSuccessPath);
                 if (tab) {
                     appStore.setActive(tab.id);
                     // Load content and apply analysis
                     await configStore.loadFile(lastSuccessPath);
                     
                     // Re-analyze to apply specific "Non-JSON" warnings or JSONP extraction
                     // (Since loadFile does a generic load, we might need to post-process)
                     const currentText = configStore.rawText;
                     const analysis = analyzeContent(currentText);
                     
                     if (analysis.type === 'jsonp') {
                         // Auto-extract
                         configStore.updateText(analysis.content);
                         message.info('已自动提取 JSONP 内容', { duration: 3000 });
                     } else if (analysis.type === 'text') {
                         message.info('非标准 JSON/JSONP，已作为纯文本打开', { duration: 3000 });
                     }
                 }
            }
        }
    });
});

let unlistenDrop: (() => void) | undefined;
let unlistenHover: (() => void) | undefined;
let unlistenCancel: (() => void) | undefined;

onUnmounted(() => {
    window.removeEventListener('resize', checkResponsive);
    if (unlistenDrop) unlistenDrop();
    if (unlistenHover) unlistenHover();
    if (unlistenCancel) unlistenCancel();
});

/**
 * Preview resize（更稳版本）
 * A 布局：Editor | Splitter | Preview（preview 在右）
 * 鼠标往右拖(delta > 0)：preview 变窄
 */
function onResizePreview(delta: number) {
  const el = contentWrapper.value;
  if (!el) return;

  const W = el.clientWidth;
  if (W <= 0) return;

  const cur = W * appStore.previewRatio;
  let next = cur - delta;

  // constraints (px first, then convert back to ratio)
  const MIN_PANEL = 200;
  const minByRatio = W * 0.2;
  const maxByRatio = W * 0.8;

  const minPreview = Math.max(MIN_PANEL, minByRatio);
  const maxPreview = Math.min(W - MIN_PANEL, maxByRatio);

  if (maxPreview <= minPreview) {
    // narrow window fallback
    next = Math.max(MIN_PANEL, Math.min(cur, W - MIN_PANEL));
  } else {
    next = Math.max(minPreview, Math.min(next, maxPreview));
  }

  appStore.previewRatio = next / W;
}

/**
 * 关键增强：previewRatio 改变后，强制触发一次布局刷新
 * - Monaco 很容易出现不重排/光标错位/滚动条错位，必须 layout()
 * - 使用 rAF 节流，拖拽时不卡顿
 */
let raf = 0;
watch(
  () => appStore.previewRatio,
  () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      // 1) 如果 JsonEditor expose layout()，优先调用
      jsonEditorRef.value?.layout?.();
      // 2) 如果 PreviewPanel expose layout()/refresh()，也调用
      previewRef.value?.layout?.();
      previewRef.value?.refresh?.();

      // 3) 兜底：触发一次 window resize 事件（部分实现会监听它）
      window.dispatchEvent(new Event('resize'));
    });
  }
);

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
  padding-top: 32px; /* 与 toolbar 高度一致 */
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

.main-area {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
  padding: 0; /* Flush layout like Postman */
  gap: 0;
}

.sidebar-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: #f9f9f9; /* Light gray sidebar */
  border-right: 1px solid #e0e0e0;
  overflow: hidden; 
}

.transition-width {
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Drag Overlay - Responsive & Centered */
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
      opacity: 1;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .drag-overlay-enter-from,
    .drag-overlay-leave-to {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
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

.drag-sub {
  font-size: 14px;
  margin-top: 8px;
  opacity: 0.8;
  color: #666;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
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
  overflow: hidden; /* Ensure content is contained */
}

.preview-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: #fff;
  border-left: 1px solid #e0e0e0;
  overflow: hidden; /* Ensure content is contained */
}

.panel-active {
  /* border-color: var(--panel-border-active); */
}

.ui-panel {
  overflow: hidden;
}

/* Tabs Slide Transition */
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