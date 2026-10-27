<script setup lang="ts">
import AuthLayout from "@/components/ui/AuthLayout.vue";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Wallet, Lock, Mail, ArrowRight } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const revealPassword = ref(false);
const error = ref("");

async function handleSubmit() {
  if (!email.value || !password.value) {
    error.value = "Preencha todos os campos";
    return;
  }
  error.value = "";
  try {
    await authStore.login(email.value, password.value);
    router.push(
      typeof route.query.redirect === "string" &&
        route.query.redirect.startsWith("/") &&
        !route.query.redirect.startsWith("//")
        ? route.query.redirect
        : "/dashboard",
    );
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Email ou senha incorretos";
  }
}
</script>

<template>
  <AuthLayout>
    <h1>Bom ter você por aqui.</h1>
    <p>
      Entre para acompanhar suas contas e o que vocês estão construindo juntos.
    </p>
    <div v-if="error" role="alert" class="form-error">
      {{
        typeof error === "string"
          ? error
          : "Confira seus dados e tente novamente."
      }}
    </div>
    <form @submit.prevent="handleSubmit">
      <div>
        <label for="login-email">E-mail</label
        ><input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="username"
          placeholder="voce@exemplo.com"
          required
        />
      </div>
      <div>
        <div class="flex items-center justify-between gap-4">
          <label for="login-password">Senha</label
          ><RouterLink to="/recover-password" class="auth-inline-link mb-2"
            >Esqueci a senha</RouterLink
          >
        </div>
        <div class="relative">
          <input
            id="login-password"
            v-model="password"
            :type="revealPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            style="padding-right: 84px"
          /><button
            type="button"
            :aria-pressed="revealPassword"
            class="password-toggle"
            @click="revealPassword = !revealPassword"
          >
            {{ revealPassword ? "Ocultar" : "Mostrar" }}
          </button>
        </div>
      </div>
      <button
        type="submit"
        class="ui-button primary"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? "Entrando…" : "Entrar na Prumo"
        }}<ArrowRight :size="20" />
      </button>
    </form>
    <p class="auth-help">
      Primeira vez aqui?
      <RouterLink
        :to="{
          path: '/register',
          query: route.query.redirect ? { redirect: route.query.redirect } : {},
        }"
        >Crie sua conta</RouterLink
      >.
    </p>
  </AuthLayout>
</template>
