<template>
  <div class="function-bar">
    <div class="bar-left">
      <n-space :size="8">
        <n-button type="primary" size="small" @click="openFile" class="action-btn" aria-label="打开文件">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 448H64c-17.67 0-32-14.33-32-32V96c0-17.67 14.33-32 32-32h192l64 64h128c17.67 0 32 14.33 32 32v256c0 17.67-14.33 32-32 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
          打开
        </n-button>
        <n-button type="primary" size="small" @click="saveFile" class="action-btn" aria-label="保存文件">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M384 48H128c-26.51 0-48 21.49-48 48v320c0 26.51 21.49 48 48 48h256c26.51 0 48-21.49 48-48V144.13L384 48z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/><path d="M168 48v80h176V48M288 464v-80H128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
          保存
        </n-button>
        
        <n-button strong secondary size="small" @click="configStore.format" class="action-btn" aria-label="格式化">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="48" y="96" width="416" height="320" rx="40" ry="40" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32" d="M144 256h224M112 176h288M112 336h288"/></svg></n-icon>
          </template>
          格式化
        </n-button>
        
        <n-button strong secondary size="small" @click="configStore.minify" class="action-btn">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 96h112v112M405.77 106.2L111.98 400.02M208 416H96V304"/></svg></n-icon>
          </template>
          压缩
        </n-button>
        
        <n-button strong secondary size="small" @click="handleValidate" class="action-btn">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M380.93 57.37A32 32 0 00358.3 48H94.22A46.21 46.21 0 0048 94.22v323.56A46.21 46.21 0 0094.22 464h323.56A46.36 46.36 0 00464 417.78V105.7a32 32 0 00-9.37-22.63zM256 416a16 16 0 1116-16 16 16 0 01-16 16zm4.12-141.47a24 24 0 11-24-24 24 24 0 0124 24zm6-112.53l-6 132H252l-6-132a28 28 0 1156 0z" fill="currentColor"/></svg></n-icon>
          </template>
          校验
        </n-button>
      </n-space>
    </div>
    
    <div class="bar-right">
      <n-space :size="12" align="center">
        <n-button-group size="small">
          <n-button @click="appStore.requestExpand">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320M421.8 421.77L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320M90.23 421.8L208 304"/></svg></n-icon>
            </template>
            全展开
          </n-button>
          <n-button @click="appStore.requestCollapse">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M4 4h4v4H4zM248 80h112v112M421.77 90.2L304 208M192 432H80V320M90.23 421.8L208 304" style="display:none"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 320v112h112M421.8 421.77L304 304M208 192V80H96M90.2 90.23L208 208M320 192h112V80M421.77 90.2L304 208M192 320H80v112M90.23 421.8L208 304"/></svg></n-icon>
            </template>
            全折叠
          </n-button>
        </n-button-group>
        
        <div class="control-item">
          <span class="label">缩进:</span>
          <n-select 
            v-model:value="appStore.indentSize" 
            :options="indentOptions" 
            size="small" 
            style="width: 90px" 
            @update:value="configStore.format"
          />
        </div>
        
        <div class="control-item">
          <span class="label">字号:</span>
          <n-select 
            v-model:value="appStore.fontSize" 
            :options="fontOptions" 
            size="small" 
            style="width: 80px" 
          />
        </div>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NSpace, NButton, NButtonGroup, NIcon, NSelect, useMessage } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { commands } from '../../tauri';

const configStore = useConfigStore();
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

const indentOptions = [
  { label: '1 空格', value: 1 },
  { label: '2 空格', value: 2 },
  { label: '3 空格', value: 3 },
  { label: '4 空格', value: 4 },
];

const fontOptions = [
  { label: '12px', value: 12 },
  { label: '14px', value: 14 },
  { label: '16px', value: 16 },
  { label: '18px', value: 18 },
  { label: '20px', value: 20 },
];

function handleValidate() {
  if (configStore.validationErrors.length === 0 && !configStore.parseError) {
    message.success('校验通过：格式正确且符合业务规则');
  } else {
    message.error(`校验失败：发现 ${configStore.validationErrors.length + (configStore.parseError ? 1 : 0)} 个问题`);
  }
}
</script>

<style scoped>
.function-bar {
  min-height: 48px;
  margin: 8px 12px;
  padding: 4px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #fff;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.bar-left, .bar-right {
  display: flex;
  align-items: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: #666;
}

.action-btn {
  min-width: 80px; /* Consistent width for main buttons */
}
</style>