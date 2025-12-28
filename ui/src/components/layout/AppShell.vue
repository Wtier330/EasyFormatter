<template>
  <div class="app-shell">
    <Toolbar class="header-area" />
    <FunctionBar />
    <TabsBar />

    <div class="main-area" ref="mainArea">
      <!-- Sidebar -->
      <div
        class="sidebar-area"
        :style="{ width: appStore.sidebarWidth + 'px' }"
      >
        <SidebarFiles />
      </div>

      <!-- Splitter 1: Sidebar Splitter -->
      <Splitter @resize="onResizeSidebar" />

      <!-- Content Wrapper for Editor and Preview -->
      <div class="content-wrapper" ref="contentWrapper">
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
    </div>

    <StatusBar class="footer-area" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';
import Toolbar from './Toolbar.vue';
import FunctionBar from './FunctionBar.vue';
import StatusBar from './StatusBar.vue';
import SidebarFiles from './SidebarFiles.vue';
import Splitter from './Splitter.vue';
import TabsBar from './TabsBar.vue';
import JsonEditor from '../editor/JsonEditor.vue';
import PreviewPanel from '../preview/PreviewPanel.vue';
import { useAppStore } from '../../stores/app';

const appStore = useAppStore();

const mainArea = ref<HTMLElement | null>(null);
const contentWrapper = ref<HTMLElement | null>(null);
const isResizingPreview = ref(false);

/**
 * 这两个 ref 是“可选增强”：
 * - 如果 JsonEditor/PreviewPanel 用 defineExpose({ layout }) 暴露方法，就能在拖拽后强制刷新布局
 * - 如果没有暴露，也不会报错（我们做了可选链）
 */
const jsonEditorRef = ref<any>(null);
const previewRef = ref<any>(null);

/** Sidebar resize（你原有逻辑保留，仅做微调更安全） */
function onResizeSidebar(delta: number) {
  const proposedWidth = appStore.sidebarWidth + delta;

  // hard min
  if (proposedWidth < 150) return;

  // prevent sidebar eating too much space
  const max = mainArea.value ? mainArea.value.clientWidth * 0.4 : Infinity;
  if (proposedWidth > max) return;

  appStore.sidebarWidth = proposedWidth;
}

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
});
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
}

.content-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-width: 0; /* 重要：防止 flex 子元素撑破导致布局异常 */
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
}

.preview-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background-color: var(--panel-bg-color);
  border: 1px solid var(--panel-border-color);
  border-radius: var(--panel-border-radius);
}

.panel-active {
  border-color: var(--panel-border-active);
  transition: border-color 0.2s;
}

.ui-panel {
  overflow: hidden; /* Ensure content doesn't spill rounded corners */
}
</style>
