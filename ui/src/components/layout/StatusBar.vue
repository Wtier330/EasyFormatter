<template>
  <div class="status-bar">
    <div class="left">
      <!-- Git Branch (Placeholder for "Trae" look) -->
      <div class="status-item git-branch" title="Git Branch">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M384 224a64 64 0 10-64 64 63.88 63.88 0 0013.6-1.5 125.68 125.68 0 01-52.75-34.86A127.35 127.35 0 01256 160V96a64 64 0 10-64 0v64a63.89 63.89 0 001.5 13.6A125.68 125.68 0 01228.36 226a127.35 127.35 0 01-4.7 91.5 63.88 63.88 0 00-13.6-1.5a64 64 0 1064 64v-64a63.89 63.89 0 00-1.5-13.6 125.68 125.68 0 01-34.86-52.36A127.35 127.35 0 01320 256h64a64 64 0 000-32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="192" cy="96" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="384" cy="256" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><circle cx="192" cy="416" r="32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg>
        </n-icon>
        <span>main</span>
      </div>
      
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
      <div class="status-item" title="Encoding">
        UTF-8
      </div>
      
      <!-- EOL -->
      <div class="status-item" title="End of Line Sequence">
        CRLF
      </div>
      
      <!-- Language -->
      <!-- <div class="status-item" title="Language Mode">
        <span class="lang-brace">{ }</span>
        <span>JSON</span>
      </div> -->
      
      <!-- Feedback -->
      <!-- <div class="status-item icon-only" title="Tweet Feedback">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M414.39 97.61A224 224 0 1097.61 414.39 224 224 0 10414.39 97.61zM344 200c22.09 0 40 17.91 40 40s-17.91 40-40 40-40-17.91-40-40 17.91-40 40-40zm-176 0c22.09 0 40 17.91 40 40s-17.91 40-40 40-40-17.91-40-40 17.91-40 40-40zm88 184c-42.34 0-78.5-25.5-94.5-62.5h189C350.5 358.5 314.34 384 256 384z"/></svg>
        </n-icon>
      </div> -->
      
      <!-- Bell -->
      <!-- <div class="status-item icon-only" title="Notifications">
        <n-icon size="14">
          <svg viewBox="0 0 512 512" fill="currentColor"><path d="M449.37 353.76l-26.74-53.76A130 130 0 01408 238V144c0-82-62.66-149.79-142.25-159.22C264 12.33 260 12.33 256 12.33s-8 0-9.75 2.45C166.66 24.21 104 92 104 144v94a130 130 0 01-14.63 62l-26.74 53.76A18.66 18.66 0 0064 366.67h136.63A64 64 0 00311.37 366.67H448a18.66 18.66 0 001.37-29.24zM256 426.67a32 32 0 01-32-32h64a32 32 0 01-32 32z"/></svg>
        </n-icon>
      </div> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NPopover } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';

const configStore = useConfigStore();
const appStore = useAppStore();

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
</style>
