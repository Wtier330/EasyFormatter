
/**
 * Text Transformation Utilities
 */

export type TransformMode = 'escape' | 'unescape' | 'cn2unicode' | 'unicode2cn';

export type TransformResult = 
  | { ok: true; output: string }
  | { ok: false; error: string };

/**
 * Escapes text by ONLY escaping backslashes
 * Input: "abc \ def" -> Output: "abc \\ def"
 * Does NOT escape quotes, newlines, etc.
 */
function escape(text: string): string {
  return text.replace(/\\/g, '\\\\');
}

/**
 * Unescapes text by ONLY unescaping double backslashes
 * Input: "abc \\ def" -> Output: "abc \ def"
 * Does NOT unescape \", \n, \uXXXX, etc.
 */
function unescape(text: string): string {
  return text.replace(/\\\\/g, '\\');
}

/**
 * Converts non-ASCII characters to \uXXXX format
 * Handles surrogate pairs naturally by processing UTF-16 code units
 */
function cn2unicode(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode > 127) {
      result += '\\u' + charCode.toString(16).padStart(4, '0');
    } else {
      result += text[i];
    }
  }
  return result;
}

/**
 * Converts \uXXXX sequences back to characters
 * Preserves other escaped sequences (like \n, \")
 */
function unicode2cn(text: string): string {
  // Replace \uXXXX (case insensitive)
  return text.replace(/\\u([0-9a-fA-F]{4})/gi, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return match;
    }
  });
}

export function transformText(input: string, mode: TransformMode): TransformResult {
  try {
    let output = '';
    switch (mode) {
      case 'escape':
        output = escape(input);
        break;
      case 'unescape':
        output = unescape(input);
        break;
      case 'cn2unicode':
        output = cn2unicode(input);
        break;
      case 'unicode2cn':
        output = unicode2cn(input);
        break;
    }
    return { ok: true, output };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const TRANSFORM_MODES: Record<TransformMode, string> = {
  escape: '转义 (Escape: \\ -> \\\\)',
  unescape: '去转义 (Unescape: \\\\ -> \\)',
  cn2unicode: '中文 → Unicode',
  unicode2cn: 'Unicode → 中文'
};
