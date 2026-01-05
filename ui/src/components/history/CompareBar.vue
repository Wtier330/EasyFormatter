<template>
  <div class="compare-bar">
    <!-- Left: Selected Record -->
    <div class="cb-section left">
       <div class="record-info" v-if="record">
          <n-tag size="small" :type="getOpTagType(record)">{{ getOpLabel(record.op_type) }}</n-tag>
          <span class="cb-time">{{ formatTime(record.ts) }}</span>
       </div>
       <div v-else class="record-info placeholder">
          预览模式：最新版本
       </div>
    </div>
    
    <!-- Center: Stats -->
    <div class="cb-section center" v-if="record">
       <template v-if="loading">
           <n-spin size="small" />
       </template>
       <template v-else-if="isIdentical">
           <span class="stat-same">无变更 (与基准一致)</span>
       </template>
       <template v-else>
           <span v-if="stats.added > 0" class="stat-item added">+{{ stats.added }} lines</span>
           <span v-if="stats.removed > 0" class="stat-item removed">-{{ stats.removed }} lines</span>
           <span v-if="stats.added === 0 && stats.removed === 0" class="stat-item">0 lines changed</span>
       </template>
    </div>

    <!-- Right: Base -->
    <div class="cb-section right" v-if="record">
       <slot name="extra"></slot>
       <n-divider vertical />
       <span class="cb-label">VS</span>
       <n-popselect 
           v-model:value="baseMode" 
           :options="baseOptions" 
           trigger="click"
           @update:value="onBaseModeChange"
       >
          <div class="base-selector" title="点击切换对比基准">
              <span class="base-text">{{ baseText }}</span>
              <n-icon size="12"><ChevronDown /></n-icon>
          </div>
       </n-popselect>
       
       <n-divider vertical />
       <n-button quaternary circle size="small" @click="$emit('close')" title="关闭历史预览">
         <template #icon><n-icon><CloseOutline /></n-icon></template>
       </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { NTag, NIcon, NPopselect, NSpin, NButton, NDivider } from 'naive-ui';
import { ChevronDown, CloseOutline } from '@vicons/ionicons5';
import type { VersionSummary } from '../../services/historyService';

const props = defineProps<{
  record: VersionSummary | null;
  baseRecord: VersionSummary | null; // null means Latest
  stats: { added: number; removed: number };
  loading: boolean;
  currentBaseMode: 'latest' | 'previous';
}>();

const emit = defineEmits<{
  (e: 'update:baseMode', mode: 'latest' | 'previous'): void;
  (e: 'close'): void;
}>();

const baseMode = ref(props.currentBaseMode);

const baseOptions = [
  { label: '基准：最新版本 (Latest)', value: 'latest' },
  { label: '基准：上一条记录 (Previous)', value: 'previous' }
];

const isIdentical = computed(() => {
    return props.stats.added === 0 && props.stats.removed === 0;
});

const baseText = computed(() => {
    if (props.currentBaseMode === 'latest') return '最新版本';
    if (props.currentBaseMode === 'previous') return '上一条记录';
    return '最新版本';
});

function onBaseModeChange(val: 'latest' | 'previous') {
    emit('update:baseMode', val);
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleString([], {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function getOpLabel(op: string) {
    const map: Record<string, string> = {
        save: '保存',
        compress: '压缩',
        format: '格式化',
        escape: '转义',
        unescape: '去转义',
        unicode: 'Unicode',
        rollback: '回滚',
        copy_restore: '复制还原'
    };
    return map[op] || op;
}

function getOpTagType(record: VersionSummary) {
    if (record.is_checkpoint) return 'warning';
    if (record.op_type === 'rollback') return 'error';
    if (record.op_type === 'copy_restore') return 'info';
    return 'default'; // Patch
}
</script>

<style scoped>
.compare-bar {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 13px;
  user-select: none;
}

.cb-section {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cb-section.left {
    min-width: 200px;
}

.cb-section.center {
    flex: 1;
    justify-content: center;
}

.cb-section.right {
    min-width: 150px;
    justify-content: flex-end;
}

.record-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.record-info.placeholder {
    color: #999;
    font-style: italic;
}

.cb-time {
    font-weight: 500;
    color: #333;
}

.cb-hash {
    display: none;
}

.nav-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-right: 12px;
}

.nav-count {
    font-size: 11px;
    color: #666;
    min-width: 30px;
    text-align: center;
}

.stat-item {
    font-family: monospace;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
}

.stat-item.added {
    color: #18a058;
    background: #e7f5ee;
}

.stat-item.removed {
    color: #d03050;
    background: #fdece8;
}

.stat-same {
    color: #999;
    background: #f5f5f5;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.cb-label {
    color: #999;
    font-size: 12px;
    font-weight: bold;
}

.base-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
    color: #666;
}

.base-selector:hover {
    background-color: #f5f5f5;
    color: #333;
}

.base-text {
    font-weight: 500;
}
</style>
