<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Menu, Plus, Users, UserRound, ChevronRight } from "lucide-vue-next";
defineProps<{ title?: string; mobileOpen?: boolean }>();
const emit = defineEmits<{
  (e: "toggle-mobile"): void;
  (e: "new-transaction"): void;
}>();
const route = useRoute();
const auth = useAuthStore();
const section = computed(() =>
  ["/family", "/settings"].includes(route.path)
    ? "Seu espaço"
    : ["/budgets", "/goals", "/reports"].includes(route.path)
      ? "Planejamento"
      : "Dia a dia",
);
const financialPage = computed(() => ["/dashboard"].includes(route.path));
</script>
<template>
  <header class="app-header">
    <div class="flex items-center gap-3 min-w-0">
      <button
        class="icon-button lg:hidden"
        aria-label="Abrir navegação"
        aria-controls="app-navigation"
        :aria-expanded="mobileOpen"
        @click="emit('toggle-mobile')"
      >
        <Menu :size="24" />
      </button>
      <div class="app-breadcrumb">
        <span>{{ section }}</span
        ><ChevronRight :size="20" /><strong>{{ title }}</strong>
        <small class="mobile-family-name" :title="auth.activeFamily?.name">{{
          auth.activeFamily?.name
        }}</small>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <RouterLink to="/family" class="header-space"
        ><Users
          v-if="(auth.activeFamily?.members_count || 1) > 1"
          :size="20"
        /><UserRound v-else :size="20" /><span
          >{{ auth.activeFamily?.name
          }}<small>{{
            (auth.activeFamily?.members_count || 1) > 1
              ? "Espaço compartilhado"
              : "Espaço pessoal"
          }}</small></span
        ></RouterLink
      ><button
        v-if="financialPage"
        class="ui-button primary compact"
        @click="emit('new-transaction')"
      >
        <Plus :size="20" /><span class="hidden sm:inline">Novo lançamento</span
        ><span class="sm:hidden">Novo</span>
      </button>
    </div>
  </header>
</template>
