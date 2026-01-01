<template>
  <div class="tabs-bar" @wheel.prevent @dblclick="onDoubleClick">
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
import { ref, nextTick, onMounted, onBeforeUnmount, h, watch } from 'vue';
import { NDropdown, useDialog, NCheckbox } from 'naive-ui';
import Sortable from 'sortablejs';
import { useAppStore } from '../../stores/app';
import { useConfigStore } from '../../stores/config';
import { commands } from '../../tauri';
import { useKeyboardShortcuts } from '../../composables/useKeyboardShortcuts';

const appStore = useAppStore();
const configStore = useConfigStore();
const dialog = useDialog();
const scrollEl = ref<HTMLElement | null>(null);
let sortable: Sortable | null = null;

const { handleNew } = useKeyboardShortcuts({ registerListeners: false });

function onDoubleClick(e: MouseEvent) {
  // Prevent if clicking on a tab or its children
  if ((e.target as HTMLElement).closest('.tab-item')) return;
  
  handleNew();
}

function commitActiveBuffer() {
  const active = appStore.openTabs.find(t => t.id === appStore.activeTabId);
  if (!active) return;
  active.cachedText = configStore.rawText;
  active.originalHash = configStore.originalHash;
  active.isDirty = configStore.isDirty;
}

async function loadTabContent(id: string) {
  const target = appStore.openTabs.find(t => t.id === id);
  if (!target) {
      configStore.setActiveBuffer(null, '', false);
      return;
  }
  
  let text = '';
  try {
    text = target.cachedText ?? (target.path ? await commands.readText(target.path) : '');
  } catch (e) {
    console.error(`[TabsBar] Failed to load content for tab ${target.name}:`, e);
    // If read fails, maybe the file is gone? We could close it, but that might cause a loop if next one is also gone.
    // For now, just show empty or error state.
    text = ''; 
  }
  
  configStore.setActiveBuffer(target.path || null, text, !!target.isDirty, target.originalHash);
  nextTick(() => {
    const el = scrollEl.value?.querySelector(`.tab-item.active`) as HTMLElement | null;
    el?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  });
}

// Watch active tab changes to sync content
watch(() => appStore.activeTabId, (newId) => {
    loadTabContent(newId);
}, { immediate: true });

async function activate(id: string) {
  if (appStore.activeTabId === id) return;
  commitActiveBuffer();
  appStore.activeTabId = id;
}

function performClose(id: string) {
  appStore.removeTab(id);
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
    filter: ".close-btn", // Ignore drag on close button
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
  height: 36px;
  background-color: #f0f0f0; /* Postman-like light gray background */
  border-bottom: 1px solid #e0e0e0;
  user-select: none;
  position: relative;
  box-sizing: border-box;
}

.tabs-scroll {
  flex: 1;
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  padding-top: 4px; /* Space for the top active border to sit nicely */
  padding-left: 0;
}

.tabs-scroll::-webkit-scrollbar {
  height: 0px;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0 16px; /* Wider padding like Postman */
  min-width: 120px;
  max-width: 200px;
  height: 32px; /* Matches (tabs-bar height - padding-top) */
  background-color: transparent;
  border-right: 1px solid transparent; /* Clean default state */
  border-left: 1px solid transparent;
  border-top: 2px solid transparent;
  font-size: 13px;
  color: #6b6b6b;
  cursor: pointer;
  position: relative;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-sizing: border-box;
  margin-right: 0;
  border-top-left-radius: 2px;
  border-top-right-radius: 2px;
}

/* Hover effect */
.tab-item:hover {
  background-color: #e6e6e6;
  color: #212121;
}

/* Active State - Postman Style */
.tab-item.active {
  background-color: #fff;
  color: #212121;
  border-top: 2px solid #FF6C37; /* Postman Orange */
  border-right: 1px solid #e0e0e0;
  border-left: 1px solid #e0e0e0;
  /* Cover the bottom border of the tabs-bar to merge with content */
  margin-bottom: -1px; 
  padding-bottom: 1px;
  z-index: 1;
}

/* Separator lines between inactive tabs (optional, but Postman usually keeps it clean) */
.tab-item:not(.active) {
  border-right: 1px solid transparent; 
}
.tab-item:not(.active):hover {
    background-color: #e1e1e1;
}

/* Remove the old bottom indicator */
.tab-item.active::after,
.tab-item::after {
  display: none;
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 8px;
  font-weight: 400; /* Regular weight usually */
}
.tab-item.active .tab-name {
    font-weight: 500; /* Slightly bolder for active */
}

.scratch-tag {
  color: #FF6C37; /* Match accent color */
  font-size: 16px;
  margin-right: 4px;
  line-height: 1;
  font-weight: bold;
}

.tab-status {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0; /* Hidden by default */
  transition: opacity 0.2s;
}

.tab-item:hover .tab-status,
.tab-item.active .tab-status {
  opacity: 1; /* Show on hover or active */
}

/* Dirty state logic - always show dot if dirty and not hovering */
.tab-item .tab-status.dirty {
  opacity: 1;
}

.close-btn {
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: #757575;
  width: 18px;
  height: 18px;
  line-height: 16px;
  border-radius: 4px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}

.close-btn:hover {
  background-color: #e0e0e0;
  color: #212121;
}

/* Dirty Indicator Style */
.dirty-group {
  position: relative;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dirty-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #FF6C37; /* Orange dot */
  border: none;
  pointer-events: none;
}

.dirty-close {
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  transition: opacity 0.2s;
}

/* Show close button on hover over the dirty group or the tab */
.tab-item:hover .dirty-close,
.dirty-group:hover .dirty-close {
  opacity: 1;
}

.tab-item:hover .dirty-indicator,
.dirty-group:hover .dirty-indicator {
  opacity: 0;
}

/* Normal close button */
.normal-close {
  opacity: 1; /* Controlled by parent .tab-status opacity */
}
</style>