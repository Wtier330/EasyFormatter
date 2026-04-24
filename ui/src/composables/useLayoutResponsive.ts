import { useSidebarLayoutStore } from '../stores/sidebarLayout';

const WINDOW_BREAKPOINT = 1200;

export function useLayoutResponsive() {
  const layoutStore = useSidebarLayoutStore();

  function checkResponsive() {
    if (typeof window === 'undefined') return;
    if (window.innerWidth < WINDOW_BREAKPOINT) {
      if (!layoutStore.isCollapsed && layoutStore.sidebarWidth > 300) {
        // Maybe auto shrink?
      }
    }
  }

  function setupResponsive() {
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', checkResponsive);
  }

  function cleanupResponsive() {
    if (typeof window === 'undefined') return;
    window.removeEventListener('resize', checkResponsive);
  }

  return {
    checkResponsive,
    setupResponsive,
    cleanupResponsive
  };
}