<template>
  <div 
    class="activity-bar"
    @contextmenu.prevent
  >
    <div class="top-actions">
      <div 
        v-for="panel in panels" 
        :key="panel.key"
        class="action-item"
        :class="{ active: layoutStore.activePanelKey === panel.key && !layoutStore.isCollapsed }"
        @click="handleClick(panel.key)"
        :title="panel.title"
      >
        <n-icon size="24">
          <component :is="panel.icon" />
        </n-icon>
        <div class="active-indicator"></div>
      </div>
    </div>

    <div class="bottom-actions">
      <!-- Future: Settings, Profile etc -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon } from 'naive-ui';
import { useSidebarLayoutStore } from '../../stores/sidebarLayout';
import { panelRegistry } from '../../layout/panelRegistry';

const layoutStore = useSidebarLayoutStore();
const panels = computed(() => panelRegistry.getAll());

function handleClick(key: string) {
  layoutStore.setActivePanel(key);
}
</script>

<style scoped>
.activity-bar {
  width: 48px;
  height: 100%;
  background-color: #f8f8f8; /* Or theme color */
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  user-select: none;
  z-index: 10;
}

.top-actions, .bottom-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 8px;
  padding-bottom: 8px;
}

.action-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  color: #666;
  transition: color 0.2s;
}

.action-item:hover {
  color: #333;
}

.action-item.active {
  color: #18a058; /* Primary color */
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background-color: #18a058;
  border-radius: 0 2px 2px 0;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-item.active .active-indicator {
  opacity: 1;
}
</style>
