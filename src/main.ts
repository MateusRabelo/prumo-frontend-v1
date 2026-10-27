import { createApp } from "vue";
import { createPinia } from "pinia";
import router from "./router";
import App from "./App.vue";
import { useAuthStore } from "./stores/auth";
import { recoverApp, startupError } from "./runtime/recovery";
import "./style.css";

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

ChartJS.defaults.font.family = "Figtree, system-ui, sans-serif";
ChartJS.defaults.font.size = 14;
ChartJS.defaults.color = "#5B6B66";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount('#app');
document.querySelector('#initial-loading')?.remove();
window.addEventListener('prumo:session-expired', async () => {
  const auth = useAuthStore();
  if (!auth.token) return;
  const target = router.currentRoute.value.fullPath;
  await auth.logout(false);
  startupError.value = '';
  await router.replace({ name: 'login', query: { redirect: target, reason: 'expired' } });
});
router.isReady().catch(() => recoverApp());
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  // A deploy may remove an old lazy chunk. One reload per session is enough to recover.
  try {
    if (!sessionStorage.getItem('prumo:chunk-reloaded')) {
      sessionStorage.setItem('prumo:chunk-reloaded', '1');
      window.location.reload(); return;
    }
  } catch { /* Recovery screen still works without session storage. */ }
  recoverApp('Uma atualização está disponível. Reabra o Prumo para carregar a nova versão.');
});
