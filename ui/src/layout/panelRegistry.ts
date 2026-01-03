import { type Component, markRaw } from 'vue';

export interface PanelDefinition {
  key: string;
  title: string;
  icon: Component; // Vue component
  panelComponent: Component; // Vue component for Sidebar
  order: number;
  defaultWidth?: number;
  allowResize?: boolean;
  allowCollapse?: boolean;
  rightDrawer?: {
    component: Component;
    openOnSelect?: boolean;
  };
}

// Registry State
const panels: PanelDefinition[] = [];

export const panelRegistry = {
  register(panel: PanelDefinition) {
    // Check duplicate
    if (panels.find(p => p.key === panel.key)) {
      console.warn(`Panel ${panel.key} already registered.`);
      return;
    }
    panels.push(panel);
    // Sort by order
    panels.sort((a, b) => a.order - b.order);
  },

  getAll() {
    return panels;
  },

  get(key: string) {
    return panels.find(p => p.key === key);
  }
};
