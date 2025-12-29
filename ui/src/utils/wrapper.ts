export interface WrapperDetection {
  isWrapper: boolean;
  type?: 'jsonp' | 'assignment';
  extracted?: string;
  message?: string;
  prefix?: string;
  suffix?: string;
}

/**
 * Detects if the text is wrapped in a common JS pattern (JSONP or Assignment)
 * and extracts the inner JSON object.
 * 
 * Strategy:
 * 1. Find the first '{' and last '}'.
 * 2. Check if the text surrounding these braces matches known patterns.
 * 3. Verify if the extracted content is valid JSON.
 */
export function detectWrapper(text: string): WrapperDetection {
  if (!text) return { isWrapper: false };
  
  const trimmed = text.trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  
  // Basic sanity check: must have braces and they must be in order
  if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
    return { isWrapper: false };
  }
  
  const candidateJson = trimmed.substring(firstBrace, lastBrace + 1);
  
  // Try to validate if candidate is JSON
  // Note: This might be expensive for huge files, but necessary for correctness
  try {
    JSON.parse(candidateJson);
  } catch (e) {
    // If the inner part isn't JSON, then it's not a wrapper we can handle simply
    return { isWrapper: false };
  }
  
  const prefix = trimmed.substring(0, firstBrace).trim();
  const suffix = trimmed.substring(lastBrace + 1).trim();
  
  // Analyze prefix/suffix
  
  // Case 1: JSONP / Function Call
  // Pattern: func( ... ) or func ( ... );
  // Suffix should be ')' or ');' or empty (if malformed)
  // Prefix should end with '('
  
  const isSuffixCompatible = suffix === '' || suffix === ';' || suffix === ')' || suffix === ');';
  
  if (isSuffixCompatible) {
    // Check for Function Call Pattern
    // Prefix ends with '('
    if (/\($/.test(prefix)) {
      // Extract function name for message
      const match = prefix.match(/([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*\($/);
      const funcName = match ? match[1] : 'Function';
      
      return {
        isWrapper: true,
        type: 'jsonp',
        extracted: candidateJson,
        message: `检测到 JSONP/JavaScript 包裹格式 (${funcName})`,
        prefix,
        suffix
      };
    }
    
    // Check for Assignment Pattern
    // Prefix ends with '=' or ':'
    if (/(?:=|:)$/.test(prefix)) {
      const match = prefix.match(/(?:var|let|const|window\.)?\s*([a-zA-Z_$][a-zA-Z0-9_$.]*)\s*(?:=|:)$/);
      const varName = match ? match[1] : 'Variable';
      
      return {
        isWrapper: true,
        type: 'assignment',
        extracted: candidateJson,
        message: `检测到变量赋值包裹格式 (${varName})`,
        prefix,
        suffix
      };
    }
  }
  
  // Fallback: If valid JSON is found inside, but pattern is not strictly recognized,
  // we can still offer it as "Generic Wrapper" if the wrapper text is small relative to content?
  // Or just strict mode?
  // User asked for "Jenkins update-center.json" optimization.
  // Jenkins format: `updateCenter.post( ... );` matches JSONP case.
  
  return { isWrapper: false };
}
