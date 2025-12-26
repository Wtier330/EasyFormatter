export function shortenPath(path: string, maxLength: number = 30): string {
  if (!path) return '';
  if (path.length <= maxLength) return path;
  
  const parts = path.split(/[/\\]/);
  const filename = parts.pop() || '';
  
  // Windows style drive or root
  const root = parts[0] || '';
  
  if (filename.length > maxLength - 5) {
    return filename.substring(0, maxLength - 5) + '...';
  }
  
  const start = root ? `${root}\\...\\` : '...\\';
  
  return `${start}${filename}`;
}

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    console.error('Copy failed', e);
    return false;
  }
}
