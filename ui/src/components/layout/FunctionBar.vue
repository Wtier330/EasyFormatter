<template>
  <div class="function-bar">
    <div class="bar-left">
      <n-space :size="8">
        <n-button 
          type="default" 
          size="small" 
          @click="openFile" 
          class="icon-btn"
          :title="openFileTitle"
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
          :title="saveFileTitle"
          :disabled="false"
        >
          <template #icon>
            <n-icon><svg t="1766948419929" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="30579" width="256" height="256"><path d="M814.805 128a51.179 51.179 0 0 1 51.179 51.179V844.01a51.179 51.179 0 0 1-51.179 51.157H201.173a51.179 51.179 0 0 1-51.178-51.157V179.179A51.179 51.179 0 0 1 201.173 128h613.654zM329.024 434.837a51.093 51.093 0 0 1-51.179-51.093V179.157h-76.672v664.854h613.76V179.179H738.22v204.48a51.179 51.179 0 0 1-51.179 51.178H329.024z m0-51.093h357.995V179.157H329.024v204.587z m357.91 204.501a25.557 25.557 0 1 1 0.085 51.072H329.024a25.536 25.536 0 1 1 0-51.072h357.91z" fill="#515151" p-id="30580"></path></svg></n-icon>
          </template>
        </n-button>

        <n-button-group size="small">
          <n-button @click="handleUndo" :title="undoTitle" class="icon-btn">
            <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M424 424v-46c0-70-63-128-147-128-42 0-81 15-110 41l-2 2-3-3L83.5 211.5a10 10 0 0 0-14 0l-1 1-60 60a10 10 0 0 0 0 14l104 104a10 10 0 0 0 14 0l1-1 78.5-78.5-3-3c27 25 64 39 104 39 52 0 94-29 108-72a8 8 0 0 1 8-6h1z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M240 250h-88v-88"/></svg></n-icon>
            </template>
          </n-button>
          <n-button @click="handleRedo" :title="redoTitle" class="icon-btn">
             <template #icon>
              <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="transform: scaleX(-1);"><path d="M424 424v-46c0-70-63-128-147-128-42 0-81 15-110 41l-2 2-3-3L83.5 211.5a10 10 0 0 0-14 0l-1 1-60 60a10 10 0 0 0 0 14l104 104a10 10 0 0 0 14 0l1-1 78.5-78.5-3-3c27 25 64 39 104 39 52 0 94-29 108-72a8 8 0 0 1 8-6h1z" fill="none" stroke="currentColor" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M240 250h-88v-88"/></svg></n-icon>
            </template>
          </n-button>
        </n-button-group>

        <!-- <n-button strong secondary size="small" @click="createNewScratch" class="action-btn">
          <template #icon>
            <n-icon><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M368 224h-112v-112c0-8.84-7.16-16-16-16s-16 7.16-16 16v112h-112c-8.84 0-16 7.16-16 16s7.16 16 16 16h112v112c0 8.84 7.16 16 16 16s16-7.16 16-16v-112h112c8.84 0 16-7.16 16-16s-7.16-16-16-16z" fill="currentColor"/></svg></n-icon>
          </template>
          新建临时
        </n-button> -->

        <n-button
          strong
          secondary
          size="small"
          @click="createFromClipboard"
          class="action-btn"
          :title="clipboardTipForNew"
        >
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

        <n-dropdown 
          trigger="click" 
          :options="transformOptions" 
          @select="handleTransformSelect"
        >
          <n-button strong secondary size="small" class="action-btn" title="文本变换">
            变换 ▾
          </n-button>
        </n-dropdown>
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
          <n-button @click="handlePaste" :title="clipboardTipForPaste">
            <template #icon>
              <n-icon><svg t="1766947775444" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="11245" width="256" height="256"><path d="M469.12 80.64h128a32 32 0 0 0 32-32 32 32 0 0 0-32-32h-128a32 32 0 0 0-32 32 32 32 0 0 0 32 32zM276.48 174.08a32 32 0 0 0 32-32v-29.44a32 32 0 0 1 31.36-32 32 32 0 0 0 32-32 33.28 33.28 0 0 0-32.64-32 96.64 96.64 0 0 0-94.72 96v29.44a32 32 0 0 0 32 32zM727.68 80.64h128a32 32 0 0 0 32-32 32 32 0 0 0-32-32h-128a32 32 0 0 0-32 32 32 32 0 0 0 32 32zM976 571.52a32 32 0 0 0-32 32v128a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32v-128a32 32 0 0 0-32-32zM912 794.88h-128a32.64 32.64 0 0 0-32 32 32 32 0 0 0 32 32h128a31.36 31.36 0 0 0 31.36-32 33.28 33.28 0 0 0-31.36-32zM1000.32 74.24A32 32 0 0 0 960 57.6a32.64 32.64 0 0 0-16.64 42.24 28.8 28.8 0 0 1 0 12.8v103.04a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32V112.64a97.92 97.92 0 0 0-7.04-38.4zM976 312.96a32 32 0 0 0-32 32v128a32.64 32.64 0 0 0 32 32 32 32 0 0 0 32-32v-128a32 32 0 0 0-32-32z" fill="#323333" p-id="11246"></path><path d="M683.52 1006.08H112a96 96 0 0 1-96-96V259.84a96 96 0 0 1 96-96h571.52a96 96 0 0 1 96 96v650.24a96 96 0 0 1-96 96zM112 227.84a32 32 0 0 0-32 32v650.24a32 32 0 0 0 32 32h571.52a32 32 0 0 0 32-32V259.84a32 32 0 0 0-32-32z" fill="#323333" p-id="11247"></path><path d="M604.16 423.68H192a32 32 0 0 1-32-32 32 32 0 0 1 32-32h412.16a32 32 0 0 1 32 32 32.64 32.64 0 0 1-32 32zM604.16 616.96H192a32 32 0 0 1 0-64h412.16a32 32 0 0 1 0 64zM604.16 810.24H192a32 32 0 0 1-32-32 32 32 0 0 1 32-32h412.16a32.64 32.64 0 0 1 32 32 32 32 0 0 1-32 32z" fill="#323333" p-id="11248"></path></svg></n-icon>
            </template>
          </n-button>
          <n-button @click="handleExport" title="导出">
            <template #icon>
              <n-icon><svg t="1767248034647" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5036" width="256" height="256"><path d="M942.1 593.9c-22.6 0-41 18.3-41 41v204.8c0 22.6-18.4 41-41 41H163.8c-22.6 0-41-18.4-41-41V634.9c0-22.6-18.3-41-41-41s-41 18.3-41 41v204.8c0 67.8 55.1 122.9 122.9 122.9H860c67.8 0 122.9-55.1 122.9-122.9V634.9c0.1-22.6-18.2-41-40.8-41z" p-id="5037"></path><path d="M309.3 363L471 201.3v515.5c0 22.5 18.4 41 41 41 22.5 0 41-18.4 41-41V201.3L714.7 363c15.9 15.9 42 15.9 57.9 0 15.9-15.9 15.9-42 0-57.9L541.5 73.9c-0.2-0.2-0.3-0.4-0.4-0.5-5.7-5.7-12.7-9.3-20.1-10.9-0.2-0.1-0.5-0.2-0.7-0.2-2.7-0.5-5.4-0.8-8.1-0.8-2.7 0-5.5 0.3-8.1 0.8-0.3 0.1-0.5 0.2-0.7 0.2-7.4 1.6-14.4 5.2-20.1 10.9-0.2 0.2-0.3 0.4-0.4 0.5L251.4 305.1c-15.9 15.9-15.9 42 0 57.9 15.9 15.9 42 15.9 57.9 0z" p-id="5038"></path></svg></n-icon>
            </template>
          </n-button>
        </n-button-group>

        <n-button 
          strong 
          secondary 
          size="small" 
          @click="toggleExpand" 
          class="action-btn" 
          :title="expandTitle"
          :aria-label="expandTitle"
        >
          <template #icon>
            <n-icon>
              <transition name="icon-scale" mode="out-in">
                <svg v-if="!isExpanded" key="expand" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M432 320v112H320M421.8 421.77L304 304M80 192V80h112M90.2 90.23L208 208M320 80h112v112M421.77 90.2L304 208M192 432H80V320M90.23 421.8L208 304"/></svg>
                <svg v-else key="collapse" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M4 4h4v4H4zM248 80h112v112M421.77 90.2L304 208M192 432H80V320M90.23 421.8L208 304" style="display:none"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M304 320v112h112M421.8 421.77L304 304M208 192V80H96M90.2 90.23L208 208M320 192h112V80M421.77 90.2L304 208M192 320H80v112M90.23 421.8L208 304"/></svg>
              </transition>
            </n-icon>
          </template>
          {{ expandTitle }}
        </n-button>
      </n-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue';
import { NSpace, NButton, NButtonGroup, NIcon, NInput, NDropdown, useDialog, useNotification } from 'naive-ui';
import { useConfigStore } from '../../stores/config';
import { useAppStore } from '../../stores/app';
import { commands } from '../../tauri';
import { readClipboardWithFallback } from '../../utils/clipboard-handlers';

const configStore = useConfigStore();
const appStore = useAppStore();
const notification = useNotification();
const dialog = useDialog();

// Transform Options
const transformOptions = [
  { label: '转义 (Escape)', key: 'escape', extra: 'Ctrl+Alt+E' },
  { label: '去转义 (Unescape)', key: 'unescape', extra: 'Ctrl+Alt+Shift+E' },
  { label: '中文 → Unicode', key: 'cn2unicode', extra: 'Ctrl+Alt+U' },
  { label: 'Unicode → 中文', key: 'unicode2cn', extra: 'Ctrl+Alt+Shift+U' }
];

function handleTransformSelect(key: string) {
  configStore.transformRequest = key;
}

// Toggle Expand/Collapse Logic
const isExpanded = ref(false);

const expandTitle = computed(() => isExpanded.value ? '全折叠' : '全展开');

function toggleExpand() {
  if (isExpanded.value) {
    appStore.requestCollapse();
    isExpanded.value = false;
  } else {
    appStore.requestExpand();
    isExpanded.value = true;
  }
}

// Reset state when tab changes
watch(() => appStore.activeTabId, () => {
  isExpanded.value = false;
});

type ClipboardPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';
type ClipboardReadUse = 'new' | 'paste';

const clipboardSupported = ref(true);
const clipboardSecure = ref(true);
const clipboardPermission = ref<ClipboardPermissionState>('unknown');
const permissionStatusRef = ref<PermissionStatus | null>(null);

const CLIPBOARD_PERMISSION_SHOWN_KEY = 'easy-formatter-clipboard-permission-shown';

function getClipboardReadSupported() {
  return !!(navigator as any).clipboard?.readText;
}

function getSecureContext() {
  return typeof window !== 'undefined' ? (window as any).isSecureContext === true : false;
}

async function refreshClipboardPermission() {
  clipboardSupported.value = getClipboardReadSupported();
  clipboardSecure.value = getSecureContext();

  if (!clipboardSupported.value) {
    clipboardPermission.value = 'unknown';
    return;
  }

  const permissionsApi = (navigator as any).permissions;
  if (!permissionsApi?.query) {
    clipboardPermission.value = 'unknown';
    return;
  }

  try {
    const status: PermissionStatus = await permissionsApi.query({ name: 'clipboard-read' as any });
    permissionStatusRef.value = status;
    clipboardPermission.value = (status as any).state || 'unknown';
    status.onchange = () => {
      clipboardPermission.value = (status as any).state || 'unknown';
    };
  } catch {
    clipboardPermission.value = 'unknown';
  }
}

onMounted(() => {
  refreshClipboardPermission();
});

function isNotAllowedError(e: unknown) {
  const anyErr = e as any;
  return anyErr?.name === 'NotAllowedError' || String(e).includes('NotAllowedError');
}

function openManualPasteDialog(use: ClipboardReadUse) {
  const manualText = ref('');
  dialog.create({
    title: '手动粘贴',
    content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 12px;' }, [
      h('div', { style: 'color: #666; font-size: 12px; line-height: 18px;' }, '当前无法自动读取剪贴板。你仍可在下方输入框中使用 Ctrl+V 手动粘贴。'),
      h(NInput, {
        type: 'textarea',
        value: manualText.value,
        placeholder: '在此处粘贴内容…',
        autosize: { minRows: 6, maxRows: 14 },
        onUpdateValue: (v: string) => manualText.value = v
      })
    ]),
    positiveText: use === 'new' ? '创建临时标签' : '粘贴到编辑器',
    negativeText: '取消',
    onPositiveClick: () => {
      const text = manualText.value;
      if (!text) {
        notification.warning({ title: '内容为空', duration: 1500 });
        return false;
      }
      if (use === 'new') {
        const tab = appStore.createScratchTab(text, 'paste');
        appStore.activeTabId = tab.id;
      } else {
        configStore.pasteRequest = text;
      }
      return true;
    }
  });
}

function openPermissionDeniedGuide(use: ClipboardReadUse, err?: unknown) {
  dialog.create({
    title: '剪贴板权限被拒绝',
    content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 10px; line-height: 18px;' }, [
      h('div', { style: 'color: #333; font-size: 13px;' }, '应用需要读取剪贴板来完成“新粘/粘贴”功能。当前权限被拒绝，无法自动读取。'),
      h('div', { style: 'color: #666; font-size: 12px;' }, '你可以：'),
      h('div', { style: 'color: #666; font-size: 12px;' }, '1) 在系统/浏览器的站点权限中允许“剪贴板读取”后重试'),
      h('div', { style: 'color: #666; font-size: 12px;' }, '2) 直接使用“手动粘贴”作为替代方案'),
      err ? h('div', { style: 'color: #999; font-size: 12px; margin-top: 6px; word-break: break-all;' }, String(err)) : null
    ].filter(Boolean)),
    positiveText: '手动粘贴',
    negativeText: '关闭',
    onPositiveClick: () => {
      openManualPasteDialog(use);
      return true;
    }
  });
}

async function readClipboardTextInteractive(use: ClipboardReadUse) {
  await refreshClipboardPermission();

  if (!clipboardSupported.value) {
    notification.warning({ title: '当前环境不支持剪贴板 API', duration: 2000 });
    openManualPasteDialog(use);
    return null;
  }

  if (!clipboardSecure.value) {
    notification.warning({ title: '当前环境不是安全上下文，无法读取剪贴板', duration: 2500 });
    openManualPasteDialog(use);
    return null;
  }

  if (clipboardPermission.value === 'denied') {
    openPermissionDeniedGuide(use);
    return null;
  }

  const shown = localStorage.getItem(CLIPBOARD_PERMISSION_SHOWN_KEY) === '1';
  if (!shown && (clipboardPermission.value === 'prompt' || clipboardPermission.value === 'unknown')) {
    dialog.create({
      title: '请求剪贴板权限',
      content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 10px; line-height: 18px;' }, [
        h('div', { style: 'color: #333; font-size: 13px;' }, '需要读取剪贴板内容以创建“临时标签/粘贴到编辑器”。'),
        h('div', { style: 'color: #666; font-size: 12px;' }, '点击“允许并读取”将触发系统/浏览器的剪贴板权限流程。若仍失败，可选择“手动粘贴”。')
      ]),
      positiveText: '允许并读取',
      negativeText: '手动粘贴',
      onPositiveClick: async () => {
        localStorage.setItem(CLIPBOARD_PERMISSION_SHOWN_KEY, '1');
        try {
          const result = await readClipboardWithFallback();
          await refreshClipboardPermission();
          return result ? result.text : '';
        } catch (e) {
          await refreshClipboardPermission();
          if (isNotAllowedError(e)) {
            openPermissionDeniedGuide(use, e);
            return null;
          }
          notification.error({ title: '无法读取剪贴板', content: String(e), duration: 3000 });
          openManualPasteDialog(use);
          return null;
        }
      },
      onNegativeClick: () => {
        localStorage.setItem(CLIPBOARD_PERMISSION_SHOWN_KEY, '1');
        openManualPasteDialog(use);
        return true;
      }
    });
    return null;
  }

  try {
    const result = await readClipboardWithFallback();
    await refreshClipboardPermission();
    return result ? result.text : '';
  } catch (e) {
    await refreshClipboardPermission();
    if (isNotAllowedError(e)) {
      openPermissionDeniedGuide(use, e);
      return null;
    }
    notification.error({ title: '无法读取剪贴板', content: String(e), duration: 3000 });
    openManualPasteDialog(use);
    return null;
  }
}

const isMac = typeof navigator !== 'undefined' && 
  (navigator.platform.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent.toUpperCase().indexOf('MAC') >= 0);
const ctrlOrCmd = isMac ? 'Cmd' : 'Ctrl';

const openFileTitle = computed(() => `打开文件 (${ctrlOrCmd}+O)`);
const saveFileTitle = computed(() => `保存文件 (${ctrlOrCmd}+S)`);
const undoTitle = computed(() => `撤销 (${ctrlOrCmd}+Z)`);
const redoTitle = computed(() => `重做 (${ctrlOrCmd}+Shift+Z)`);

const clipboardTipBase = computed(() => {
  if (!clipboardSupported.value) return '当前环境不支持剪贴板 API，将改用手动粘贴';
  if (!clipboardSecure.value) return '当前环境不是安全上下文，无法读取剪贴板，将改用手动粘贴';
  if (clipboardPermission.value === 'denied') return '剪贴板读取权限被拒绝，点击查看解决方案';
  if (clipboardPermission.value === 'prompt') return '可能需要授权剪贴板读取权限';
  return '读取剪贴板';
});

const clipboardTipForNew = computed(() => `新粘：${clipboardTipBase.value}`);
const clipboardTipForPaste = computed(() => `粘贴 (${ctrlOrCmd}+V)：${clipboardTipBase.value}`);

function handleUndo() {
  if (appStore.activePanel === 'preview') {
    if (configStore.transformResult !== null) {
      if (configStore.canUndo) configStore.undoTransform();
    } else {
      if (configStore.canUndoDocument) configStore.undoDocument();
    }
  } else {
    configStore.editorActionRequest = 'undo';
  }
}

function handleRedo() {
  if (appStore.activePanel === 'preview') {
    if (configStore.transformResult !== null) {
      if (configStore.canRedo) configStore.redoTransform();
    } else {
      if (configStore.canRedoDocument) configStore.redoDocument();
    }
  } else {
    configStore.editorActionRequest = 'redo';
  }
}

async function createFromClipboard() {
  const text = await readClipboardTextInteractive('new');
  if (text === null) return;
  if (!text) {
    notification.warning({ title: '剪贴板为空', duration: 2000 });
    return;
  }
  const tab = appStore.createScratchTab(text, 'paste');
  appStore.activeTabId = tab.id;
}

async function openFile() {
  const path = await commands.pickFile();
  if (path) {
    await configStore.loadFile(path);
  }
}

async function saveFile() {
  const success = await configStore.saveFile();
  if (success) {
    notification.success({ title: '已保存', duration: 2000 });
  }
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

function handleCopy() {
  configStore.editorActionRequest = 'copy';
}

async function handlePaste() {
  const text = await readClipboardTextInteractive('paste');
  if (text === null) return;
  if (text) {
    configStore.pasteRequest = text;
  } else {
    notification.warning({ title: '剪贴板为空', duration: 1000 });
  }
}
</script>

<style scoped>
.function-bar {
  min-height: 40px;
  margin: 0;
  padding: 4px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-sizing: border-box;
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

/* Postman-like icon buttons */
.icon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 4px;
  border: 1px solid transparent !important; /* Reserve space for border */
  background-color: transparent;
  color: #6b6b6b; /* Slightly lighter gray */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background-color: #f2f2f2;
  color: #212121;
}

.icon-btn:active {
  background-color: #e6e6e6;
  transform: translateY(1px);
}

.icon-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
  background-color: transparent;
}

/* Icon Transition */
.icon-scale-enter-active,
.icon-scale-leave-active {
  transition: all 0.2s ease;
}

.icon-scale-enter-from,
.icon-scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
