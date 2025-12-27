<template>
  <div class="toolbar">
    <n-space align="center">
      <!-- File Group -->
      <n-button-group>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" @click="openFile">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 448H64c-17.67 0-32-14.33-32-32V96c0-17.67 14.33-32 32-32h192l64 64h128c17.67 0 32 14.33 32 32v256c0 17.67-14.33 32-32 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
              </template>
              打开
            </n-button>
          </template>
          打开文件 (Ctrl+O)
        </n-tooltip>
        
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" @click="saveFile">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M384 48H128c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h256c26.51 0 48-21.49 48-48V144.13L384 48z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M168 48v80h176V48M288 464v-80H128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
              </template>
              保存
            </n-button>
          </template>
          保存 (Ctrl+S)
        </n-tooltip>
      </n-button-group>

      <n-divider vertical />

      <!-- Process Group -->
      <n-button-group>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" @click="configStore.format">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="48" y="96" width="416" height="320" rx="40" ry="40" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M144 256h224M112 176h288M112 336h288"/></svg></n-icon>
              </template>
              格式化
            </n-button>
          </template>
          格式化 JSON
        </n-tooltip>
        
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" @click="configStore.minify">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 96h112v112M405.77 106.2L111.98 400.02M208 416H96V304"/></svg></n-icon>
              </template>
              压缩
            </n-button>
          </template>
          压缩去空格
        </n-tooltip>

        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button size="small" @click="handleValidate">
              <template #icon>
                <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M380.93 57.37A32 32 0 00358.3 48H94.22A46.21 46.21 0 0048 94.22v323.56A46.21 46.21 0 0094.22 464h323.56A46.36 46.36 0 00464 417.78V105.7a32 32 0 00-9.37-22.63zM256 416a16 16 0 1116-16 16 16 0 01-16 16zm4.12-141.47a24 24 0 11-24-24 24 24 0 0124 24zm6-112.53l-6 132H252l-6-132a28 28 0 1156 0z" fill="currentColor"/></svg></n-icon>
              </template>
              校验
            </n-button>
          </template>
          检查 JSON 语法与规则
        </n-tooltip>
      </n-button-group>

      <n-divider vertical />

      <!-- Run Group -->
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button size="small" type="primary" @click="run" :loading="runStore.isRunning">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/></svg></n-icon>
            </template>
            运行
          </n-button>
        </template>
        运行当前配置 (F5)
      </n-tooltip>
      
      <!-- Settings Dropdown -->
      <n-dropdown :options="settingsOptions" @select="handleSetting">
        <n-button size="small">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M262.29 192.31a64 64 0 1057.4 57.4 64.13 64.13 0 00-57.4-57.4zM416.39 256a154.34 154.34 0 01-1.53 20.79l45.21 35.46a10.81 10.81 0 012.45 13.75l-42.77 74a10.81 10.81 0 01-13.14 4.59l-44.9-18.08a16.11 16.11 0 00-16.85 1.75 154.87 154.87 0 01-24.66 16.1 16.1 16.1 0 00-9.25 14.92l-5.62 50.32a10.8 10.8 0 01-10.71 9.43h-85.54a10.81 10.81 0 01-10.72-9.43l-5.62-50.32a16.1 16.1 0 00-9.25-14.92 154.87 154.87 0 01-24.66-16.1 16.1 16.1 0 00-16.85-1.75l-44.9 18.08a10.81 10.81 0 01-13.14-4.59l-42.77-74a10.81 10.81 0 012.45-13.75l45.21-35.46a154.34 154.34 0 010-41.58l-45.21-35.46a10.81 10.81 0 01-2.45-13.75l42.77-74a10.81 10.81 0 0113.14-4.59l44.9 18.08a16.11 16.11 0 0016.85-1.75 154.87 154.87 0 0124.66-16.1 16.1 16.1 0 009.25-14.92l5.62-50.32a10.8 10.8 0 0110.72-9.43h85.54a10.81 10.81 0 0110.71 9.43l5.62 50.32a16.1 16.1 0 009.25 14.92 154.87 154.87 0 0124.66 16.1 16.1 16.1 0 0016.85 1.75l44.9-18.08a10.81 10.81 0 0113.14 4.59l42.77 74a10.81 10.81 0 01-2.45 13.75l-45.21 35.46a154.34 154.34 0 011.53 20.79z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
          设置
        </n-button>
      </n-dropdown>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NSpace, NButtonGroup, NButton, NIcon, NDivider, NTooltip, NDropdown, useMessage } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useRunStore } from '../../stores/run';
import { useAppStore } from '../../stores/app';
import { commands } from '../../tauri';

const configStore = useConfigStore();
const runStore = useRunStore();
const appStore = useAppStore();
const message = useMessage();

async function openFile() {
  const path = await commands.pickFile();
  if (path) {
    await configStore.loadFile(path);
  }
}

async function saveFile() {
  await configStore.saveFile();
}

async function run() {
  if (!configStore.currentFilePath) {
    await commands.showError('请先保存文件再运行');
    return;
  }
  // Show log panel if hidden
  if (!appStore.showRunLog) {
    appStore.showRunLog = true;
  }
  
  const parts = configStore.currentFilePath.split(/[/\\]/);
  parts.pop();
  const workingDir = parts.join('\\');
  
  await runStore.runDecrypt(configStore.rawText, workingDir);
}

function handleValidate() {
  if (configStore.validationErrors.length === 0 && !configStore.parseError) {
    message.success('校验通过：格式正确且符合业务规则');
  } else {
    message.error(`校验失败：发现 ${configStore.validationErrors.length + (configStore.parseError ? 1 : 0)} 个问题`);
  }
}

const settingsOptions = computed(() => [
  { 
    label: appStore.wordWrap ? '关闭自动换行' : '开启自动换行', 
    key: 'toggleWrap' 
  },
  { 
    label: appStore.showRunLog ? '隐藏运行日志' : '显示运行日志', 
    key: 'toggleLog' 
  },
  { type: 'divider', key: 'd1' },
  { 
    label: `主题：${appStore.theme === 'auto' ? '跟随系统' : appStore.theme}`, 
    key: 'theme',
    children: [
      { label: '浅色', key: 'theme-light' },
      { label: '深色', key: 'theme-dark' },
      { label: '跟随系统', key: 'theme-auto' }
    ]
  }
]);

function handleSetting(key: string) {
  if (key === 'toggleWrap') appStore.toggleWordWrap();
  if (key === 'toggleLog') appStore.toggleRunLog();
  if (key === 'theme-light') appStore.theme = 'light';
  if (key === 'theme-dark') appStore.theme = 'dark';
  if (key === 'theme-auto') appStore.theme = 'auto';
}
</script>

<style scoped>
.toolbar {
  padding: 8px 12px;
  border-bottom: 1px solid var(--n-border-color);
  background-color: var(--n-color);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
