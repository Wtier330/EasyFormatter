export interface RecentFileItem {
  path: string;
  name: string;
  size?: number; // in bytes
  lastModified?: number; // timestamp
  lastOpened?: number; // timestamp
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'auto';
  sidebarWidth: number;
  previewWidth: number;
  recentFiles: RecentFileItem[];
  favorites: string[];
}

export interface FileInfo {
  path: string;
  name: string;
  isDir: boolean;
}

export type JsonMode = 'Format' | 'Minify';
