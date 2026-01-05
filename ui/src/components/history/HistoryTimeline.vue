<template>
  <div class="history-timeline">
    <div class="header">
        <span>历史记录</span>
    </div>
    <div class="timeline-content">
      <div v-if="historyGroups.length > 0">
        <div v-for="group in historyGroups" :key="group.date" class="date-group">
          <div class="date-label">{{ group.date }}</div>
          <div class="records">
            <div 
              v-for="record in group.records" 
              :key="record.id" 
              class="record-item"
              :class="{ active: store.selectedRecord?.id === record.id }"
              @click="store.selectRecord(record)"
            >
              <div class="time-col">
                  <div class="time">{{ formatTime(record.ts) }}</div>
                  <div class="op-line">
                     <n-tag :type="getOpTagType(record.op_type)" size="small" :bordered="false" round class="op-tag">
                        {{ getOpLabel(record.op_type) }}
                     </n-tag>
                  </div>
              </div>
              
              <div class="details">
                <div class="note" v-if="record.note">{{ record.note }}</div>
                <div class="meta-row">
                    <n-tag size="tiny" :bordered="false" type="info" v-if="record.is_checkpoint" class="mini-tag">快照</n-tag>
                    <n-tag size="tiny" :bordered="false" type="warning" v-if="record.op_type === 'rollback'" class="mini-tag">回滚</n-tag>
                    <span class="size-info">{{ formatSize(record.payload_size) }}</span>
                </div>
                
                <!-- Expanded Summary -->
                <div class="expanded-summary" v-if="store.selectedRecord?.id === record.id">
                    <n-divider style="margin: 4px 0" />
                    <div class="summary-row">
                        <span>ID: {{ record.id }}</span>
                        <span title="可回放">✅</span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty">
        <n-empty description="暂无记录" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NTag, NEmpty, NDivider } from 'naive-ui';
import { useHistoryWorkspaceStore } from '../../stores/historyWorkspace';
import type { VersionSummary } from '../../services/historyService';

const store = useHistoryWorkspaceStore();

const historyGroups = computed(() => {
  const groups: Record<string, VersionSummary[]> = {};

  store.records.forEach(r => {
    const date = new Date(r.ts * 1000).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(r);
  });
  
  return Object.keys(groups).map(date => ({
    date,
    records: groups[date]
  }));
});

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
}

function getOpTagType(op: string) {
  switch(op) {
    case 'save': return 'success';
    case 'rollback': return 'error'; // Red for rollback
    case 'format': return 'info';
    case 'compress': return 'warning';
    case 'transform': return 'primary';
    default: return 'default';
  }
}

function getOpLabel(op: string) {
  const map: Record<string, string> = {
    save: '保存',
    open: '打开',
    format: '格式化',
    compress: '压缩',
    rollback: '回滚',
    transform: '变换',
    auto: '自动'
  };
  return map[op] || op;
}
</script>

<style scoped>
.history-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 8px 12px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
  background: #f9f9f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.date-group {
  margin-bottom: 16px;
}

.date-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  padding-left: 4px;
}

.record-item {
  display: flex;
  padding: 8px;
  margin-bottom: 8px;
  background: #fff;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #eee;
  transition: all 0.2s;
}

.record-item:hover {
  background: #fcfcfc;
  border-color: #ddd;
}

.record-item.active {
  background: #e6f7ff;
  border-color: #1890ff;
}

.time-col {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 60px;
    flex-shrink: 0;
    margin-right: 8px;
}

.time {
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.op-tag {
    transform: scale(0.9);
    transform-origin: left top;
}

.details {
  flex: 1;
  min-width: 0;
}

.note {
  font-size: 12px;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

.mini-tag {
    transform: scale(0.85);
    transform-origin: left center;
}

.size-info {
    font-size: 10px;
    color: #bbb;
    margin-left: auto;
}

.expanded-summary {
    font-size: 11px;
    color: #666;
}

.summary-row {
    display: flex;
    justify-content: space-between;
}

.empty {
  padding: 20px;
  display: flex;
  justify-content: center;
}
</style>
