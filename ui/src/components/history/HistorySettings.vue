<template>
  <n-modal v-model:show="show" preset="card" title="历史设置与维护" style="width: 600px">
    <!-- Stats -->
    <div class="section-title">存储概览</div>
    <n-grid :cols="3" :x-gap="12" style="margin-bottom: 24px; background: #f9f9f9; padding: 16px; border-radius: 8px;">
      <n-gi>
        <n-statistic label="数据库大小" :value="formatSize(store.stats?.db_size || 0)" />
      </n-gi>
      <n-gi>
        <n-statistic label="总版本数" :value="store.stats?.records_count || 0" />
      </n-gi>
      <n-gi>
        <n-statistic label="文件数" :value="store.stats?.file_count || 0" />
      </n-gi>
    </n-grid>

    <div class="section-title">保留策略</div>
    <div class="desc">设置自动清理的阈值（需手动点击清理或重启时生效）</div>
    
    <n-form label-placement="left" label-width="140" style="margin-top: 12px">
       <n-form-item label="保留最近 N 天">
          <n-input-number v-model:value="config.historyRetention.maxDays" :min="1" />
       </n-form-item>
       <n-form-item label="单文件最大保留条数">
          <n-input-number v-model:value="config.historyRetention.maxRecords" :min="10" />
       </n-form-item>
    </n-form>

    <n-divider />

    <div class="section-title">维护操作</div>
    <div class="actions" style="margin-top: 12px">
       <n-popconfirm @positive-click="handleGC">
          <template #trigger>
             <n-button type="warning" :loading="store.loading">
                立即清理过期数据
             </n-button>
          </template>
          确定要根据当前保留策略清理数据吗？<br/>这将删除超过 {{ config.historyRetention.maxDays }} 天或超过 {{ config.historyRetention.maxRecords }} 条的历史记录。<br/>此操作不可撤销。
       </n-popconfirm>
    </div>
    
    <n-divider />
    
    <div class="section-title">调试信息 (Debug)</div>
    <div style="background: #f0f0f0; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; margin-top: 8px;">
        <div v-if="debugInfo">
Path: {{ debugInfo.path }}
Exists: {{ debugInfo.exists }}
ReadOnly: {{ debugInfo.readonly }}
WAL Enabled: {{ debugInfo.wal_enabled }}
Size: {{ formatSize(debugInfo.file_size) }}
        </div>
        <div v-else>Loading debug info...</div>
    </div>

    <template #footer>
        <div style="display: flex; justify-content: flex-end">
            <n-button @click="show = false">关闭</n-button>
        </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import { useConfigStore } from '../../stores/config';
import { historyService, type DebugDbInfo } from '../../services/historyService';
import { NModal, NGrid, NGi, NStatistic, NDivider, NForm, NFormItem, NInputNumber, NButton, NPopconfirm, useMessage } from 'naive-ui';

const props = defineProps<{
  modelValue: boolean
}>();

const emit = defineEmits(['update:modelValue']);

const store = useHistoryWorkspaceStore();
const config = useConfigStore();
const message = useMessage();
const debugInfo = ref<DebugDbInfo | null>(null);

const show = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
});

watch(show, async (v) => {
    if (v) {
        store.fetchStats();
        try {
            debugInfo.value = await historyService.getDebugDbInfo();
        } catch (e) {
            console.error(e);
        }
    }
});

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleGC() {
   try {
      const res = await store.gc(config.historyRetention.maxDays, config.historyRetention.maxRecords);
      message.success(`清理完成：删除了 ${res.removed_count} 条记录，释放 ${formatSize(res.removed_bytes)}`);
   } catch (e) {
      message.error('清理失败');
   }
}
</script>

<style scoped>
.section-title {
    font-weight: bold;
    font-size: 14px;
    margin-bottom: 8px;
    color: #333;
}
.desc {
    font-size: 12px;
    color: #999;
}
</style>
