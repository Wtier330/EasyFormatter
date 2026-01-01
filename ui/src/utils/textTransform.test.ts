import { describe, it, expect } from 'vitest';
import { transformText } from './textTransform';

describe('Text Transform Utils', () => {
  describe('Escape Mode (Backslash Only)', () => {
    it('should escape backslashes', () => {
      const input = 'C:\\Windows\\System32';
      const result = transformText(input, 'escape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('C:\\\\Windows\\\\System32');
      }
    });

    it('should NOT escape quotes', () => {
      const input = 'Hello "World"';
      const result = transformText(input, 'escape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('Hello "World"');
      }
    });

    it('should NOT escape newlines or tabs', () => {
      const input = 'Line1\nLine2\tTabbed';
      const result = transformText(input, 'escape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('Line1\nLine2\tTabbed');
      }
    });
  });

  describe('Unescape Mode (Backslash Only)', () => {
    it('should unescape double backslashes to single backslash', () => {
      const input = 'C:\\\\Windows\\\\System32';
      const result = transformText(input, 'unescape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('C:\\Windows\\System32');
      }
    });

    it('should ignore escaped quotes (treat them as literal)', () => {
      // Input: \" -> Output: \" (unchanged because only \\ is handled)
      const input = 'Says \\"Hello\\"';
      const result = transformText(input, 'unescape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('Says \\"Hello\\"');
      }
    });

    it('should handle mixed content correctly', () => {
      // Input: \\ (escaped backslash) and \n (newline char)
      const input = 'Line1\nLine2';
      const result = transformText(input, 'unescape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('Line1\nLine2');
      }
    });

    it('should reduce quadruple backslashes to double', () => {
      // \\\\ -> \\
      const input = '\\\\\\\\'; 
      const result = transformText(input, 'unescape');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.output).toBe('\\\\');
      }
    });
  });
});
