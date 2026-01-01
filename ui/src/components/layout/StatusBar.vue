<template>
  <div class="status-bar">
    <div class="left">
      <!-- About Button (Leftmost) -->
      <n-tooltip trigger="hover" placement="top">
        <template #trigger>
          <div class="status-item about-trigger" @click="showAbout = true">
            <n-icon size="24">
             <svg t="1767233546088" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5156" width="12" height="12"><path d="M512 85.333333C276.266667 85.333333 85.333333 276.266667 85.333333 512a426.410667 426.410667 0 0 0 291.754667 404.821333c21.333333 3.712 29.312-9.088 29.312-20.309333 0-10.112-0.554667-43.690667-0.554667-79.445333-107.178667 19.754667-134.912-26.112-143.445333-50.133334-4.821333-12.288-25.6-50.133333-43.733333-60.288-14.933333-7.978667-36.266667-27.733333-0.554667-28.245333 33.621333-0.554667 57.6 30.933333 65.621333 43.733333 38.4 64.512 99.754667 46.378667 124.245334 35.2 3.754667-27.733333 14.933333-46.378667 27.221333-57.045333-94.933333-10.666667-194.133333-47.488-194.133333-210.688 0-46.421333 16.512-84.778667 43.733333-114.688-4.266667-10.666667-19.2-54.4 4.266667-113.066667 0 0 35.712-11.178667 117.333333 43.776a395.946667 395.946667 0 0 1 106.666667-14.421333c36.266667 0 72.533333 4.778667 106.666666 14.378667 81.578667-55.466667 117.333333-43.690667 117.333334-43.690667 23.466667 58.666667 8.533333 102.4 4.266666 113.066667 27.178667 29.866667 43.733333 67.712 43.733334 114.645333 0 163.754667-99.712 200.021333-194.645334 210.688 15.445333 13.312 28.8 38.912 28.8 78.933333 0 57.045333-0.554667 102.912-0.554666 117.333334 0 11.178667 8.021333 24.490667 29.354666 20.224A427.349333 427.349333 0 0 0 938.666667 512c0-235.733333-190.933333-426.666667-426.666667-426.666667z" fill="#000000" p-id="5157"></path></svg>
            </n-icon>
          </div>
        </template>
        关于 / GitHub
      </n-tooltip>
      <!-- Git Branch (Placeholder for "Trae" look) -->
      <!-- <div class="status-item git-branch" title="Git Branch">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M384 224a64 64 0 10-64 64 63.88 63.88 0 0013.6-1.5 125.68 125.68 0 01-52.75-34.86A127.35 127.35 0 01256 160V96a64 64 0 10-64 0v64a63.89 63.89 0 001.5 13.6A125.68 125.68 0 01228.36 226a127.35 127.35 0 01-4.7 91.5 63.88 63.88 0 00-13.6-1.5a64 64 0 1064 64v-64a63.89 63.89 0 00-1.5-13.6 125.68 125.68 0 01-34.86-52.36A127.35 127.35 0 01320 256h64a64 64 0 000-32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="192" cy="96" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="384" cy="256" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="192" cy="416" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>
        </n-icon>
        <span>main</span>
      </div> -->
      
      <!-- Errors -->
      <div class="status-item diagnostics error" v-if="errorCount > 0" @click="scrollToErrors" title="Errors">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm75.31 260.69a16 16 0 11-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 01-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0122.62-22.62L256 233.37l52.69-52.68a16 16 0 0122.62 22.62L278.63 256z"/></svg>
        </n-icon>
        <span>{{ errorCount }}</span>
      </div>
      
      <!-- Warnings -->
      <div class="status-item diagnostics warning" v-if="warningCount > 0" @click="scrollToErrors" title="Warnings">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M256 32L32 464h448L256 32zm0 368a24 24 0 1124-24 24 24 0 01-24 24zm22-90h-44l-8-176h60z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 400a24 24 0 1124-24 24 24 0 01-24 24zm22-90h-44l-8-176h60z"/></svg>
        </n-icon>
        <span>{{ warningCount }}</span>
      </div>
    </div>
    
    <div class="right">
      <!-- Cursor -->
      <div class="status-item" title="Go to Line/Column">
        行 {{ configStore.cursorPos.line }}, 列 {{ configStore.cursorPos.col }}
      </div>
      
      <!-- Indent -->
      <n-popover trigger="click" placement="top-end" :show-arrow="false" class="status-popover">
        <template #trigger>
          <div class="status-item" title="Change Indentation">
            空格: {{ appStore.indentSize }}
          </div>
        </template>
        <div class="status-menu">
          <div 
            v-for="size in [1, 2, 3, 4]" 
            :key="size" 
            class="menu-item" 
            :class="{ active: appStore.indentSize === size }"
            @click="setIndent(size)"
          >
            {{ size }} 空格
          </div>
        </div>
      </n-popover>

      <!-- Font Size -->
      <n-popover trigger="click" placement="top-end" :show-arrow="false" class="status-popover">
        <template #trigger>
          <div class="status-item" title="Change Font Size">
            字号: {{ appStore.fontSize }}px
          </div>
        </template>
        <div class="status-menu">
          <div 
            v-for="size in [12, 14, 16, 18, 20]" 
            :key="size" 
            class="menu-item" 
            :class="{ active: appStore.fontSize === size }"
            @click="setFontSize(size)"
          >
            {{ size }}px
          </div>
        </div>
      </n-popover>

      <!-- Encoding -->
      <n-popover trigger="click" placement="top-end" :show-arrow="false" class="status-popover">
        <template #trigger>
          <div class="status-item" title="Change Encoding">
            {{ configStore.encoding.toUpperCase() }}
          </div>
        </template>
        <div class="status-menu">
          <div 
            v-for="enc in ['utf-8', 'gbk', 'ascii', 'iso-8859-1']" 
            :key="enc" 
            class="menu-item" 
            :class="{ active: configStore.encoding === enc }"
            @click="configStore.setEncoding(enc)"
          >
            {{ enc.toUpperCase() }}
          </div>
        </div>
      </n-popover>
      
      <!-- EOL -->
      <n-popover trigger="click" placement="top-end" :show-arrow="false" class="status-popover">
        <template #trigger>
          <div class="status-item" title="Change End of Line Sequence">
            {{ configStore.eol }}
          </div>
        </template>
        <div class="status-menu">
          <div 
            v-for="type in ['LF', 'CRLF']" 
            :key="type" 
            class="menu-item" 
            :class="{ active: configStore.eol === type }"
            @click="configStore.setEol(type as 'LF' | 'CRLF')"
          >
            {{ type }}
          </div>
        </div>
      </n-popover>

    </div>
    <AboutModal v-model:show="showAbout" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NIcon, NPopover, NTooltip } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import AboutModal from '../about/AboutModal.vue';

const configStore = useConfigStore();
const appStore = useAppStore();
const showAbout = ref(false);

const errorCount = computed(() => (configStore.parseError ? 1 : 0) + configStore.validationErrors.length);
const warningCount = computed(() => 0); // Currently we don't have warnings logic, but placeholder for Trae structure

function scrollToErrors() {
  // Logic to focus error panel if needed
}

function setIndent(size: number) {
  appStore.indentSize = size;
  configStore.format();
}

function setFontSize(size: number) {
  appStore.fontSize = size;
}
</script>

<style scoped>
.status-bar {
  height: 22px; /* Trae/VSCode standard height */
  background-color: #f3f3f3; /* Light theme status bar */
  color: #616161;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  user-select: none;
  cursor: default;
  border-top: 1px solid #e5e5e5; /* Subtle top border */
}

.left, .right {
  display: flex;
  height: 100%;
}

.status-item {
  display: flex;
  align-items: center;
  padding: 0 8px;
  height: 100%;
  gap: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.status-item:hover {
  background-color: rgba(0, 0, 0, 0.08); /* Hover effect */
  color: #333;
}

.status-item.diagnostics.error {
  /* color: #e51400; VSCode error red is usually just icon, text is normal. But let's keep it clean. */
}

.lang-brace {
  font-weight: bold;
  margin-right: 2px;
}

.icon-only {
  padding: 0 6px;
}

/* Popover Menu Styles */
.status-menu {
  min-width: 100px;
  padding: 4px 0;
}

.menu-item {
  padding: 4px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: #f3f3f3;
}

.menu-item.active {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

/* About Trigger Animations */
.about-trigger {
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s;
}

.about-trigger:hover {
  transform: scale(1.15);
  background-color: rgba(0, 0, 0, 0.1) !important;
  z-index: 1;
}

.about-trigger:active {
  transform: scale(0.9);
}
</style>
