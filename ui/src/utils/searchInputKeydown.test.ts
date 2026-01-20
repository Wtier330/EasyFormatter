import { describe, it, expect, vi } from 'vitest';
import { handleSearchFindInputKeydown } from './searchInputKeydown';

describe('handleSearchFindInputKeydown', () => {
  it('should handle Enter as next', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const result = handleSearchFindInputKeydown({ key: 'Enter' }, { next, prev });
    expect(next).toHaveBeenCalledTimes(1);
    expect(prev).toHaveBeenCalledTimes(0);
    expect(result).toEqual({ handled: true, preventDefault: true, stopPropagation: true });
  });

  it('should handle Shift+Enter as prev', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const result = handleSearchFindInputKeydown({ key: 'Enter', shiftKey: true }, { next, prev });
    expect(next).toHaveBeenCalledTimes(0);
    expect(prev).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ handled: true, preventDefault: true, stopPropagation: true });
  });

  it('should ignore non-Enter keys', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const result = handleSearchFindInputKeydown({ key: 'a' }, { next, prev });
    expect(next).toHaveBeenCalledTimes(0);
    expect(prev).toHaveBeenCalledTimes(0);
    expect(result.handled).toBe(false);
  });

  it('should ignore Enter during IME composition', () => {
    const next = vi.fn();
    const prev = vi.fn();
    const result = handleSearchFindInputKeydown({ key: 'Enter', isComposing: true }, { next, prev });
    expect(next).toHaveBeenCalledTimes(0);
    expect(prev).toHaveBeenCalledTimes(0);
    expect(result.handled).toBe(false);
  });
});

