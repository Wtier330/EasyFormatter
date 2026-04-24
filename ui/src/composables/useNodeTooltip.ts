import { ref } from 'vue';

export function useNodeTooltip() {
  const showTooltip = ref(false);
  const tooltipStyle = ref({ top: '0px', left: '0px' });
  let hoverTimer: any = null;
  let leaveTimer: any = null;

  function handleMouseEnter(
    e: MouseEvent,
    editing: boolean,
    updateTooltipPositionFn: (e: MouseEvent) => void
  ) {
    if (editing) return;
    clearTimeout(leaveTimer);
    hoverTimer = setTimeout(() => {
      updateTooltipPositionFn(e);
      showTooltip.value = true;
    }, 1000);
  }

  function handleMouseMove(
    e: MouseEvent,
    updateTooltipPositionFn: (e: MouseEvent) => void
  ) {
    if (!showTooltip.value && !hoverTimer) return;
    updateTooltipPositionFn(e);
  }

  function handleMouseLeave() {
    clearTimeout(hoverTimer);
    hoverTimer = null;
    leaveTimer = setTimeout(() => {
      showTooltip.value = false;
    }, 300);
  }

  function updateTooltipPosition(e: MouseEvent) {
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    const winWidth = window.innerWidth;
    const finalX = x + 300 > winWidth ? winWidth - 320 : x;
    tooltipStyle.value = {
      top: `${y}px`,
      left: `${finalX}px`
    };
  }

  function cleanup() {
    clearTimeout(hoverTimer);
    clearTimeout(leaveTimer);
  }

  return {
    showTooltip,
    tooltipStyle,
    handleMouseEnter,
    handleMouseMove,
    handleMouseLeave,
    updateTooltipPosition,
    cleanup
  };
}
