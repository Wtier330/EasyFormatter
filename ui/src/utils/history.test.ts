
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryManager, Command } from './history';

// Mock Command
class MockCommand implements Command {
  constructor(
    public id: number,
    public size: number = 100
  ) {}

  execute = vi.fn();
  undo = vi.fn();
  
  getEstimatedSize() {
    return this.size;
  }
}

describe('HistoryManager', () => {
  let history: HistoryManager;

  beforeEach(() => {
    history = new HistoryManager(5, 1000); // Limit 5 steps, 1000 bytes
  });

  it('should push and execute commands', () => {
    const cmd = new MockCommand(1);
    history.execute(cmd);
    
    expect(cmd.execute).toHaveBeenCalled();
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('should undo commands', () => {
    const cmd = new MockCommand(1);
    history.execute(cmd);
    
    history.undo();
    expect(cmd.undo).toHaveBeenCalled();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('should redo commands', () => {
    const cmd = new MockCommand(1);
    history.execute(cmd);
    history.undo();
    
    history.redo();
    expect(cmd.execute).toHaveBeenCalledTimes(2); // Initial + Redo
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('should enforce step limit', () => {
    // Limit is 5
    for (let i = 0; i < 7; i++) {
      history.execute(new MockCommand(i));
    }
    
    // Should keep last 5 (2, 3, 4, 5, 6)
    // Undo 5 times should work, 6th should fail
    for (let i = 0; i < 5; i++) {
      expect(history.canUndo).toBe(true);
      history.undo();
    }
    expect(history.canUndo).toBe(false);
  });

  it('should enforce size limit', () => {
    // Limit is 1000 bytes
    // Add big command (600 bytes)
    history.execute(new MockCommand(1, 600));
    // Add another big command (500 bytes) -> Total 1100 > 1000
    // Should remove first one
    history.execute(new MockCommand(2, 500));
    
    // Now undo stack should only have command 2
    history.undo(); // Undo command 2
    expect(history.canUndo).toBe(false); // Command 1 should be gone
  });

  it('should clear redo stack on new action', () => {
    history.execute(new MockCommand(1));
    history.undo();
    expect(history.canRedo).toBe(true);
    
    history.execute(new MockCommand(2));
    expect(history.canRedo).toBe(false);
  });
});
