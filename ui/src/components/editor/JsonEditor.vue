<template>
  <div class="editor-container">
    <n-input
      v-model:value="content"
      type="textarea"
      placeholder="请输入或粘贴 JSON..."
      :resizable="false"
      class="editor-input"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NInput } from 'naive-ui';
import { useConfigStore } from '../../stores/config';

const configStore = useConfigStore();

const content = computed({
  get: () => configStore.rawText,
  set: (val) => configStore.updateText(val)
});
</script>

<style scoped>
.editor-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}
.editor-input {
  flex: 1;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
}
:deep(.n-input__textarea-el) {
  height: 100% !important;
}
</style>
