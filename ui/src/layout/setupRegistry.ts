import { markRaw } from 'vue';
import { panelRegistry } from './panelRegistry';
import { DocumentTextOutline, TimeOutline } from '@vicons/ionicons5';

// Import Panels
import FileListPanel from '../panels/files/FileListPanel.vue';
import HistoryFileListPanel from '../panels/history/HistoryFileListPanel.vue';
import HistoryTimelineDrawer from '../panels/history/HistoryTimelineDrawer.vue';

export function setupPanelRegistry() {
  panelRegistry.register({
    key: 'files',
    title: '文件 (Files)',
    icon: markRaw(DocumentTextOutline),
    panelComponent: markRaw(FileListPanel),
    order: 1,
    allowCollapse: true,
    defaultWidth: 250
  });

  panelRegistry.register({
    key: 'history',
    title: '历史 (History)',
    icon: markRaw(TimeOutline),
    panelComponent: markRaw(HistoryFileListPanel),
    order: 2,
    allowCollapse: true,
    defaultWidth: 250,
    rightDrawer: {
      component: markRaw(HistoryTimelineDrawer)
    }
  });
}
