import { ref } from 'vue';
import { getName, getVersion, getTauriVersion } from '@tauri-apps/api/app';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { open } from '@tauri-apps/plugin-shell';
import { useMessage } from 'naive-ui';
import { aboutConfig } from '../config/about.config';

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
      // Get App Info via Tauri API
      const [name, ver, tVer] = await Promise.allSettled([
        getName(),
        getVersion(),
        getTauriVersion()
      ]);

      if (name.status === 'fulfilled') appInfo.value.name = name.value;
      if (ver.status === 'fulfilled') appInfo.value.version = ver.value;
      if (tVer.status === 'fulfilled') appInfo.value.tauriVersion = tVer.value;

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
      await writeText(text);
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
      await open(url);
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
