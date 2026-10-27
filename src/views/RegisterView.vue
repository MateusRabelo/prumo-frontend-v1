<script setup lang="ts">
import AuthLayout from "@/components/ui/AuthLayout.vue";
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Wallet, Lock, Mail, User, ArrowRight } from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const fullName = ref("");
const email = ref("");
const password = ref("");
const revealPassword = ref(false);
const error = ref("");

async function handleSubmit() {
  if (!fullName.value || !email.value || !password.value) {
    error.value = "Preencha todos os campos";
    return;
  }
  if (password.value.length < 10) {
    error.value = "A senha deve ter pelo menos 10 caracteres";
    return;
  }
  error.value = "";
  try {
    await authStore.register(fullName.value, email.value, password.value);
    router.push(
      typeof route.query.redirect === "string" &&
        route.query.redirect.startsWith("/") &&
        !route.query.redirect.startsWith("//")
        ? route.query.redirect
        : "/dashboard",
    );
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao realizar cadastro";
  }
}
</script>

<template>
  <AuthLayout>
    <h1>Comece pelo seu espaço.</h1>
    <p>
      Organize suas finanças e convide quem divide as contas com você, quando
      quiser.
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
        <label for="register-name">Seu nome</label
        ><input
          id="register-name"
          v-model="fullName"
          type="text"
          autocomplete="name"
          placeholder="Como você se chama?"
          minlength="2"
          maxlength="100"
          required
        />
      </div>
      <div>
        <label for="register-email">E-mail</label
        ><input
          id="register-email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </div>
      <div>
        <label for="register-password">Crie uma senha</label>
        <div class="relative">
          <input
            id="register-password"
            v-model="password"
            :type="revealPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="10"
            maxlength="128"
            required
            style="padding-right: 84px"
            aria-describedby="password-help"
          /><button
            type="button"
            :aria-pressed="revealPassword"
            class="password-toggle"
            @click="revealPassword = !revealPassword"
          >
            {{ revealPassword ? "Ocultar" : "Mostrar" }}
          </button>
        </div>
        <p id="password-help" class="field-help">
          Use pelo menos 10 caracteres.
        </p>
      </div>
      <button
        type="submit"
        class="ui-button primary"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? "Criando sua conta…" : "Criar conta"
        }}<ArrowRight :size="20" />
      </button>
    </form>
    <p class="auth-help">
      Já tem uma conta?
      <RouterLink
        :to="{
          path: '/login',
          query: route.query.redirect ? { redirect: route.query.redirect } : {},
        }"
        >Entre por aqui</RouterLink
      >.
    </p>
  </AuthLayout>
</template>
