import { ref } from 'vue';
export const booting = ref(true);
export const startupError = ref('');
export function recoverApp(message = 'Não foi possível abrir esta tela. Seus dados continuam salvos.') {
  startupError.value = message;
  booting.value = false;
}
export function retryApp() { window.location.reload(); }
