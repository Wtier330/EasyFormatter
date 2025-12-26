<template>
  <div class="toolbar">
    <n-space>
      <n-button-group>
        <n-button size="small" @click="openFile">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 448H64c-17.67 0-32-14.33-32-32V96c0-17.67 14.33-32 32-32h192l64 64h128c17.67 0 32 14.33 32 32v256c0 17.67-14.33 32-32 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
          打开
        </n-button>
        <n-button size="small" @click="saveFile">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M384 48H128c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h256c26.51 0 48-21.49 48-48V144.13L384 48z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M168 48v80h176V48M288 464v-80H128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
          保存
        </n-button>
      </n-button-group>

      <n-divider vertical />

      <n-button-group>
        <n-button size="small" @click="configStore.format">
          格式化
        </n-button>
        <n-button size="small" @click="configStore.minify">
          压缩
        </n-button>
      </n-button-group>

      <n-divider vertical />

      <n-button size="small" type="primary" @click="run" :loading="runStore.isRunning">
        <template #icon>
          <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M112 111v290c0 17.44 17 28.52 31 20.16l247.9-148.37c12.12-7.25 12.12-26.33 0-33.58L143 90.84c-14-8.36-31 2.72-31 20.16z" fill="none" stroke="currentColor" stroke-miterlimit="10" stroke-width="32"/></svg></n-icon>
        </template>
        运行
      </n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { NSpace, NButtonGroup, NButton, NIcon, NDivider } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useRunStore } from '../../stores/run';
import { commands } from '../../tauri';

const configStore = useConfigStore();
const runStore = useRunStore();

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
  // Assume working dir is file dir
  const parts = configStore.currentFilePath.split(/[/\\]/);
  parts.pop();
  const workingDir = parts.join('\\'); // Windows
  
  await runStore.runDecrypt(configStore.rawText, workingDir);
}
</script>

<style scoped>
.toolbar {
  padding: 8px;
  border-bottom: 1px solid var(--n-border-color);
  background-color: var(--n-color);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
