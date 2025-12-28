<template>
  <div class="tabs-bar" @wheel.prevent>
    <div class="tabs-scroll" ref="scrollEl">
      <div 
        v-for="tab in appStore.openTabs" 
        :key="tab.id" 
        class="tab-item" 
        :class="{ 
          active: tab.id === appStore.activeTabId, 
          dirty: tab.isDirty
        }"
        @mousedown="activate(tab.id)"
        @auxclick="onAuxClick($event, tab)"
        @contextmenu.prevent="openContextMenu($event, tab)"
        :title="tab.path || tab.name"
      >
        <span class="tab-name" :class="{ dirty: tab.isDirty }">
          <span v-if="tab.type === 'scratch'" style="color: #f59e0b; margin-right: 4px;">•</span>
          {{ tab.name }}
        </span>
        <div class="tab-status">
          <template v-if="tab.isDirty">
            <div class="dirty-group">
              <button class="dirty-indicator" title="未保存" />
              <button class="close-btn dirty-close" @click.stop="closeTab(tab.id)" title="关闭">×</button>
            </div>
          </template>
          <button v-else class="close-btn normal-close" @click.stop="closeTab(tab.id)" title="关闭">×</button>
        </div>
      </div>
    </div>
    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="menuX"
      :y="menuY"
      :options="menuOptions"
      :show="menuShow"
      @clickoutside="menuShow=false"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onBeforeUnmount, h } from 'vue';
import { NDropdown, useDialog, NCheckbox } from 'naive-ui';
import Sortable from 'sortablejs';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';

const appStore = useAppStore();
const configStore = useConfigStore();
const dialog = useDialog();
const scrollEl = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

function commitActiveBuffer() {
  const active = appStore.openTabs.find(t => t.id === appStore.activeTabId);
  if (!active) return;
  active.cachedText = configStore.rawText;
  active.originalText = configStore.originalText;
  active.isDirty = configStore.isDirty;
}

async function activate(id: string) {
  if (appStore.activeTabId === id) return;
  commitActiveBuffer();
  const target = appStore.openTabs.find(t => t.id === id);
  if (!target) return;
  appStore.activeTabId = id;
  const text = target.cachedText ?? (target.path ? await commands.readText(target.path) : '');
  
  if (target.originalText !== undefined) {
    configStore.originalText = target.originalText;
  } else {
    if (!target.isDirty) {
       configStore.originalText = text;
    } else {
       configStore.originalText = ''; 
    }
  }

  configStore.setActiveBuffer(target.path || null, text, !!target.isDirty);
  nextTick(() => {
    const el = scrollEl.value?.querySelector(`.tab-item.active`) as HTMLElement | null;
    el?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  });
}

function performClose(id: string) {
  const idx = appStore.openTabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  const wasActive = appStore.openTabs[idx].id === appStore.activeTabId;
  appStore.openTabs.splice(idx, 1);
  if (wasActive) {
    const next = appStore.openTabs[idx] || appStore.openTabs[idx - 1] || appStore.openTabs[0];
    if (next) activate(next.id);
    else configStore.setActiveBuffer(null, '', false);
  }
}

function closeTab(id: string) {
  const tab = appStore.openTabs.find(t => t.id === id);
  if (!tab) return;

  if (tab.type === 'scratch' && tab.isDirty && appStore.scratchClosePrompt) {
    const noPrompt = ref(false);
    dialog.warning({
      title: '关闭临时文件',
      content: () => h('div', [
        h('p', { style: 'margin-bottom: 12px;' }, '该临时文件尚未保存，确定要关闭吗？关闭后内容将丢失。'),
        h(NCheckbox, {
          onUpdateChecked: (v: boolean) => noPrompt.value = v
        }, { default: () => '不再提示' })
      ]),
      positiveText: '确定关闭',
      negativeText: '取消',
      onPositiveClick: () => {
        if (noPrompt.value) {
          appStore.scratchClosePrompt = false;
        }
        performClose(id);
      }
    });
    return;
  }

  performClose(id);
}

function onAuxClick(e: MouseEvent, tab: any) {
  if (e.button === 1) closeTab(tab.id); // middle click
}

// Context Menu
const menuX = ref(0);
const menuY = ref(0);
const menuShow = ref(false);
const menuTab = ref<any>(null);
const menuOptions = [
  { label: '关闭', key: 'close' },
  { label: '关闭其它', key: 'closeOthers' },
  { label: '关闭全部', key: 'closeAll' }
];

function openContextMenu(e: MouseEvent, tab: any) {
  menuX.value = e.clientX;
  menuY.value = e.clientY;
  menuTab.value = tab;
  menuShow.value = true;
}

function handleMenuSelect(key: string) {
  menuShow.value = false;
  if (!menuTab.value) return;
  if (key === 'close') closeTab(menuTab.value.id);
  else if (key === 'closeOthers') {
    const keepId = menuTab.value.id;
    const keep = appStore.openTabs.find(t => t.id === keepId);
    appStore.openTabs = keep ? [keep] : [];
    if (appStore.activeTabId !== keepId) {
       if (keep) activate(keepId);
       else configStore.setActiveBuffer(null, '', false);
    }
  } else if (key === 'closeAll') {
    appStore.openTabs = [];
    configStore.setActiveBuffer(null, '', false);
  }
}

// Sortable Integration
onMounted(() => {
  if (!scrollEl.value) return;
  
  sortable = new Sortable(scrollEl.value, {
    draggable: ".tab-item", // Explicitly specify draggable items
    animation: 300, // 0.3s ease animation
    easing: "cubic-bezier(0.25, 1, 0.5, 1)",
    delay: 0,
    direction: 'horizontal',
    forceFallback: true, // Use JS-based drag to avoid browser inconsistencies (especially in WebView)
    fallbackTolerance: 3, // Allow 3px movement before starting drag
    ghostClass: 'tab-ghost',
    chosenClass: 'tab-chosen',
    dragClass: 'tab-drag',
    onEnd: (evt) => {
      const { oldIndex, newIndex } = evt;
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== newIndex) {
        // Update the store's array to match the new order
        const tabs = [...appStore.openTabs];
        const [movedItem] = tabs.splice(oldIndex, 1);
        tabs.splice(newIndex, 0, movedItem);
        appStore.openTabs = tabs;
      }
    }
  });
});

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});
</script>

<style scoped>
.tabs-bar {
  display: flex;
  height: 35px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
  position: relative;
}

.tabs-scroll {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-scroll::-webkit-scrollbar {
  height: 0px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 10px;
  min-width: 120px;
  max-width: 200px;
  height: 100%;
  background-color: #e0e0e0;
  border-right: 1px solid #d0d0d0;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  position: relative;
}

.tab-item:hover {
  background-color: #e8e8e8;
}

.tab-item.active {
  background-color: #fff;
  color: #333;
  border-bottom: 1px solid #fff;
}

.tab-item.active::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--tab-indicator-color, #22773e);
  opacity: 1;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;
}

.tab-item::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--tab-indicator-color, #22773e);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 2;
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
}

.scratch-tag {
  color: #d03050;
  border: 1px solid #d03050;
  font-size: 10px;
  padding: 0 3px;
  border-radius: 3px;
  margin-right: 6px;
  height: 16px;
  line-height: 14px;
  display: inline-block;
  vertical-align: text-bottom;
}

.tab-status {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #999;
  width: 16px;
  height: 16px;
  line-height: 14px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: rgba(0,0,0,0.1);
  color: #333;
}

/* Dirty state logic */
.dirty-group {
  position: relative;
  width: 16px;
  height: 16px;
}

.dirty-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #999;
  border: none;
  position: absolute;
  top: 4px;
  left: 4px;
  pointer-events: none;
}

.dirty-close {
  opacity: 0;
  position: absolute;
  top: 0;
  left: 0;
}

/* Show close button on hover over the whole tab or the close group */
.tab-item:hover .dirty-close,
.dirty-group:hover .dirty-close {
  opacity: 1;
}

/* Hide dot when close button is shown (via opacity overlap) */
.tab-item:hover .dirty-indicator {
  opacity: 0; 
}

/* Normal close button opacity */
.normal-close {
  opacity: 0.5;
}
.tab-item:hover .normal-close {
  opacity: 1;
}
</style>