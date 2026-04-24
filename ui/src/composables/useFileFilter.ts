import { ref, computed } from 'vue';
import { formatFileSize, formatTimeAgo } from '../utils/format';

export interface FileInfo {
  path: string;
  name: string;
  size?: number;
  lastModified?: number;
}

export function useFileFilter(files: Ref<FileInfo[]>) {
  const searchQuery = ref('');
  const collapsed = ref(false);

  const filteredFiles = computed(() => {
    if (!searchQuery.value) return files.value;

    const query = searchQuery.value.toLowerCase();
    return files.value.filter(file => {
      const nameMatch = file.name.toLowerCase().includes(query);
      const pathMatch = file.path.toLowerCase().includes(query);
      return nameMatch || pathMatch;
    });
  });

  return {
    searchQuery,
    collapsed,
    filteredFiles,
    formatFileSize,
    formatTimeAgo
  };
}