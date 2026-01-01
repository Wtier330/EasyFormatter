
// contentAnalysis.ts
// 用于识别拖入文件的内容类型：JSON / JSONP / Text

export type ContentType = 'json' | 'jsonp' | 'text';

export interface AnalysisResult {
  type: ContentType;
  content: string; // 处理后的内容（如 JSONP 提取后的 JSON，或原始文本）
  originalContent: string;
  error?: string;
  isJsonpWrapper?: boolean;
}

/**
 * 移除 BOM 头
 */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * 尝试提取 JSONP
 * 逻辑：
 * 1. 去掉首尾空白
 * 2. 匹配 `identifier(...)` 或 `identifier(...);`
 * 3. 提取括号内的内容
 */
export function extractJsonp(text: string): string | null {
  const trimmed = text.trim();
  // 简单快速检查：是否以 ( 或 字母开头，以 ) 或 ); 结尾
  // 正则：
  // ^\s*([a-zA-Z_$][a-zA-Z0-9_$]*\s*\()   <-- 函数名 + 左括号
  // ([\s\S]*)                             <-- 中间内容 (Group 2)
  // \)\s*;?\s*$                           <-- 右括号 + 可选分号
  
  // 宽松模式：只要是 xxx(...) 结构
  const jsonpRegex = /^\s*([a-zA-Z_$][a-zA-Z0-9_$.]*\s*)\(([\s\S]*)\)\s*;?\s*$/;
  const match = trimmed.match(jsonpRegex);
  
  if (match && match[2]) {
    return match[2]; // 返回括号内的内容
  }
  
  // 另一种常见形式：直接是 (...) 包裹的 JSON
  if (trimmed.startsWith('(') && (trimmed.endsWith(')') || trimmed.endsWith(');'))) {
     // 去掉首尾括号
     let content = trimmed;
     if (content.endsWith(';')) content = content.slice(0, -1);
     if (content.startsWith('(') && content.endsWith(')')) {
         return content.slice(1, -1);
     }
  }

  return null;
}

export function analyzeContent(rawText: string, detectJsonp: boolean = true): AnalysisResult {
  const cleanText = stripBOM(rawText);
  
  // 1. 尝试直接 Parse JSON
  try {
    JSON.parse(cleanText);
    return {
      type: 'json',
      content: cleanText,
      originalContent: cleanText
    };
  } catch (e) {
    // 不是标准 JSON
  }

  // 2. 尝试识别 JSONP
  if (detectJsonp) {
    const extracted = extractJsonp(cleanText);
    if (extracted) {
      try {
        JSON.parse(extracted);
        return {
          type: 'jsonp',
          content: extracted, // 提取后的 JSON
          originalContent: cleanText,
          isJsonpWrapper: true
        };
      } catch (e) {
        // 提取出的内容也不是 JSON
      }
    }
  }

  // 3. 降级为纯文本
  return {
    type: 'text',
    content: cleanText,
    originalContent: cleanText
  };
}
