<script setup lang="ts">
import AuthLayout from "@/components/ui/AuthLayout.vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { api } from "@/services/api";

const route = useRoute();
const token = computed(() =>
  typeof route.query.token === "string" ? route.query.token : "",
);
const email = ref("");
const password = ref("");
const loading = ref(false);
const message = ref("");
const error = ref("");
const completed = ref(false);

async function submit() {
  if (loading.value) return;
  error.value = "";
  loading.value = true;
  try {
    const response = token.value
      ? await api.post("/auth/reset-password", {
          token: token.value,
          new_password: password.value,
        })
      : await api.post("/auth/recover-password", { email: email.value });
    message.value = response.data.message;
    completed.value = true;
    if (token.value) window.history.replaceState(null, "", "/reset-password");
  } catch (err: any) {
    const detail = err.response?.data?.detail;
    error.value =
      typeof detail === "string"
        ? detail
        : "Não foi possível concluir. Confira os dados e tente novamente.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <h1>
      {{
        token
          ? "Uma nova senha, um novo acesso."
          : "Vamos recuperar seu acesso."
      }}
    </h1>
    <p>
      {{
        token
          ? "Escolha uma senha com pelo menos 10 caracteres."
          : "Informe o e-mail da sua conta. Você receberá um link para criar outra senha."
      }}
    </p>
    <div v-if="message" role="status" class="context-message mt-6">
      {{ message }}
    </div>
    <div v-if="error" role="alert" class="form-error">{{ error }}</div>
    <form v-if="!completed" @submit.prevent="submit">
      <div v-if="token">
        <label for="new-password">Nova senha</label
        ><input
          id="new-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="10"
          maxlength="128"
          required
        />
      </div>
      <div v-else>
        <label for="recovery-email">E-mail da conta</label
        ><input
          id="recovery-email"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="voce@exemplo.com"
          required
        />
      </div>
      <button type="submit" class="ui-button primary" :disabled="loading">
        {{
          loading
            ? "Aguarde…"
            : token
              ? "Salvar nova senha"
              : "Enviar link de recuperação"
        }}
      </button>
    </form>
    <p class="auth-help">
      <RouterLink to="/login">Voltar para entrar</RouterLink>
    </p>
  </AuthLayout>
</template>
