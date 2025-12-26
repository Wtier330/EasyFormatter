<template>
  <div class="run-log-panel">
    <div class="header">
      <span>运行日志</span>
      <n-button size="tiny" text @click="runStore.logs = []">清空</n-button>
    </div>
    <div class="logs" ref="logContainer">
      <div v-for="(log, i) in runStore.logs" :key="i" class="log-line">{{ log }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import { NButton } from 'naive-ui';
import { useRunStore } from '../../stores/run';

const runStore = useRunStore();
const logContainer = ref<HTMLElement | null>(null);

watch(() => runStore.logs.length, () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.run-log-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  color: #d4d4d4;
  font-family: monospace;
}
.header {
  padding: 5px 10px;
  background-color: #2d2d2d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logs {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  font-size: 12px;
  white-space: pre-wrap;
}
.log-line {
  margin-bottom: 2px;
}
</style>
