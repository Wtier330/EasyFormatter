import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';
import { Buffer } from 'buffer';

// Polyfill Buffer for iconv-lite
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
}

const app = createApp(App);

app.config.errorHandler = (err, _instance, info) => {
  console.error('[Global Error]:', err);
  console.error('[Info]:', info);
  // Prevent white screen of death by at least logging clearly
  if (import.meta.env.DEV) {
    alert(`App Error: ${String(err)}`);
  }
};

const pinia = createPinia();

app.use(pinia);
app.mount('#app');
