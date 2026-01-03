import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useSidebarLayoutStore = defineStore('sidebarLayout', () => {
  // Config
  const MIN_WIDTH = 200; // Expanded min width
  const COLLAPSED_WIDTH = 0;
  const SNAP_THRESHOLD = 100; // If dragged below MIN_WIDTH - SNAP, collapse

  // State
  const activePanelKey = ref<string>('files'); // Default to files
  const sidebarWidth = ref(250);
  const isCollapsed = ref(false);
  const lastExpandedWidth = ref(250);
  const isResizing = ref(false);
  
  // Right Drawer State
  const activeDrawerKey = ref<string | null>(null);
  const drawerVisible = ref(false);
  const drawerWidth = ref(300);

  // Actions
  function ensureVisible() {
    if (sidebarWidth.value < MIN_WIDTH) {
      sidebarWidth.value = lastExpandedWidth.value >= MIN_WIDTH ? lastExpandedWidth.value : MIN_WIDTH;
    }
  }

  function setActivePanel(key: string) {
    // If clicking same panel, maybe toggle collapse?
    // VSCode behavior: clicking active icon toggles sidebar visibility.
    if (activePanelKey.value === key) {
      // Robustness: If strictly not collapsed but width is 0 or very small, treat as "restore"
      if (!isCollapsed.value && sidebarWidth.value < MIN_WIDTH) {
        ensureVisible();
        return;
      }
      isCollapsed.value = !isCollapsed.value;
    } else {
      activePanelKey.value = key;
      isCollapsed.value = false; // Auto expand when switching
    }

    if (!isCollapsed.value) {
      ensureVisible();
    }
  }

  function toggleCollapsed() {
    // Robustness: If strictly not collapsed but width is 0 or very small, treat as "restore"
    if (!isCollapsed.value && sidebarWidth.value < MIN_WIDTH) {
      ensureVisible();
      return;
    }
    isCollapsed.value = !isCollapsed.value;
    if (!isCollapsed.value) {
      ensureVisible();
    }
  }

  function setCollapsed(collapsed: boolean) {
    isCollapsed.value = collapsed;
  }

  function setSidebarWidth(width: number) {
    sidebarWidth.value = width;
    if (width >= MIN_WIDTH) {
      lastExpandedWidth.value = width;
    }
  }

  function beginResize() {
    isResizing.value = true;
  }

  function endResize() {
    isResizing.value = false;
    
    if (isCollapsed.value) return;

    // Threshold logic:
    // If width < 40% of MIN_WIDTH (or similar logic), collapse.
    // If width > 40%, snap to at least MIN_WIDTH or keep current if larger.
    
    // User requirement: "Automatic expand/collapse threshold range... < 40% auto collapse"
    // Let's use MIN_WIDTH as the baseline for "full sidebar".
    
    const threshold = MIN_WIDTH * 0.4;
    
    if (sidebarWidth.value < threshold) {
      isCollapsed.value = true;
      sidebarWidth.value = COLLAPSED_WIDTH;
    } else {
      // If valid width but less than MIN_WIDTH, snap to MIN_WIDTH
      if (sidebarWidth.value < MIN_WIDTH) {
        sidebarWidth.value = MIN_WIDTH;
      }
      // Update lastExpandedWidth
      lastExpandedWidth.value = sidebarWidth.value;
    }
  }

  // Drawer Actions
  function openRightDrawer(key: string) {
    activeDrawerKey.value = key;
    drawerVisible.value = true;
  }

  function closeRightDrawer() {
    drawerVisible.value = false;
    // Optional: activeDrawerKey.value = null;
  }
  
  function toggleRightDrawer(key: string) {
      if (activeDrawerKey.value === key && drawerVisible.value) {
          closeRightDrawer();
      } else {
          openRightDrawer(key);
      }
  }

  return {
    // Constants
    MIN_WIDTH,
    COLLAPSED_WIDTH,
    SNAP_THRESHOLD,

    // State
    activePanelKey,
    sidebarWidth,
    isCollapsed,
    lastExpandedWidth,
    isResizing,
    
    activeDrawerKey,
    drawerVisible,
    drawerWidth,

    // Actions
    setActivePanel,
    toggleCollapsed,
    setCollapsed,
    setSidebarWidth,
    beginResize,
    endResize,
    
    openRightDrawer,
    closeRightDrawer,
    toggleRightDrawer
  };
});
