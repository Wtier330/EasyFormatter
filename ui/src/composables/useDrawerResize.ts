import { ref } from 'vue';
import type { Ref } from 'vue';
import { useSidebarLayoutStore } from '../stores/sidebarLayout';

export function useDrawerResize() {
  const layoutStore = useSidebarLayoutStore();
  const isResizingDrawer = ref(false);
  let drawerResizeCleanup: (() => void) | null = null;

  function beginResizeDrawer(e: MouseEvent) {
    if (isResizingDrawer.value) return;
    isResizingDrawer.value = true;

    const startX = e.clientX;
    const startWidth = layoutStore.drawerWidth;

    const onMove = (ev: MouseEvent) => {
      const dx = startX - ev.clientX;
      const raw = startWidth + dx;
      const min = 320;
      const max = 420;
      const next = Math.max(min, Math.min(raw, max));
      layoutStore.drawerWidth = next;
    };

    const onUp = () => {
      isResizingDrawer.value = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      drawerResizeCleanup = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    drawerResizeCleanup = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }

  function cleanupDrawerResize() {
    if (drawerResizeCleanup) {
      drawerResizeCleanup();
      drawerResizeCleanup = null;
    }
  }

  return {
    isResizingDrawer,
    beginResizeDrawer,
    cleanupDrawerResize
  };
}