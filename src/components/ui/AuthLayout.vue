<script setup lang="ts">
import BrandLogo from "./BrandLogo.vue";
</script>
<template>
  <main class="auth-layout">
    <section class="auth-story" aria-label="Prumo, finanças da casa">
      <BrandLogo light />
      <div class="auth-story-copy">
        <p>Mais clareza. Mais parceria.</p>
        <h2>Finanças da casa,<br />no prumo.</h2>
        <p>Um lugar para entender as contas, planejar o mês e decidir junto.</p>
      </div>
      <div class="auth-principles">
        <span>Contas claras.</span><span>Planos possíveis.</span
        ><span>Todo mundo junto.</span>
      </div>
    </section>
    <section class="auth-form-side">
      <div class="auth-mobile-brand"><BrandLogo /></div>
      <div class="auth-form-container"><slot /></div>
      <p class="auth-footer">Prumo · Finanças pessoais e em família</p>
    </section>
  </main>
</template>
