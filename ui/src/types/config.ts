export interface AppConfig {
  theme: 'light' | 'dark' | 'auto';
  sidebarWidth: number;
  previewWidth: number;
  recentFiles: string[];
  favorites: string[];
}

export interface FileInfo {
  path: string;
  name: string;
  isDir: boolean;
}

export type JsonMode = 'Format' | 'Minify';
