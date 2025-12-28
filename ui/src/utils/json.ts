export function safeParse(jsonStr: string): { data: any; error: string | null } {
  try {
    const data = JSON.parse(jsonStr);
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export function formatJson(data: any, indent: number = 2): string {
  return JSON.stringify(data, null, indent);
}

export function minifyJson(data: any): string {
  return JSON.stringify(data);
}

// Parse a path like: root.user["first.name"][0].age
// Returns tokens excluding 'root': ['user', 'first.name', 0, 'age']
export function parsePath(path: string): Array<string | number> {
  const tokens: Array<string | number> = [];
  const re = /([a-zA-Z_$][a-zA-Z0-9_$]*)|\[(\d+)\]|\["([^"]+)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(path)) !== null) {
    const [_, ident, idx, quoted] = match;
    const token = ident ?? quoted ?? (idx !== undefined ? Number(idx) : undefined);
    if (token !== undefined) tokens.push(token);
  }
  if (tokens[0] === 'root') tokens.shift();
  return tokens;
}

// Set value by tokens on a deep clone of root; returns new root
export function setByPath(root: any, tokens: Array<string | number>, value: any): any {
  const copy = JSON.parse(JSON.stringify(root));
  let cur = copy;
  for (let i = 0; i < tokens.length - 1; i++) {
    const t = tokens[i];
    cur = cur[t as any];
    if (cur === undefined) throw new Error('Invalid path');
  }
  const last = tokens[tokens.length - 1];
  (cur as any)[last as any] = value;
  return copy;
}
