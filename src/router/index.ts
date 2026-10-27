import { createRouter, createWebHistory } from "vue-router";
import { booting, recoverApp } from "@/runtime/recovery";
import { useAuthStore } from "@/stores/auth";

import AppLayout from "@/components/layout/AppLayout.vue";
const PasswordRecoveryView = () => import("@/views/PasswordRecoveryView.vue");
const LoginView = () => import("@/views/LoginView.vue");
const RegisterView = () => import("@/views/RegisterView.vue");
const DashboardView = () => import("@/views/DashboardView.vue");
const TransactionsView = () => import("@/views/TransactionsView.vue");
const AccountsCardsView = () => import("@/views/AccountsCardsView.vue");
const InstallmentsView = () => import("@/views/InstallmentsView.vue");
const BudgetsView = () => import("@/views/BudgetsView.vue");
const GoalsView = () => import("@/views/GoalsView.vue");
const ReportsView = () => import("@/views/ReportsView.vue");
const SettingsView = () => import("@/views/SettingsView.vue");
const FamilyView = () => import("@/views/FamilyView.vue");
const InvoicesView = () => import("@/views/InvoicesView.vue");
const ImportView = () => import("@/views/ImportView.vue");

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/recover-password",
      component: PasswordRecoveryView,
      meta: { public: true },
    },
    {
      path: "/reset-password",
      component: PasswordRecoveryView,
      meta: { public: true },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
      meta: { public: true },
    },
    {
      path: "/register",
      name: "register",
      component: RegisterView,
      meta: { public: true },
    },
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: 'subscriptions', name: 'subscriptions', component: () => import('@/views/SubscriptionsView.vue'), meta: { title: 'Assinaturas' } },
        { path: 'import', name: 'import', component: ImportView, meta: { title: 'Importar extrato' } },
        { path: 'invoices', name: 'invoices', component: InvoicesView, meta: { title: 'Faturas' } },
        {
          path: "",
          redirect: "/dashboard",
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: DashboardView,
          meta: { title: "Dashboard" },
        },
        {
          path: "transactions",
          name: "transactions",
          component: TransactionsView,
          meta: { title: "Lançamentos" },
        },
        {
          path: "accounts-cards",
          name: "accounts-cards",
          component: AccountsCardsView,
          meta: { title: "Contas e cartões" },
        },
        {
          path: "installments",
          name: "installments",
          component: InstallmentsView,
          meta: { title: "Parcelamentos" },
        },
        {
          path: "budgets",
          name: "budgets",
          component: BudgetsView,
          meta: { title: "Orçamentos" },
        },
        {
          path: "goals",
          name: "goals",
          component: GoalsView,
          meta: { title: "Metas Financeiras" },
        },
        {
          path: "reports",
          name: "reports",
          component: ReportsView,
          meta: { title: "Relatórios" },
        },
        {
          path: "settings",
          name: "settings",
          component: SettingsView,
          meta: { title: "Preferências" },
        },
        {
          path: "family",
          name: "family",
          component: FamilyView,
          meta: { title: "Família e acesso" },
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/dashboard",
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // If token exists in localStorage but user not loaded yet, fetch user
  if (authStore.token && !authStore.user) {
    try { await authStore.fetchMe(); }
    catch { recoverApp('Não conseguimos conectar ao servidor agora. Aguarde alguns segundos e tente novamente.'); return next(false); }
  }

  const isPublic = to.meta.public;
  const isAuthenticated = authStore.isAuthenticated;

  if (!isPublic && !isAuthenticated) {
    return next({ name: "login", query: { redirect: to.fullPath } });
  }

  if (isPublic && isAuthenticated) {
    return next({ name: "dashboard" });
  }

  next();
});
router.afterEach(() => { booting.value = false; });
router.onError(() => recoverApp());

export default router;
