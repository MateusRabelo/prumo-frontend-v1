<script setup lang="ts">
import BrandLogo from "@/components/ui/BrandLogo.vue";
import SpaceSwitcher from "./SpaceSwitcher.vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  X,
  Receipt,
  FileUp,
} from "lucide-vue-next";
const props = defineProps<{ mobileOpen?: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const groups = [
  {
    name: "Dia a dia",
    items: [
      { name: "Lançamentos", path: "/transactions", icon: ArrowLeftRight },
      { name: "Contas e cartões", path: "/accounts-cards", icon: Wallet },
      { name: "Faturas", path: "/invoices", icon: Receipt },
      { name: "Importar extrato", path: "/import", icon: FileUp },
      { name: "Parcelamentos", path: "/installments", icon: CreditCard },
    ],
  },
  {
    name: "Planejamento",
    items: [
      { name: "Orçamentos", path: "/budgets", icon: PieChart },
      { name: "Metas", path: "/goals", icon: Target },
      { name: "Relatórios", path: "/reports", icon: FileText },
    ],
  },
  {
    name: "Seu espaço",
    items: [
      { name: "Família e acesso", path: "/family", icon: Users },
      { name: "Preferências", path: "/settings", icon: Settings },
    ],
  },
];
const role = computed(
  () =>
    ({ OWNER: "Proprietário", ADMIN: "Administrador", MEMBER: "Membro" })[
      auth.activeFamily?.role || "MEMBER"
    ],
);
function switchSpace(event: Event) {
  auth.switchFamily((event.target as HTMLSelectElement).value);
  router.replace({ path: route.path, query: {} });
  emit("close");
}
async function logout() {
  await auth.logout();
  router.push("/login");
}
</script>
<template>
  <aside
    id="app-navigation"
    class="app-sidebar"
    :class="{ 'is-open': props.mobileOpen }"
    aria-label="Navegação principal"
  >
    <RouterLink
      to="/dashboard"
      class="app-brand"
      aria-label="Prumo, visão geral"
      @click="emit('close')"
      ><BrandLogo light /><span>Finanças da casa, no prumo.</span></RouterLink
    >
    <button
      class="sidebar-close lg:hidden"
      aria-label="Fechar navegação"
      @click="emit('close')"
    >
      <X :size="24" />
    </button>
    <SpaceSwitcher @changed="emit('close')" />
    <RouterLink to="/dashboard" class="sidebar-link dashboard-link" :class="{ active: route.path === '/dashboard' }" :aria-current="route.path === '/dashboard' ? 'page' : undefined" @click="emit('close')"><LayoutDashboard :size="24" /><span>Dashboard</span></RouterLink>
    <nav class="sidebar-links">
      <section v-for="group in groups" :key="group.name">
        <h2>{{ group.name }}</h2>
        <RouterLink
          v-for="item in group.items"
          :key="item.path"
          :to="item.path"
          :aria-current="route.path === item.path ? 'page' : undefined"
          class="sidebar-link"
          :class="{ active: route.path === item.path }"
          @click="emit('close')"
          ><component :is="item.icon" :size="24" :stroke-width="2" /><span>{{
            item.name
          }}</span></RouterLink
        >
      </section>
    </nav>
    <div class="sidebar-profile">
      <span class="profile-initial">{{ auth.user?.full_name?.charAt(0) }}</span>
      <div>
        <strong>{{ auth.user?.full_name }}</strong
        ><small>{{ role }}</small>
      </div>
      <button
        aria-label="Sair de todas as sessões"
        title="Sair"
        @click="logout"
      >
        <LogOut :size="18" />
      </button>
    </div>
  </aside>
</template>

<style scoped>.dashboard-link { margin: 0 15px 12px; flex-shrink: 0; }</style>
