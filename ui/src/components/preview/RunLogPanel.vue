<template>
  <div class="run-log-panel">
    <div class="header">
      <div class="header-left">
        <span>运行日志</span>
        <span v-if="runStore.isRunning" class="status running">运行中...</span>
        <span v-else class="status done">已结束</span>
      </div>
      <div class="header-right">
        <n-button-group size="tiny">
          <n-button ghost size="tiny" @click="copyLogs">复制</n-button>
          <n-button ghost size="tiny" @click="saveLogs">保存</n-button>
          <n-button ghost size="tiny" @click="runStore.logs = []">清空</n-button>
        </n-button-group>
      </div>
    </div>
    <div class="logs" ref="logContainer">
      <div v-for="(log, i) in runStore.logs" :key="i" class="log-line">{{ log }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { NButton, NButtonGroup, useMessage } from 'naive-ui';
import { useRunStore } from '../../stores/run';
import { copyToClipboard } from '../../utils/path';
import { commands } from '../../tauri';

const runStore = useRunStore();
const message = useMessage();
const logContainer = ref<HTMLElement | null>(null);

watch(() => runStore.logs.length, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
});

async function copyLogs() {
  const text = runStore.logs.join('\n');
  if (await copyToClipboard(text)) {
    message.success('日志已复制');
  } else {
    message.error('复制失败');
  }
}

async function saveLogs() {
  const text = runStore.logs.join('\n');
  try {
    const path = await commands.saveFile('log.txt');
    if (path) {
      await commands.writeText(path, text);
      message.success('日志已保存');
    }
  } catch (e) {
    message.error('保存失败: ' + e);
  }
}
</script>

<style scoped>
.run-log-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
}
.header {
  padding: 5px 10px;
  background-color: #252526;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  font-weight: bold;
}
.status.running { color: #007acc; }
.status.done { color: #888; }

.logs {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}
.log-line {
  margin-bottom: 2px;
}
</style>
