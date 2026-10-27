<script setup lang="ts">
import { onErrorCaptured } from "vue";
import { booting, startupError, recoverApp, retryApp } from "./runtime/recovery";
import { RouterView } from "vue-router";
import PwaExperience from "./components/PwaExperience.vue";
onErrorCaptured(() => { recoverApp(); return false; });
</script>

<template>
  <main v-if="booting || startupError" class="startup-screen" :aria-busy="booting">
    <img src="/prumo-icon.svg" width="64" height="64" alt="Prumo" />
    <h1>{{ startupError ? 'Vamos tentar novamente?' : 'Abrindo seu Prumo' }}</h1>
    <p role="status">{{ startupError || 'Conectando ao seu espaço com segurança. O primeiro acesso pode levar alguns segundos.' }}</p>
    <button v-if="startupError" class="ui-button primary" @click="retryApp">Tentar novamente</button>
    <a v-if="startupError" href="/login">Voltar para a entrada</a>
  </main>
  <RouterView v-else />
  <PwaExperience />
</template>

<style scoped>
.startup-screen { min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; padding: 32px; text-align: center; background: var(--canvas); }.startup-screen h1 { font-size: 28px; }.startup-screen p { max-width: 48ch; color: var(--muted); line-height: 1.6; }.startup-screen a { color: var(--accent); text-decoration: underline; }
</style>
