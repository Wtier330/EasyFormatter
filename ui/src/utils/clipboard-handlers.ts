import { readText } from '@tauri-apps/plugin-clipboard-manager';

/**
 * Utility functions for handling clipboard data and file reading.
 */

export interface ClipboardContent {
  text: string;
  source: 'text' | 'html' | 'file';
  filename?: string;
}

/**
 * Reads text content from a Blob or File object.
 */
export function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

/**
 * Processes DataTransfer object (from paste event) to extract useful content.
 * Prioritizes Files (if text-readable), then Text, then HTML.
 */
export async function processClipboardData(data: DataTransfer): Promise<ClipboardContent | null> {
  // 1. Check for Files
  if (data.files && data.files.length > 0) {
    // Process the first file
    const file = data.files[0];
    // Check if it's likely a text file based on type or name
    // We try to read it anyway if it's not obviously binary (like image/png)
    // But DataTransfer items usually have types.
    
    // List of common text types or empty (often empty for code files)
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (!isImage && !isVideo && !isAudio) {
      try {
        const text = await readBlobText(file);
        if (text) {
          return {
            text,
            source: 'file',
            filename: file.name
          };
        }
      } catch (e) {
        console.warn('Failed to read pasted file as text', e);
      }
    }
  }

  // 2. Check for Plain Text
  const plainText = data.getData('text/plain');
  if (plainText) {
    return {
      text: plainText,
      source: 'text'
    };
  }

  // 3. Check for HTML (Rich Text) and strip tags
  const htmlText = data.getData('text/html');
  if (htmlText) {
    // Basic strip tags
    const doc = new DOMParser().parseFromString(htmlText, 'text/html');
    const text = doc.body.textContent || '';
    if (text.trim()) {
      return {
        text,
        source: 'html'
      };
    }
  }

  return null;
}

/**
 * Attempts to read clipboard using the modern Async Clipboard API with support for HTML fallback.
 * This is used for button clicks where we don't have a paste event.
 */
export async function readClipboardWithFallback(): Promise<ClipboardContent | null> {
  // 1. Try Tauri Plugin first (if available and running in Tauri)
  try {
    // Check if we are in Tauri environment
    if ('__TAURI_INTERNALS__' in window) {
       const text = await readText();
       if (text) {
         return { text, source: 'text' };
       }
       return null;
    }
  } catch (e) {
    console.warn('Tauri clipboard plugin failed, falling back to browser API', e);
  }

  // 2. Fallback to Browser API
  const nav = navigator as any;
  if (!nav.clipboard) return null;

  // Try standard readText first (most common)
  try {
    const text = await nav.clipboard.readText();
    if (text) {
      return { text, source: 'text' };
    }
  } catch (e: any) {
    if (e.name === 'NotAllowedError' || String(e).includes('NotAllowedError')) {
      throw e;
    }
    // Ignore other errors, try read() next
  }

  // Try read() for other types (HTML, etc)
  if (nav.clipboard.read) {
    try {
      const items = await nav.clipboard.read();
      for (const item of items) {
        // Prefer text/plain
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await readBlobText(blob);
          if (text) return { text, source: 'text' };
        }
        // Fallback to text/html
        if (item.types.includes('text/html')) {
          const blob = await item.getType('text/html');
          const html = await readBlobText(blob);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const text = doc.body.textContent || '';
          if (text) return { text, source: 'html' };
        }
      }
    } catch (e) {
      console.warn('Clipboard.read() failed', e);
    }
  }

  return null;
}
