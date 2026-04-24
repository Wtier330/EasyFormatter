import { computed, watch } from 'vue';
import type { Ref } from 'vue';
import { useAppStore } from '../stores/app';

export function usePreviewResize(contentWrapper: Ref<HTMLElement | null>) {
  const appStore = useAppStore();

  const MIN_PANEL = 200;
  const minByRatio = 0.2;
  const maxByRatio = 0.8;

  function onResizePreview(delta: number) {
    const el = contentWrapper.value;
    if (!el) return;

    const W = el.clientWidth;
    if (W <= 0) return;

    const cur = W * appStore.previewRatio;
    let next = cur - delta;

    const minPreview = Math.max(MIN_PANEL, W * minByRatio);
    const maxPreview = Math.min(W - MIN_PANEL, W * maxByRatio);

    if (maxPreview <= minPreview) {
      next = Math.max(MIN_PANEL, Math.min(cur, W - MIN_PANEL));
    } else {
      next = Math.max(minPreview, Math.min(next, maxPreview));
    }

    appStore.previewRatio = next / W;
  }

  return {
    onResizePreview
  };
}