export interface Range {
  start: number;
  end: number;
}

/**
 * Scans the JSON string to find the location (start/end offset) of the key or value specified by the path.
 * 
 * @param text The JSON string
 * @param pathTokens The path to the node (e.g. ['properties', 0, 'name'])
 * @returns The range of the KEY if the target is a property, or the range of the VALUE if it's an array item or root.
 */
export function findNodeRange(text: string, pathTokens: (string | number)[]): Range | null {
  let pos = 0;
  const len = text.length;

  function isSpace(code: number) {
    return code === 32 || code === 9 || code === 10 || code === 13;
  }

  function skipWhitespace() {
    while (pos < len && isSpace(text.charCodeAt(pos))) {
      pos++;
    }
  }

  function parseString(): string | null {
    skipWhitespace();
    if (pos >= len || text.charCodeAt(pos) !== 34) return null; // 34 is "
    
    pos++; // skip opening "
    let res = '';
    
    while (pos < len) {
      const c = text.charCodeAt(pos);
      if (c === 92) { // backslash
        pos++;
        if (pos >= len) break;
        const esc = text[pos];
        if (esc === 'u') {
          res += String.fromCharCode(parseInt(text.substr(pos + 1, 4), 16));
          pos += 4;
        } else {
            // simple escape
            res += esc; 
        }
        pos++;
      } else if (c === 34) { // quote
        pos++;
        return res;
      } else {
        res += text[pos];
        pos++;
      }
    }
    return res;
  }
  
  // Just skip the string without decoding, returns range
  function skipStringRaw(): Range | null {
    skipWhitespace();
    if (pos >= len || text.charCodeAt(pos) !== 34) return null;
    const start = pos;
    pos++; 
    while (pos < len) {
      if (text.charCodeAt(pos) === 92) {
        pos += 2;
      } else if (text.charCodeAt(pos) === 34) {
        pos++;
        return { start, end: pos };
      } else {
        pos++;
      }
    }
    return { start, end: pos };
  }

  function skipValue() {
    skipWhitespace();
    if (pos >= len) return;
    const c = text.charCodeAt(pos);
    
    if (c === 123) { // {
      pos++;
      while (pos < len) {
        skipWhitespace();
        if (text.charCodeAt(pos) === 125) { // }
          pos++;
          return;
        }
        // key
        skipStringRaw();
        skipWhitespace();
        // colon
        if (text.charCodeAt(pos) === 58) pos++;
        // value
        skipValue();
        skipWhitespace();
        // comma
        if (text.charCodeAt(pos) === 44) pos++;
      }
    } else if (c === 91) { // [
      pos++;
      while (pos < len) {
        skipWhitespace();
        if (text.charCodeAt(pos) === 93) { // ]
          pos++;
          return;
        }
        skipValue();
        skipWhitespace();
        if (text.charCodeAt(pos) === 44) pos++;
      }
    } else if (c === 34) { // "
      skipStringRaw();
    } else {
      // number, true, false, null
      // consume until separator
      while (pos < len) {
        const cc = text.charCodeAt(pos);
        if (isSpace(cc) || cc === 44 || cc === 125 || cc === 93) { // , } ]
          break;
        }
        pos++;
      }
    }
  }

  // Main traversal
  for (let i = 0; i < pathTokens.length; i++) {
    const token = pathTokens[i];
    skipWhitespace();
    
    if (pos >= len) return null;
    const c = text.charCodeAt(pos);
    
    if (typeof token === 'string') {
        // Expecting Object
        if (c !== 123) return null;
        pos++; // skip {
        
        let found = false;
        while (pos < len) {
            skipWhitespace();
            if (text.charCodeAt(pos) === 125) break; // }
            
            // Check key
            const keyStart = pos;
            const keyName = parseString(); // this moves pos
            
            if (keyName === token) {
                // Found the key!
                // If this is the last token, we return the key range
                if (i === pathTokens.length - 1) {
                    // Re-calculate raw range for the key string we just parsed
                    // parseString already moved pos. 
                    // But we want the range including quotes.
                    // We can't easily go back if parseString decoded stuff.
                    // So let's re-scan or just return what we have?
                    // Better: use skipStringRaw for checking?
                    // Wait, parseString is needed to compare values (handling escapes).
                    
                    // Let's rely on the fact that we just parsed it.
                    // But we need the range.
                    // Let's assume we want to highlight the Key.
                    // We can backtrack or use a peek approach.
                    
                    // Retrying with a simpler approach: 
                    // Since we already advanced pos, we need to know where we started.
                    // `keyStart` is the start. `pos` is the end.
                    return { start: keyStart, end: pos };
                }
                
                skipWhitespace();
                if (text.charCodeAt(pos) === 58) pos++; // :
                
                // Continue to next token in next loop iteration
                // But we are inside the loop over object properties.
                // We need to break this inner loop and continue the outer loop (path tokens).
                found = true;
                break; 
            } else {
                // Not the key, skip value
                skipWhitespace();
                if (text.charCodeAt(pos) === 58) pos++; // :
                skipValue();
                skipWhitespace();
                if (text.charCodeAt(pos) === 44) pos++; // ,
            }
        }
        if (!found) return null;
        
    } else if (typeof token === 'number') {
        // Expecting Array
        if (c !== 91) return null;
        pos++; // skip [
        
        let idx = 0;
        let found = false;
        while (pos < len) {
            skipWhitespace();
            if (text.charCodeAt(pos) === 93) break; // ]
            
            if (idx === token) {
                // Found the item
                // If this is the last token, we return the value range?
                // Usually paths pointing to array items mean the item itself.
                if (i === pathTokens.length - 1) {
                    const start = pos;
                    skipValue();
                    return { start, end: pos };
                }
                
                // Continue to next token
                found = true;
                break;
            }
            
            skipValue();
            idx++;
            skipWhitespace();
            if (text.charCodeAt(pos) === 44) pos++; // ,
        }
        if (!found) return null;
    }
  }
  
  return null;
}
