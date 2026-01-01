<template>
  <n-modal
    v-model:show="showModal"
    :mask-closable="true"
    class="custom-modal-container"
  >
    <div 
      class="about-window" 
      ref="windowRef"
      :style="windowStyle"
    >
      <!-- Custom Header (Draggable) -->
      <div class="window-header" @mousedown="startDrag">
        <div class="header-title">{{ aboutConfig.appName }}</div>
        <div class="header-controls">
           <div class="version-tag">v{{ appInfo.version }}</div>
           <n-button quaternary circle size="small" @click="showModal = false">
             <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M320 320L192 192M192 320l128-128"/></svg></n-icon></template>
           </n-button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="window-content">
        <!-- A. Header -->
        <div class="header-section">
          <div class="logo-area">
             <img src="/icon.png" alt="App Logo" class="app-logo" />
          </div>
          <div class="title-area">
            <h2 class="app-name">{{ appInfo.name }}</h2>
            <p class="slogan">{{ aboutConfig.slogan }}</p>
          </div>
        </div>

        <n-divider style="margin: 16px 0" />

        <!-- B. Project Info -->
        <div class="section info-section">
          <p class="description">{{ aboutConfig.description }}</p>
          <div class="features-list">
            <div v-for="(feat, index) in aboutConfig.features" :key="index" class="feature-item">
              <span class="bullet">•</span> {{ feat }}
            </div>
          </div>
        </div>

        <!-- C. Author Info -->
        <div class="section author-section">
          <div class="author-row">
            <span class="label">作者:</span>
            <span class="value">{{ aboutConfig.author.name }}</span>
          </div>
          <div class="credits-toggle" @click="showCredits = !showCredits">
            <span class="toggle-text">{{ showCredits ? '收起致谢' : '展开致谢与声明' }}</span>
            <n-icon :class="{ rotated: showCredits }">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M112 184l144 144 144-144"/></svg>
            </n-icon>
          </div>
          <n-collapse-transition :show="showCredits">
            <div class="credits-content">
              <p>感谢开源社区提供的优秀组件：Tauri, Vue, Naive UI, Monaco Editor。</p>
              <p>本项目遵循 MIT 开源协议。</p>
            </div>
          </n-collapse-transition>
        </div>

        <!-- D. Links -->
        <div class="section links-section">
          <n-space>
            <n-button secondary size="small" @click="openLink(aboutConfig.links.repo)">
              <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 32C132.3 32 32 134.9 32 261.7c0 101.5 64.2 187.5 153.2 217.9a17.56 17.56 0 003.8.4c8.3 0 11.5-6.1 11.5-11.4 0-5.5-.2-19.9-.3-39.1a102.4 102.4 0 01-22.6 2.7c-43.1 0-52.9-33.5-52.9-33.5-10.2-26.5-24.9-33.6-24.9-33.6-19.5-13.7-.1-14.1 1.4-14.1h.1c22.5 2 34.3 23.8 34.3 23.8 11.2 33.6 29.2 28.8 36.3 24.7 0-14.2 7.5-24.7 14.1-30.9-69.5-8.1-142.9-35.3-142.9-156.8 0-32.9 11.4-60.5 30.1-81.8-3-7.7-13.1-40 2.9-80.9 0 0 25.5-8.3 83.5 31.7 24.2-6.8 50.1-10.2 76-10.3s51.8 3.5 76 10.3c57.9-40 83.3-31.7 83.3-31.7 16.1 41 6 73.2 3 80.9 18.7 21.4 30.1 49 30.1 81.8 0 121.9-73.5 148.6-143.2 156.4 7.7 6.9 14.7 20.3 14.7 41v60.8c0 5.3 3.1 11.5 11.6 11.4A228.92 228.92 0 00480 261.7C480 134.9 379.7 32 256 32z" fill="currentColor"/></svg></n-icon></template>
              GitHub 仓库
            </n-button>
            <n-button secondary size="small" @click="openLink(aboutConfig.links.issues)">
              <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 256c0-106-86-192-192-192S64 150 64 256s86 192 192 192 192-86 192-192z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/><path d="M250.26 166.05L256 288l5.73-121.95a5.74 5.74 0 00-5.79-6h0a5.74 5.74 0 00-5.68 6z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M256 367.91a20 20 0 1120-20 20 20 0 01-20 20z" fill="currentColor"/></svg></n-icon></template>
              反馈问题
            </n-button>
            <n-button secondary size="small" @click="openLink(aboutConfig.links.releases)">
               <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M416 221.25V416a48 48 0 01-48 48H144a48 48 0 01-48-48V96a48 48 0 0148-48h98.75a32 32 0 0122.62 9.37l141.26 141.26a32 32 0 019.37 22.62z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path d="M256 56v120a32 32 0 0032 32h120" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon></template>
              更新日志
            </n-button>
          </n-space>
        </div>

        <n-divider style="margin: 16px 0" />

        <!-- E. Letter -->
        <div class="section letter-section">
          <div class="letter-header" @click="showLetter = !showLetter">
            <span class="letter-title">💌 给用户的一封信</span>
            <n-button text size="tiny" type="primary">
              {{ showLetter ? '收起' : '展开阅读' }}
            </n-button>
          </div>
          <n-collapse-transition :show="showLetter">
            <div class="letter-content-box">
               <pre class="letter-text">{{ aboutConfig.letter }}</pre>
            </div>
          </n-collapse-transition>
          <div v-if="!showLetter" class="letter-preview" @click="showLetter = true">
             {{ aboutConfig.letter.slice(0, 60) }}...
          </div>
        </div>
      </div>

      <!-- F. Footer -->
      <div class="window-footer">
        <n-button size="small" @click="copyVersionInfo">
          <template #icon><n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="128" y="128" width="336" height="336" rx="57" ry="57" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon></template>
          复制版本信息
        </n-button>
        <div class="spacer"></div>
        <n-button size="small" @click="showModal = false">
          关闭
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { NModal, NButton, NIcon, NDivider, NSpace, NCollapseTransition } from 'naive-ui';
import { aboutConfig } from '../../config/about.config';
import { useAbout } from '../../composables/useAbout';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
}>();

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
});

const { appInfo, initInfo, copyVersionInfo, openLink } = useAbout();

const showCredits = ref(false);
const showLetter = ref(false);
const windowRef = ref<HTMLElement | null>(null);

// Drag Logic
const dragOffset = ref({ x: 0, y: 0 });

function startDrag(e: MouseEvent) {
  // Prevent dragging if clicking controls
  if ((e.target as HTMLElement).closest('.header-controls')) return;
  
  e.preventDefault();
  const windowEl = windowRef.value;
  if (!windowEl) return;
  
  const initialMouseX = e.clientX;
  const initialMouseY = e.clientY;
  
  // Get current transform
  const style = window.getComputedStyle(windowEl);
  const matrix = new WebKitCSSMatrix(style.transform);
  const initialTranslateX = matrix.m41;
  const initialTranslateY = matrix.m42;

  const onMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - initialMouseX;
    const dy = moveEvent.clientY - initialMouseY;
    dragOffset.value = {
      x: initialTranslateX + dx,
      y: initialTranslateY + dy
    };
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

const windowStyle = computed(() => ({
  transform: `translate(${dragOffset.value.x}px, ${dragOffset.value.y}px)`
}));

onMounted(() => {
  initInfo();
});
</script>

<style scoped>
.about-window {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  
  /* Size & Resize */
  width: min(900px, 90vw);
  height: min(600px, 85vh);
  min-width: 600px;
  min-height: 400px;
  max-width: 900px;
  max-height: 600px;
  resize: both;
  overflow: hidden; /* Needed for resize handle to show properly on some browsers, content has its own scroll */
  
  /* Initial centering will be handled by n-modal, but we hijack it slightly with transform */
}

.window-header {
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: grab;
  user-select: none;
  background-color: #fafafa;
}

.window-header:active {
  cursor: grabbing;
}

.header-title {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.window-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.window-footer {
  padding: 12px 16px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  background-color: #fafafa;
}

.spacer {
  flex: 1;
}

/* Reusing existing content styles */
.version-tag {
  background-color: #f0f0f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.header-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.app-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
}

.app-name {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.slogan {
  margin: 4px 0 0;
  color: #666;
  font-size: 14px;
}

.section {
  margin-bottom: 16px;
}

.description {
  color: #333;
  line-height: 1.5;
  margin-bottom: 8px;
}

.features-list {
  background-color: #f9f9f9;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
  color: #555;
}

.feature-item {
  margin-bottom: 4px;
  display: flex;
  align-items: baseline;
}

.bullet {
  color: var(--n-primary-color);
  margin-right: 6px;
  font-weight: bold;
}

.author-section {
  background-color: #fff;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
  color: #333;
}

.credits-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
  user-select: none;
}

.credits-toggle:hover {
  color: var(--n-primary-color);
}

.credits-content {
  font-size: 12px;
  color: #999;
  padding-left: 10px;
  border-left: 2px solid #eee;
  margin-top: 4px;
}

.credits-content p {
  margin: 2px 0;
}

.rotated {
  transform: rotate(180deg);
  transition: transform 0.2s;
}

.letter-section {
  border: 1px solid #eef2f6;
  border-radius: 8px;
  padding: 12px;
  background-color: #fff;
}

.letter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: pointer;
}

.letter-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.letter-text {
  font-family: inherit;
  white-space: pre-wrap;
  line-height: 1.6;
  color: #444;
  margin: 0;
  font-size: 13px;
}

.letter-preview {
  color: #999;
  font-size: 13px;
  font-style: italic;
  cursor: pointer;
}

.letter-preview:hover {
  color: #666;
}
</style>
