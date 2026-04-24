import { ref, computed, nextTick } from 'vue';
import { useAppStore } from '../stores/app';
import { useConfigStore } from '../stores/config';
import { commands } from '../tauri';

export function useTabsManager(scrollEl: Ref<HTMLElement | null>) {
  const appStore = useAppStore();
  const configStore = useConfigStore();

  const menuX = ref(0);
  const menuY = ref(0);
  const menuShow = ref(false);
  const activeTabForMenu = ref<any>(null);

  const menuOptions = computed(() => {
    if (!activeTabForMenu.value) return [];

    const tab = activeTabForMenu.value;
    return [
      {
        label: '关闭',
        key: 'close'
      },
      {
        label: '关闭其他',
        key: 'closeOthers'
      },
      {
        label: '关闭左侧所有',
        key: 'closeLeft'
      },
      {
        label: '关闭右侧所有',
        key: 'closeRight'
      },
      {
        type: 'divider' as const,
        key: 'd1'
      },
      {
        label: '复制路径',
        key: 'copyPath'
      }
    ];
  });

  function activate(id: string) {
    appStore.setActive(id);
  }

  async function closeTab(id: string) {
    const tab = appStore.openTabs.find(t => t.id === id);
    if (!tab) return;

    // If dirty, prompt to save
    if (tab.isDirty) {
      // TODO: Show save prompt
    }

    appStore.closeTab(id);
  }

  function onAuxClick(e: MouseEvent, tab: any) {
    if (e.button === 1) { // Middle click
      closeTab(tab.id);
    }
  }

  function openContextMenu(e: MouseEvent, tab: any) {
    e.preventDefault();
    activeTabForMenu.value = tab;
    menuX.value = e.clientX;
    menuY.value = e.clientY;
    menuShow.value = true;
  }

  function handleMenuSelect(key: string) {
    const tab = activeTabForMenu.value;
    if (!tab) return;

    switch (key) {
      case 'close':
        closeTab(tab.id);
        break;
      case 'closeOthers':
        appStore.closeOtherTabs(tab.id);
        break;
      case 'closeLeft':
        appStore.closeLeftTabs(tab.id);
        break;
      case 'closeRight':
        appStore.closeRightTabs(tab.id);
        break;
      case 'copyPath':
        navigator.clipboard.writeText(tab.path || '');
        break;
    }

    menuShow.value = false;
  }

  function scrollToActiveTab() {
    nextTick(() => {
      const el = scrollEl.value?.querySelector('.tab-item.active') as HTMLElement | null;
      el?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
    });
  }

  return {
    menuX,
    menuY,
    menuShow,
    menuOptions,
    activate,
    closeTab,
    onAuxClick,
    openContextMenu,
    handleMenuSelect,
    scrollToActiveTab
  };
}