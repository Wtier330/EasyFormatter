<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider :container-style="{ top: '48px', padding: '12px' }">
      <n-notification-provider>
        <n-dialog-provider>
          <AppShell />
        </n-dialog-provider>
      </n-notification-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { darkTheme, zhCN, dateZhCN, NConfigProvider, NMessageProvider, NDialogProvider, NNotificationProvider } from 'naive-ui';
import AppShell from './components/layout/AppShell.vue';
import { useAppStore } from './stores/app';
import { useConfigStore } from './stores/config';
// import { events, commands } from './tauri';

const appStore = useAppStore();
const configStore = useConfigStore();

const theme = computed(() => appStore.theme === 'dark' ? darkTheme : null);

onMounted(() => {
  configStore.startMonitoring();
  
  // events.onCloseRequested(async () => {
  //   if (configStore.isDirty) {
  //     // In a real scenario, this would need Rust side interception to be effective blocking.
  //     // Here we provide the notification.
  //     // await commands.showError('有未保存的更改！请保存或丢弃。');
  //   }
  // });
});
</script>

<style>
/* Global styles */
body {
  margin: 0;
  font-family: v-sans, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
