<template>
  <div class="function-bar">
    <div class="bar-left">
      <n-space :size="8">
        <n-button 
          type="default" 
          size="small" 
          @click="openFile" 
          class="icon-btn"
          title="打开文件"
          :disabled="false"
        >
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M448 448H64c-17.67 0-32-14.33-32-32V96c0-17.67 14.33-32 32-32h192l64 64h128c17.67 0 32 14.33 32 32v256c0 17.67-14.33 32-32 32z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
          </template>
        </n-button>
        <n-button 
          type="default" 
          size="small" 
          @click="saveFile" 
          class="icon-btn"
          title="保存文件"
          :disabled="false"
        >
          <template #icon>
            <n-icon><svg t="1766948419929" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="30579" width="256" height="256"><path d="M814.805 128a51.179 51.179 0 0 1 51.179 51.179V844.01a51.179 51.179 0 0 1-51.179 51.157H201.173a51.179 51.179 0 0 1-51.178-51.157V179.179A51.179 51.179 0 0 1 201.173 128h613.654zM329.024 434.837a51.093 51.093 0 0 1-51.179-51.093V179.157h-76.672v664.854h613.76V179.179H738.22v204.48a51.179 51.179 0 0 1-51.179 51.178H329.024z m0-51.093h357.995V179.157H329.024v204.587z m357.91 204.501a25.557 25.557 0 1 1 0.085 51.072H329.024a25.536 25.536 0 1 1 0-51.072h357.91z" fill="#515151" p-id="30580"></path></svg></n-icon>
          </template>
        </n-button>

        <!-- <n-button strong secondary size="small" @click="createNewScratch" class="action-btn">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M368 224h-112v-112c0-8.84-7.16-16-16-16s-16 7.16-16 16v112h-112c-8.84 0-16 7.16-16 16s7.16 16 16 16h112v112c0 8.84 7.16 16 16 16s16-7.16 16-16v-112h112c8.84 0 16-7.16 16-16s-7.16-16-16-16z" fill="currentColor"/></svg></n-icon>
          </template>
          新建临时
        </n-button> -->

        <n-button strong secondary size="small" @click="createFromClipboard" class="action-btn">
          <template #icon>
            <n-icon><svg t="1766947938849" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="17675" width="256" height="256"><path d="M494.933333 128m42.666667 0l0 0q42.666667 0 42.666667 42.666667l0 426.666666q0 42.666667-42.666667 42.666667l0 0q-42.666667 0-42.666667-42.666667l0-426.666666q0-42.666667 42.666667-42.666667Z" fill="#666666" p-id="17676"></path><path d="M836.266667 341.333333h-85.333334v85.333334h85.333334v341.333333h-597.333334v-341.333333h85.333334V341.333333h-85.333334a85.333333 85.333333 0 0 0-85.333333 85.333334v341.333333a85.333333 85.333333 0 0 0 85.333333 85.333333h597.333334a85.333333 85.333333 0 0 0 85.333333-85.333333v-341.333333a85.333333 85.333333 0 0 0-85.333333-85.333334z" fill="#666666" p-id="17677"></path><path d="M561.493333 701.44l131.413334-131.413333a34.133333 34.133333 0 0 0-24.32-58.026667H406.613333A34.133333 34.133333 0 0 0 384 570.026667l128 131.413333a33.706667 33.706667 0 0 0 49.493333 0z" fill="#666666" p-id="17678"></path></svg></n-icon>
          </template>
          新粘
        </n-button>
        
        <n-button strong secondary size="small" @click="configStore.format" class="action-btn" aria-label="格式化">
          <template #icon>
            <n-icon><svg t="1766947910743" class="icon" viewBox="0 0 1344 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="16651" width="256" height="256"><path d="M1331.968 482.112L1036.16 183.488a41.6 41.6 0 0 0-60.032 0 42.56 42.56 0 0 0 0 60.544L1242.432 512l-266.24 268.8a42.56 42.56 0 0 0 0 60.608 40.704 40.704 0 0 0 59.136 0l295.744-298.688a43.328 43.328 0 0 0 0.896-60.608zM369.536 183.488a41.6 41.6 0 0 0-59.968 0L13.824 482.112a42.56 42.56 0 0 0 0 60.608l295.68 298.688c8.512 7.68 19.456 11.904 30.464 11.904a39.424 39.424 0 0 0 29.568-12.8 42.56 42.56 0 0 0 0-60.544L103.36 512l266.24-268.8a43.072 43.072 0 0 0 0-59.712z m441.088-181.76a41.408 41.408 0 0 0-51.456 29.568L505.6 970.24c-5.952 23.04 6.72 46.08 29.568 52.032a49.024 49.024 0 0 0 10.944 1.728c18.56 0 35.52-12.8 40.576-31.552L840.128 53.76a42.24 42.24 0 0 0-29.248-51.968l-0.256-0.064z" fill="#87888E" p-id="16652"></path></svg></n-icon>
          </template>
          格式化
        </n-button>
        
        <n-button strong secondary size="small" @click="configStore.minify" class="action-btn">
          <template #icon>
            <n-icon><svg t="1766948000461" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="19016" width="256" height="256"><path d="M768 938.666667a25.088 25.088 0 0 1-18.090667-7.509334L512 694.442667 274.602667 931.84A25.6 25.6 0 0 1 238.933333 895.658667l256-256a25.429333 25.429333 0 0 1 36.181334 0l256 256a25.429333 25.429333 0 0 1 0 36.181333A24.746667 24.746667 0 0 1 768 938.666667zM512 391.338667a25.6 25.6 0 0 1-18.090667-7.509334l-256-256a25.6 25.6 0 0 1 36.693334-35.669333L512 329.557333 749.397333 92.16A25.6 25.6 0 0 1 785.066667 128.341333l-256 256a25.6 25.6 0 0 1-17.066667 6.997334zM959.146667 537.6H64.853333a25.6 25.6 0 1 1 0-51.2h894.293334a25.6 25.6 0 0 1 0 51.2z" fill="#8a8a8a" p-id="19017"></path><path d="M911.872 615.936m-34.133333 0l-731.306667 0q-34.133333 0-34.133333-34.133333l0-82.602667q0-34.133333 34.133333-34.133333l731.306667 0q34.133333 0 34.133333 34.133333l0 82.602667q0 34.133333-34.133333 34.133333Z" fill="#8a8a8a" opacity=".3" p-id="19018"></path></svg></n-icon>
          </template>
          压缩
        </n-button>
      </n-space>
    </div>
    
    <div class="bar-right">
      <n-space :size="12" align="center">
        <n-button-group size="small">
          <n-button @click="handleCopy" title="复制">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect x="128" y="128" width="336" height="336" rx="57" ry="57" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/><path d="M383.5 128l.5-24a56.16 56.16 0 00-56-56H112a64.19 64.19 0 00-64 64v216a56.16 56.16 0 0056 56h24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32"/></svg></n-icon>
            </template>
          </n-button>
          <n-button @click="handlePaste" title="粘贴">
            <template #icon>
              <n-icon><svg t="1766947775444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11245" width="256" height="256"><path d="M469.12 80.64h128a32 32 0 0 0 32-32 32 32 0 0 0-32-32h-128a32 32 0 0 0-32 32 32 32 0 0 0 32 32zM276.48 174.08a32 32 0 0 0 32-32v-29.44a32 32 0 0 1 31.36-32 32 32 0 0 0 32-32 33.28 33.28 0 0 0-32.64-32 96.64 96.64 0 0 0-94.72 96v29.44a32 32 0 0 0 32 32zM727.68 80.64h128a32 32 0 0 0 32-32 32 32 0 0 0-32-32h-128a32 32 0 0 0-32 32 32 32 0 0 0 32 32zM976 571.52a32 32 0 0 0-32 32v128a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32v-128a32 32 0 0 0-32-32zM912 794.88h-128a32.64 32.64 0 0 0-32 32 32 32 0 0 0 32 32h128a31.36 31.36 0 0 0 31.36-32 33.28 33.28 0 0 0-31.36-32zM1000.32 74.24A32 32 0 0 0 960 57.6a32.64 32.64 0 0 0-16.64 42.24 28.8 28.8 0 0 1 0 12.8v103.04a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32V112.64a97.92 97.92 0 0 0-7.04-38.4zM976 312.96a32 32 0 0 0-32 32v128a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32v-128a32 32 0 0 0-32-32z" fill="#323333" p-id="11246"></path><path d="M683.52 1006.08H112a96 96 0 0 1-96-96V259.84a96 96 0 0 1 96-96h571.52a96 96 0 0 1 96 96v650.24a96 96 0 0 1-96 96zM112 227.84a32 32 0 0 0-32 32v650.24a32 32 0 0 0 32 32h571.52a32 32 0 0 0 32-32V259.84a32 32 0 0 0-32-32z" fill="#323333" p-id="11247"></path><path d="M604.16 423.68H192a32 32 0 0 1-32-32 32 32 0 0 1 32-32h412.16a32 32 0 0 1 32 32 32.64 32.64 0 0 1-32 32zM604.16 616.96H192a32 32 0 0 1 0-64h412.16a32 32 0 0 1 0 64zM604.16 810.24H192a32 32 0 0 1-32-32 32 32 0 0 1 32-32h412.16a32.64 32.64 0 0 1 32 32 32 32 0 0 1-32 32z" fill="#323333" p-id="11248"></path></svg></n-icon>
            </template>
          </n-button>
          <n-button @click="handleExport" title="导出">
            <template #icon>
              <n-icon><svg t="1766947516935" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5838" width="256" height="256"><path d="M892.7 559.5c-26.1 0-41.8 15.7-41.8 41.8v52.2c0 88.8-5.2 156.6-167.1 156.6H349.6c-167.1 0-167.1-73.1-167.1-167.1V434.1C172.1 303.6 234.8 277.5 307.9 267h5.2c26.1 0 41.8-15.7 41.8-41.8s-15.7-41.8-41.8-41.8h-47C177.3 183.5 99 256.6 99 350.6v370.7c0 88.8 73.1 167.1 167.1 167.1h496.1c88.8 0 167.1-73.1 167.1-167.1V596c5.2-15.7-15.7-36.5-36.6-36.5z m-642.3 20.8c0 41.8 10.4 83.5 20.9 120.1 47-135.8 172.3-235 323.7-235v52.2c0 20.9 10.4 41.8 31.3 52.2 10.4 5.2 15.7 10.4 26.1 10.4 10.4 0 26.1-5.2 31.3-10.4l229.8-177.5c10.4-10.4 20.9-31.3 20.9-52.2 0-15.7-10.4-36.6-20.9-47L683.8 115.6c-10.4-10.4-26.1-10.4-36.6-10.4s-15.7 0-26.1 10.4c-20.9 10.4-31.3 31.3-31.3 52.2v57.4c-187.9 0.1-339.4 156.7-339.4 355.1z" fill="#00AA88" p-id="5839"></path></svg></n-icon>
            </template>
          </n-button>
        </n-button-group>

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
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { NSpace, NButton, NButtonGroup, NIcon, useNotification } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { commands } from '../../tauri';

const configStore = useConfigStore();
const appStore = useAppStore();
const notification = useNotification();

async function createFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) {
      notification.warning({ title: '剪贴板为空', duration: 2000 });
      return;
    }
    const tab = appStore.createScratchTab(text, 'paste');
    appStore.activeTabId = tab.id;
  } catch (e) {
    notification.error({ title: '无法读取剪贴板', content: String(e), duration: 3000 });
  }
}

async function openFile() {
  const path = await commands.pickFile();
  if (path) {
    await configStore.loadFile(path);
  }
}

async function saveFile() {
  await configStore.saveFile();
}

async function handleExport() {
  try {
    const defaultPath = appStore.lastExportPath || undefined;
    const path = await commands.saveFile(defaultPath); 
    if (path) {
      appStore.lastExportPath = path;
      await commands.writeText(path, configStore.rawText);
      notification.success({ title: '导出成功', duration: 2000 });
    }
  } catch (e) {
    notification.error({ title: '导出失败', content: String(e) });
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(configStore.rawText);
    notification.success({ title: '已复制', duration: 1000 });
  } catch (e) {
    notification.error({ title: '复制失败', content: String(e) });
  }
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      // Trigger paste in editor
      configStore.pasteRequest = text;
    } else {
      notification.warning({ title: '剪贴板为空', duration: 1000 });
    }
  } catch (e) {
    notification.error({ title: '无法读取剪贴板', content: String(e) });
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
.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  border: none !important;
  background-color: transparent;
  color: #666;
}
.icon-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}
.icon-btn:active {
  background-color: #e0e0e0;
}
.icon-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
