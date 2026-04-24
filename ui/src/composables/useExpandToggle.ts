import { ref, computed, watch } from 'vue';
import { useAppStore } from '../stores/app';

export function useExpandToggle() {
  const appStore = useAppStore();
  const isExpanded = ref(false);

  const expandTitle = computed(() => isExpanded.value ? '折叠' : '展开');

  function toggleExpand() {
    if (isExpanded.value) {
      appStore.requestCollapse();
      isExpanded.value = false;
    } else {
      appStore.requestExpand();
      isExpanded.value = true;
    }
  }

  watch(() => appStore.activeTabId, () => {
    isExpanded.value = false;
  });

  return {
    isExpanded,
    expandTitle,
    toggleExpand
  };
}