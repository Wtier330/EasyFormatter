import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
vi.mock('../services/historyService', () => {
  return {
    historyService: {
      listFiles: vi.fn(async () => [{ id: 1, logical_path: 'C:/a.json', created_at: 0, updated_at: 0 }]),
      listVersions: vi.fn(async () => [
        { id: 10, ts: 1, op_type: 'save', note: '', payload_size: 10, is_checkpoint: true },
        { id: 11, ts: 2, op_type: 'format', note: '', payload_size: 10, is_checkpoint: false }
      ]),
      materialize: vi.fn(async (id: number) => {
        if (id === 10) {
          await new Promise(r => setTimeout(r, 50));
          return { content: '{"a":1}', hash: 'h1' };
        }
        return { content: '{"a":2}', hash: 'h2' };
      }),
      recordCheckpointStub: vi.fn(async () => 1),
      copyRestore: vi.fn(async () => 'C:/exports/restored.json'),
      deleteVersions: vi.fn(async () => ({ removed_count: 1, removed_bytes: 10 })),
      getStats: vi.fn(async () => ({ db_size: 0, records_count: 0, file_count: 1, top_files: [] })),
      gc: vi.fn(async () => ({ removed_count: 0, removed_bytes: 0 }))
    }
  };
});
import { useHistoryWorkspaceStore } from './historyWorkspace';

describe('historyWorkspace store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('materialize content maps to compareContent', async () => {
    const store = useHistoryWorkspaceStore();
    await store.enterHistoryMode();
    const file = { id: 1, logical_path: 'C:/a.json', created_at: 0, updated_at: 0 };
    await store.selectFile(file as any);
    const rec = { id: 11, ts: 2, op_type: 'format', note: '', payload_size: 10, is_checkpoint: false };
    await store.selectRecord(rec as any);
    expect(store.compareMode).toBe(true);
    expect(store.compareContent).toBe('{"a":2}');
  });

  it('fast switching keeps latest record content', async () => {
    const store = useHistoryWorkspaceStore();
    await store.enterHistoryMode();
    const file = { id: 1, logical_path: 'C:/a.json', created_at: 0, updated_at: 0 };
    await store.selectFile(file as any);
    const r1 = { id: 10, ts: 1, op_type: 'save', note: '', payload_size: 10, is_checkpoint: true };
    const r2 = { id: 11, ts: 2, op_type: 'format', note: '', payload_size: 10, is_checkpoint: false };
    const p1 = store.selectRecord(r1 as any);
    const p2 = store.selectRecord(r2 as any);
    await p1;
    await p2;
    expect(store.selectedRecord?.id).toBe(11);
    expect(store.compareContent).toBe('{"a":2}');
  });

  it('deleteVersions calls service and refreshes store', async () => {
    const store = useHistoryWorkspaceStore();
    await store.enterHistoryMode();
    const file = { id: 1, logical_path: 'C:/a.json', created_at: 0, updated_at: 0 };
    await store.selectFile(file as any);
    await store.deleteVersions([10]);
    expect(store.selectedRecord).toBe(null);
  });
});
