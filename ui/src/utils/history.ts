
export interface Command {
  execute(): void;
  undo(): void;
  getEstimatedSize(): number; // Estimate size in bytes
}

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private limit: number;
  private maxSizeBytes: number;
  private currentSize: number = 0;

  constructor(limit: number = 20, maxSizeBytes: number = 5 * 1024 * 1024) { // Default 5MB
    this.limit = limit;
    this.maxSizeBytes = maxSizeBytes;
  }

  // Use this when the action has ALREADY been performed and we just want to record it
  push(command: Command) {
    this.undoStack.push(command);
    this.currentSize += command.getEstimatedSize();
    this.redoStack = []; // Clear redo stack
    
    this.enforceLimits();
  }

  // Use this to perform the action AND record it
  execute(command: Command) {
    command.execute();
    this.push(command);
  }

  undo() {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      // Note: Size doesn't change because we still keep it in redo stack
      // But strictly speaking, if we want to manage TOTAL history size (undo + redo), it's fine.
    }
  }

  redo() {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
    }
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.currentSize = 0;
  }

  private enforceLimits() {
    // Enforce Step Limit
    while (this.undoStack.length > this.limit) {
      const removed = this.undoStack.shift();
      if (removed) {
        this.currentSize -= removed.getEstimatedSize();
      }
    }

    // Enforce Size Limit
    // We remove from the BEGINNING of undo stack (oldest)
    while (this.currentSize > this.maxSizeBytes && this.undoStack.length > 0) {
      const removed = this.undoStack.shift();
      if (removed) {
        this.currentSize -= removed.getEstimatedSize();
      }
    }
  }
}
