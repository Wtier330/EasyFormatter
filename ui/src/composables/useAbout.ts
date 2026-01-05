import { ref } from 'vue';
import { useMessage } from 'naive-ui';
import { aboutConfig } from '../config/about.config';
import { isTauriRuntime } from '../tauri';

export interface AppInfo {
  name: string;
  version: string;
  tauriVersion: string;
  os: string;
  arch: string;
  webview: string;
  buildTime: string;
}

export function useAbout() {
  const message = useMessage();
  const appInfo = ref<AppInfo>({
    name: aboutConfig.appName,
    version: aboutConfig.version,
    tauriVersion: 'unknown',
    os: 'unknown',
    arch: 'unknown',
    webview: 'unknown',
    buildTime: new Date().toISOString()
  });

  const initInfo = async () => {
    try {
      if (isTauriRuntime()) {
        const { getName, getVersion, getTauriVersion } = await import('@tauri-apps/api/app');

        const [name, ver, tVer] = await Promise.allSettled([
          getName(),
          getVersion(),
          getTauriVersion()
        ]);

        if (name.status === 'fulfilled') appInfo.value.name = name.value;
        if (ver.status === 'fulfilled') appInfo.value.version = ver.value;
        if (tVer.status === 'fulfilled') appInfo.value.tauriVersion = tVer.value;
      }

      // Get OS Info via Navigator (Basic fallback)
      if (typeof navigator !== 'undefined') {
        appInfo.value.os = navigator.platform || 'unknown';
        appInfo.value.webview = navigator.userAgent;
        // Arch is hard to get accurately from navigator in all cases, but we can try
        if (navigator.userAgent.includes('Win64') || navigator.userAgent.includes('x64')) {
          appInfo.value.arch = 'x64';
        } else if (navigator.userAgent.includes('arm64')) {
          appInfo.value.arch = 'arm64';
        } else {
            appInfo.value.arch = 'unknown';
        }
      }
    } catch (e) {
      console.error('Failed to init app info', e);
    }
  };

  const copyVersionInfo = async () => {
    const info = appInfo.value;
    const text = [
      `App: ${info.name}`,
      `Version: ${info.version}`,
      `OS: ${info.os}`,
      `Arch: ${info.arch}`,
      `Tauri: ${info.tauriVersion}`,
      `WebView: ${info.webview}`,
      `Time: ${info.buildTime}`
    ].join('\n');

    try {
      if (isTauriRuntime()) {
        const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
        await writeText(text);
        message.success('版本信息已复制到剪贴板');
        return;
      }

      await navigator.clipboard.writeText(text);
      message.success('版本信息已复制到剪贴板');
    } catch (e) {
      console.error('Clipboard write failed', e);
      message.warning('复制失败，请手动复制');
      // Fallback: try navigator.clipboard if Tauri plugin fails (though user said avoid NotAllowedError)
      // but if plugin fails, we have few options. We just show warning as requested.
    }
  };

  const openLink = async (url: string) => {
    if (!url) return;
    try {
      if (isTauriRuntime()) {
        const { open } = await import('@tauri-apps/plugin-shell');
        await open(url);
        return;
      }

      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error('Failed to open link', e);
      message.error('无法打开链接');
    }
  };

  return {
    appInfo,
    initInfo,
    copyVersionInfo,
    openLink
  };
}
