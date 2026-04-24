import { ref, h } from 'vue';
import { NInput, useDialog, useNotification } from 'naive-ui';
import { readClipboardWithFallback } from '../utils/clipboard-handlers';

type ClipboardPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';
type ClipboardReadUse = 'new' | 'paste';

const CLIPBOARD_PERMISSION_SHOWN_KEY = 'easy-formatter-clipboard-permission-shown';

export function useClipboard() {
  const clipboardSupported = ref(true);
  const clipboardSecure = ref(true);
  const clipboardPermission = ref<ClipboardPermissionState>('unknown');
  const permissionStatusRef = ref<PermissionStatus | null>(null);

  const dialog = useDialog();
  const notification = useNotification();

  function getClipboardReadSupported() {
    return !!(navigator as any).clipboard?.readText;
  }

  function getSecureContext() {
    return typeof window !== 'undefined' ? (window as any).isSecureContext === true : false;
  }

  async function refreshClipboardPermission() {
    clipboardSupported.value = getClipboardReadSupported();
    clipboardSecure.value = getSecureContext();

    if (!clipboardSupported.value) {
      clipboardPermission.value = 'unknown';
      return;
    }

    const permissionsApi = (navigator as any).permissions;
    if (!permissionsApi?.query) {
      clipboardPermission.value = 'unknown';
      return;
    }

    try {
      const status: PermissionStatus = await permissionsApi.query({ name: 'clipboard-read' as any });
      permissionStatusRef.value = status;
      clipboardPermission.value = (status as any).state || 'unknown';
      status.onchange = () => {
        clipboardPermission.value = (status as any).state || 'unknown';
      };
    } catch {
      clipboardPermission.value = 'unknown';
    }
  }

  function isNotAllowedError(e: unknown) {
    const anyErr = e as any;
    return anyErr?.name === 'NotAllowedError' || String(e).includes('NotAllowedError');
  }

  function openManualPasteDialog(
    use: ClipboardReadUse,
    onCreateScratch: (text: string) => void,
    onPasteRequest: (text: string) => void
  ) {
    const manualText = ref('');
    dialog.create({
      title: '手动粘贴',
      content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 12px;' }, [
        h('div', { style: 'color: #666; font-size: 12px; line-height: 18px;' }, '当前无法自动读取剪贴板。你仍可在下方输入框中使用 Ctrl+V 手动粘贴。'),
        h(NInput, {
          type: 'textarea',
          value: manualText.value,
          placeholder: '在此处粘贴内容…',
          autosize: { minRows: 6, maxRows: 14 },
          onUpdateValue: (v: string) => manualText.value = v
        })
      ]),
      positiveText: use === 'new' ? '创建临时标签' : '粘贴到编辑器',
      negativeText: '取消',
      onPositiveClick: () => {
        const text = manualText.value;
        if (!text) {
          notification.warning({ title: '内容为空', duration: 1500 });
          return false;
        }
        if (use === 'new') {
          onCreateScratch(text);
        } else {
          onPasteRequest(text);
        }
        return true;
      }
    });
  }

  function openPermissionDeniedGuide(use: ClipboardReadUse, err?: unknown) {
    dialog.create({
      title: '剪贴板权限被拒绝',
      content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 10px; line-height: 18px;' }, [
        h('div', { style: 'color: #333; font-size: 13px;' }, '应用需要读取剪贴板来完成"新粘/粘贴"功能。当前权限被拒绝，无法自动读取。'),
        h('div', { style: 'color: #666; font-size: 12px;' }, '你可以：'),
        h('div', { style: 'color: #666; font-size: 12px;' }, '1) 在系统/浏览器的站点权限中允许"剪贴板读取"后重试'),
        h('div', { style: 'color: #666; font-size: 12px;' }, '2) 直接使用"手动粘贴"作为替代方案'),
        err ? h('div', { style: 'color: #999; font-size: 12px; margin-top: 6px; word-break: break-all;' }, String(err)) : null
      ].filter(Boolean)),
      positiveText: '手动粘贴',
      negativeText: '关闭',
      onPositiveClick: () => {
        openManualPasteDialog(use, () => {}, () => {});
        return true;
      }
    });
  }

  async function readClipboardTextInteractive(
    use: ClipboardReadUse,
    onCreateScratch: (text: string) => void,
    onPasteRequest: (text: string) => void
  ): Promise<string | null> {
    await refreshClipboardPermission();

    if (!clipboardSupported.value) {
      notification.warning({ title: '当前环境不支持剪贴板 API', duration: 2000 });
      openManualPasteDialog(use, onCreateScratch, onPasteRequest);
      return null;
    }

    if (!clipboardSecure.value) {
      notification.warning({ title: '当前环境不是安全上下文，无法读取剪贴板', duration: 2500 });
      openManualPasteDialog(use, onCreateScratch, onPasteRequest);
      return null;
    }

    if (clipboardPermission.value === 'denied') {
      openPermissionDeniedGuide(use);
      return null;
    }

    const shown = localStorage.getItem(CLIPBOARD_PERMISSION_SHOWN_KEY) === '1';
    if (!shown && (clipboardPermission.value === 'prompt' || clipboardPermission.value === 'unknown')) {
      dialog.create({
        title: '请求剪贴板权限',
        content: () => h('div', { style: 'display:flex; flex-direction:column; gap: 10px; line-height: 18px;' }, [
          h('div', { style: 'color: #333; font-size: 13px;' }, '需要读取剪贴板内容以创建"临时标签/粘贴到编辑器"。'),
          h('div', { style: 'color: #666; font-size: 12px;' }, '点击"允许并读取"将触发系统/浏览器的剪贴板权限流程。若仍失败，可选择"手动粘贴"。')
        ]),
        positiveText: '允许并读取',
        negativeText: '手动粘贴',
        onPositiveClick: async () => {
          localStorage.setItem(CLIPBOARD_PERMISSION_SHOWN_KEY, '1');
          try {
            const result = await readClipboardWithFallback();
            await refreshClipboardPermission();
            return result ? result.text : '';
          } catch (e) {
            await refreshClipboardPermission();
            if (isNotAllowedError(e)) {
              openPermissionDeniedGuide(use, e);
              return null;
            }
            notification.error({ title: '无法读取剪贴板', content: String(e), duration: 3000 });
            openManualPasteDialog(use, onCreateScratch, onPasteRequest);
            return null;
          }
        },
        onNegativeClick: () => {
          localStorage.setItem(CLIPBOARD_PERMISSION_SHOWN_KEY, '1');
          openManualPasteDialog(use, onCreateScratch, onPasteRequest);
          return true;
        }
      });
      return null;
    }

    try {
      const result = await readClipboardWithFallback();
      await refreshClipboardPermission();
      return result ? result.text : '';
    } catch (e) {
      await refreshClipboardPermission();
      if (isNotAllowedError(e)) {
        openPermissionDeniedGuide(use, e);
        return null;
      }
      notification.error({ title: '无法读取剪贴板', content: String(e), duration: 3000 });
      openManualPasteDialog(use, onCreateScratch, onPasteRequest);
      return null;
    }
  }

  return {
    clipboardSupported,
    clipboardSecure,
    clipboardPermission,
    refreshClipboardPermission,
    openManualPasteDialog,
    openPermissionDeniedGuide,
    readClipboardTextInteractive
  };
}
