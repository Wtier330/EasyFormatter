<template>
  <div class="sidebar-container-wrapper">
    <div 
      class="sidebar-container"
      :class="{ 'transition-width': !layoutStore.isResizing }"
      :style="{ width: (layoutStore.isCollapsed ? layoutStore.COLLAPSED_WIDTH : layoutStore.sidebarWidth) + 'px' }"
    >
      <!-- Dynamic Panel Component -->
      <component 
        :is="currentPanelComponent" 
        v-if="currentPanelComponent"
        :collapsed="layoutStore.isCollapsed"
        @expand="layoutStore.toggleCollapsed"
      />
    </div>

    <Splitter 
      @resize="onResize" 
      @dragStart="onDragStart"
      @dragEnd="onDragEnd"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { panelRegistry } from '../../layout/panelRegistry';
import Splitter from './Splitter.vue';

const layoutStore = useSidebarLayoutStore();

const currentPanelComponent = computed(() => {
  const panel = panelRegistry.get(layoutStore.activePanelKey);
  return panel ? panel.panelComponent : null;
});

function onResize(delta: number) {
  if (layoutStore.isCollapsed) {
    // If dragging right from collapsed state, expand immediately if delta is significant
    if (delta > 0) {
      layoutStore.setCollapsed(false);
      // Set to a small width initially so user can drag it out
      layoutStore.setSidebarWidth(Math.max(10, delta)); 
    }
    return;
  }

  const newWidth = layoutStore.sidebarWidth + delta;
  const MAX_WIDTH = 800; 
  // Allow dragging down to 0 for snap effect
  layoutStore.setSidebarWidth(Math.min(Math.max(0, newWidth), MAX_WIDTH));
}

function onDragStart() {
  layoutStore.beginResize();
}

function onDragEnd() {
  layoutStore.endResize();
}
</script>

<style scoped>
.sidebar-container-wrapper {
  display: flex;
  height: 100%;
  position: relative;
  flex-shrink: 0;
  user-select: none; /* Prevent selection during drag */
}

.sidebar-container {
  height: 100%;
  background-color: #fff;
  overflow: hidden;
  border-right: 1px solid #eee;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.transition-width {
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
