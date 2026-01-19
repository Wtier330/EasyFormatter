<template>
  <div class="preview-panel" :class="{ 'compatible-mode': configStore.isCompatibleMode }" tabindex="0" @keydown="handleKeydown">
    
    <!-- Compatible Mode Banner -->
    <div v-if="configStore.isCompatibleMode" class="compatible-banner">
      <div class="banner-content">
        <div class="banner-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="banner-text">
          <div class="banner-title">非标准 JSON (提取模式)</div>
          <div class="banner-desc">{{ configStore.compatibleInfo.message }}</div>
        </div>
      </div>
      <button class="extract-btn" @click="configStore.extractWrapper">
        提取内部 JSON
      </button>
    </div>

    <!-- Transform Result Panel -->
    <div v-if="configStore.transformResult !== null" class="transform-result-panel">
      <div class="result-header">
        <div class="result-title">
          <span class="icon">✨</span>
          <span>变换结果：{{ configStore.transformMode }}</span>
        </div>
        <div class="result-actions">
           <button class="result-btn" @click="copyResult" title="复制结果">复制</button>
           <button class="result-btn close" @click="clearResult" title="关闭">×</button>
        </div>
      </div>
      <div class="result-content">
        <pre>{{ configStore.transformResult }}</pre>
      </div>
    </div>

    <!-- Show RunLog if active, otherwise show Tree -->
    <div class="content-wrapper" v-else>
      <div class="pane-content">
        <JsonTree class="tree-area" ref="jsonTreeRef" :style="{ '--code-font-size': appStore.fontSize + 'px' }" />
        <ErrorsPanel v-if="hasErrors" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useNotification } from 'naive-ui';
import JsonTree from './JsonTree.vue';
import ErrorsPanel from './ErrorsPanel.vue';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';

const configStore = useConfigStore();
const appStore = useAppStore();
const notification = useNotification();

const hasErrors = computed(() => !!configStore.parseError || configStore.validationErrors.length > 0);
const jsonTreeRef = ref<any>(null);

function handleKeydown(e: KeyboardEvent) {
  const isCtrlOrCmd = e.ctrlKey || e.metaKey;
  
  // Copy (Ctrl+C)
  if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
    const selection = window.getSelection();
    // If there is a text selection, let native copy handle it
    if (selection && selection.toString()) return;
    
    e.preventDefault();
    if (configStore.transformResult !== null) {
       copyResult();
    } else {
       // In tree mode, copy the raw text as fallback
       navigator.clipboard.writeText(configStore.rawText).then(() => {
          notification.success({ title: '已复制', duration: 1000 });
       }).catch(err => {
          notification.error({ title: '复制失败', content: String(err) });
       });
    }
  }
  
  // Select All (Ctrl+A)
  if (isCtrlOrCmd && (e.key === 'a' || e.key === 'A')) {
    e.preventDefault();
    if (configStore.transformResult !== null) {
       const pre = document.querySelector('.result-content pre');
       if (pre) {
         const range = document.createRange();
         range.selectNodeContents(pre);
         const sel = window.getSelection();
         sel?.removeAllRanges();
         sel?.addRange(range);
       }
    }
    // Tree mode Select All is skipped as it's ambiguous/complex
  }
  // Undo (Ctrl+Z)
  if (isCtrlOrCmd && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (configStore.transformResult !== null) {
      if (configStore.canUndo) {
        configStore.undoTransform();
      }
    } else if (configStore.canUndoDocument) {
      configStore.undoDocument();
    }
  }

  // Redo (Ctrl+Y or Ctrl+Shift+Z)
  if (isCtrlOrCmd && ((!e.shiftKey && (e.key === 'y' || e.key === 'Y')) || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
    e.preventDefault();
    if (configStore.transformResult !== null) {
      if (configStore.canRedo) {
        configStore.redoTransform();
      }
    } else if (configStore.canRedoDocument) {
      configStore.redoDocument();
    }
  }
}

function clearResult() {
  // Clearing result is also an action that should be undoable?
  // If we just set to null, we can't undo it unless we use setTransformResult(null, null)
  configStore.setTransformResult(null, null);
}

async function copyResult() {
  if (configStore.transformResult) {
    try {
      await navigator.clipboard.writeText(configStore.transformResult);
      notification.success({ title: '已复制', duration: 1000 });
    } catch (e) {
      notification.error({ title: '复制失败', content: String(e) });
    }
  }
}
</script>

<style scoped>
.preview-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  overflow: hidden;
}

.content-wrapper {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0; /* Flexbox scroll fix */
}

.pane-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  min-height: 0; /* Flexbox scroll fix */
}

.tree-area {
  flex: 1;
  overflow: hidden;
  min-height: 0; /* Flexbox scroll fix */
}

.compatible-mode {
  border: 2px solid #e6a23c;
}

.compatible-banner {
  background-color: #fdf6ec;
  color: #e6a23c;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #faecd8;
  flex-shrink: 0;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.banner-icon {
  display: flex;
  align-items: center;
}

.banner-text {
  display: flex;
  flex-direction: column;
}

.banner-title {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.2;
}

.banner-desc {
  font-size: 12px;
  opacity: 0.9;
}

.extract-btn {
  background-color: #e6a23c;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.extract-btn:hover {
  background-color: #cf9236;
}

/* Transform Result Styles */
.transform-result-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #fff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #f0f4f8;
  border-bottom: 1px solid #dce3e8;
}

.result-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  color: #606266;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
  color: #333;
}

.result-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.divider {
  width: 1px;
  height: 14px;
  background-color: #dcdfe6;
  margin: 0 4px;
}

.result-btn.close {
  border: none;
  background: transparent;
  font-size: 16px;
  line-height: 1;
  padding: 0 4px;
}

.result-btn.close:hover {
  background-color: #e0e0e0;
  color: #d32f2f;
}

.result-content {
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
  color: #333;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
