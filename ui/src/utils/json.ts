export function safeParse(jsonStr: string): { data: any; error: string | null } {
  try {
    const data = JSON.parse(jsonStr);
    return { data, error: null };
  } catch (e: any) {
    return { data: null, error: e.message };
  }
}

export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}

export function minifyJson(data: any): string {
  return JSON.stringify(data);
}
