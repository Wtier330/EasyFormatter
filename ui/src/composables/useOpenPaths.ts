import { useFileDrop } from './useFileDrop';

export function useOpenPaths() {
  const { openPaths } = useFileDrop();

  async function setupOpenPaths() {
    const { events, commands } = await import('../tauri');

    try {
      const pending = await commands.takePendingOpenPaths();
      await openPaths(pending);
    } catch {}

    try {
      await events.onOpenPaths(async (paths) => {
        await openPaths(paths);
      });
    } catch {}
  }

  return {
    setupOpenPaths
  };
}