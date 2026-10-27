<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref } from 'vue';
import { Download, Share, PlusSquare, X, WifiOff, RefreshCw } from 'lucide-vue-next';
import { registerSW } from 'virtual:pwa-register';
import { INSTALL_SHOWN_KEY, INSTALLED_KEY, isAppleMobile, shouldOfferInstall } from '@/pwa/installPolicy';

interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
const dialog = ref<HTMLDialogElement | null>(null);
const ios = isAppleMobile(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
const android = /Android/i.test(navigator.userAgent);
const offline = ref(!navigator.onLine);
const updateReady = ref(false);
const installing = ref(false);
const nativeInstall = ref(false);
const installError = ref('');
const readyToOffer = ref(false);
let deferred: InstallEvent | null = null;
let offerTimer: ReturnType<typeof setTimeout>;
let updateTimer: ReturnType<typeof setInterval> | undefined;
let previousFocus: HTMLElement | null = null;
const displayMode = window.matchMedia('(display-mode: standalone)');
const standalone = () => displayMode.matches || window.matchMedia('(display-mode: fullscreen)').matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

function closeInstall() {
  dialog.value?.close();
  previousFocus?.focus();
}
function rememberInstalled() {
  try { localStorage.setItem(INSTALLED_KEY, '1'); } catch { /* Storage may be unavailable. */ }
  deferred = null;
  nativeInstall.value = false;
  closeInstall();
}
function offerInstall() {
  if (!readyToOffer.value || (!ios && !android) || standalone() || !navigator.onLine ||
      document.visibilityState !== 'visible' || document.querySelector('dialog[open]') ||
      !shouldOfferInstall(localStorage, Date.now()) || !dialog.value) return;
  // Persist when shown, not just when dismissed, including reloads and other tabs.
  try { localStorage.setItem(INSTALL_SHOWN_KEY, String(Date.now())); } catch { return; }
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value.showModal();
}
function beforeInstall(event: Event) {
  event.preventDefault();
  if (standalone()) return;
  deferred = event as InstallEvent;
  nativeInstall.value = true;
  offerInstall();
}
async function install() {
  if (!deferred || installing.value) return;
  installing.value = true;
  installError.value = '';
  const event = deferred;
  deferred = null;
  nativeInstall.value = false;
  closeInstall();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    // The browser confirms completion through appinstalled; accepting alone may fail.
    if (choice.outcome === 'accepted') closeInstall();
  } catch {
    installError.value = 'Não foi possível abrir a instalação. Use o menu do navegador e escolha “Instalar app” ou “Adicionar à tela inicial”.';
    await nextTick();
    dialog.value?.showModal();
  } finally { installing.value = false; }
}
function connectivity() {
  offline.value = !navigator.onLine;
  if (!offline.value) offerInstall();
}
function visibility() { if (standalone()) rememberInstalled(); else offerInstall(); }
function storageChanged(event: StorageEvent) {
  if (event.key === INSTALLED_KEY || event.key === INSTALL_SHOWN_KEY) closeInstall();
}
let updateSW: (reloadPage?: boolean) => Promise<void>;
onMounted(() => {
  if (standalone()) rememberInstalled();
  window.addEventListener('beforeinstallprompt', beforeInstall);
  window.addEventListener('appinstalled', rememberInstalled);
  window.addEventListener('online', connectivity);
  window.addEventListener('offline', connectivity);
  window.addEventListener('storage', storageChanged);
  document.addEventListener('visibilitychange', visibility);
  displayMode.addEventListener('change', visibility);
  offerTimer = setTimeout(() => { readyToOffer.value = true; offerInstall(); }, 6000);
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() { updateReady.value = true; },
    onRegisteredSW(_url, registration) {
      // Check while open; apply only after the user explicitly requests it.
      updateTimer = setInterval(() => {
        if (navigator.onLine && document.visibilityState === 'visible') registration?.update().catch(() => {});
      }, 60 * 60 * 1000);
    },
    onRegisterError() { /* The online app remains usable if SW registration is unavailable. */ },
  });
});
onBeforeUnmount(() => {
  clearTimeout(offerTimer);
  clearInterval(updateTimer);
  window.removeEventListener('beforeinstallprompt', beforeInstall);
  window.removeEventListener('appinstalled', rememberInstalled);
  window.removeEventListener('online', connectivity);
  window.removeEventListener('offline', connectivity);
  window.removeEventListener('storage', storageChanged);
  document.removeEventListener('visibilitychange', visibility);
  displayMode.removeEventListener('change', visibility);
});
</script>

<template>
  <div v-if="offline" class="pwa-connection" role="status">
    <WifiOff :size="18" aria-hidden="true" />
    <span>Você está sem conexão. Para consultar ou salvar suas finanças, reconecte-se à internet.</span>
  </div>
  <aside v-if="updateReady && !offline" class="pwa-update" aria-label="Atualização disponível">
    <RefreshCw :size="20" aria-hidden="true" />
    <div><strong>Tem novidade no Prumo</strong><p>Salve o que estiver editando antes de atualizar.</p></div>
    <button type="button" @click="updateSW(true)">Atualizar</button>
    <button type="button" class="pwa-icon-button" aria-label="Atualizar mais tarde" @click="updateReady = false"><X :size="20" /></button>
  </aside>
  <dialog ref="dialog" class="pwa-install" aria-labelledby="pwa-title" aria-describedby="pwa-description"
    @cancel.prevent="closeInstall" @click="($event.target === $event.currentTarget) && closeInstall()">
    <div class="pwa-install-inner">
      <button type="button" class="pwa-close pwa-icon-button" aria-label="Fechar convite de instalação" @click="closeInstall"><X :size="22" /></button>
      <img src="/pwa-192.png" alt="" width="64" height="64" class="pwa-brand" />
      <p class="pwa-eyebrow">PRUMO NO SEU CELULAR</p>
      <h2 id="pwa-title">Suas contas, a um toque.</h2>
      <p id="pwa-description">Adicione o Prumo à tela inicial para abrir suas finanças como um aplicativo.</p>
      <ol v-if="ios" class="pwa-steps">
        <li><Share :size="22" aria-hidden="true" /><span>Abra o menu <strong>Compartilhar</strong> do navegador. No Safari, ele também pode estar dentro do menu de opções.</span></li>
        <li><PlusSquare :size="22" aria-hidden="true" /><span>Escolha <strong>Adicionar à Tela de Início</strong>.</span></li>
        <li><Download :size="22" aria-hidden="true" /><span>Se aparecer, mantenha <strong>Abrir como App</strong> ativado e toque em <strong>Adicionar</strong>.</span></li>
      </ol>
      <p v-else-if="!nativeInstall" class="pwa-manual">No menu do navegador (⋮), escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>. Se a opção não aparecer, abra este site no Chrome.</p>
      <p v-if="ios" class="pwa-note">Não encontrou a opção? Abra este site no Safari e siga os passos acima.</p>
      <p v-if="installError" role="alert" class="pwa-manual">{{ installError }}</p>
      <button v-if="nativeInstall && !ios" type="button" class="pwa-primary" :disabled="installing" @click="install"><Download :size="20" aria-hidden="true" />Instalar Prumo</button>
      <button v-else type="button" class="pwa-primary" @click="closeInstall">Entendi</button>
      <button type="button" class="pwa-later" @click="closeInstall">Agora não</button>
      <p class="pwa-footnote">Este convite só volta a aparecer daqui a 7 dias.</p>
    </div>
  </dialog>
</template>

<style scoped>
.pwa-install { width: min(440px, calc(100% - 32px)); max-height: calc(100dvh - 32px); margin: auto; padding: 0; color: var(--ink); background: white; border: 1px solid var(--line); border-radius: 24px; overflow: auto; box-shadow: 0 24px 80px #0b242033; }
.pwa-install::backdrop { background: #0b242070; }
.pwa-install-inner { padding: 32px 24px 24px; position: relative; }
.pwa-icon-button { width: 44px; height: 44px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border: 0; border-radius: 12px; background: transparent; color: var(--muted); }
.pwa-icon-button:hover { background: var(--canvas); }
.pwa-close { position: absolute; top: 12px; right: 12px; }
.pwa-brand { border-radius: 16px; margin-bottom: 24px; }
.pwa-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: var(--accent); margin-bottom: 8px; }
.pwa-install h2 { font-size: 28px; line-height: 1.15; margin: 0 0 12px; }
#pwa-description { font-size: 16px; line-height: 1.6; color: var(--muted); }
.pwa-steps { list-style: none; padding: 0; display: grid; gap: 18px; margin: 24px 0; }
.pwa-steps li { display: flex; align-items: flex-start; gap: 14px; font-size: 15px; line-height: 1.5; }
.pwa-steps svg { flex-shrink: 0; color: var(--accent); margin-top: 2px; }
.pwa-manual { background: var(--canvas); border-radius: 12px; padding: 16px; margin: 20px 0; line-height: 1.6; }
.pwa-note, .pwa-footnote { color: var(--muted); font-size: 13px; line-height: 1.5; }
.pwa-note { margin-bottom: 20px; }
.pwa-primary { display: flex; gap: 10px; align-items: center; justify-content: center; width: 100%; min-height: 48px; border-radius: 12px; background: var(--accent); color: white; font-weight: 600; margin-top: 24px; }
.pwa-primary:hover { background: var(--ink); }
.pwa-later { display: block; min-height: 44px; width: 100%; margin: 8px 0; font-weight: 600; color: var(--muted); }
.pwa-footnote { text-align: center; }
.pwa-connection { position: fixed; top: 0; left: 0; right: 0; z-index: 60; display: flex; justify-content: center; align-items: center; gap: 10px; padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left)); background: #fff1d9; color: #69440e; font-size: 14px; }
.pwa-connection svg { flex-shrink: 0; }
.pwa-update { position: fixed; bottom: max(24px, env(safe-area-inset-bottom)); right: max(16px, env(safe-area-inset-right)); z-index: 70; display: flex; align-items: center; gap: 12px; max-width: calc(100% - 32px); padding: 16px; background: white; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 8px 32px #0b242026; }
.pwa-update p { font-size: 13px; color: var(--muted); }
.pwa-update > button:not(.pwa-icon-button) { min-height: 44px; padding: 8px; color: var(--accent); font-weight: 700; }
button:focus-visible { outline: 3px solid var(--prumo-latao); outline-offset: 3px; }
@media (max-width: 480px) { .pwa-install { margin: auto auto max(16px, env(safe-area-inset-bottom)); } .pwa-update { flex-wrap: wrap; } }
</style>
