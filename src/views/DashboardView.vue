<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { api } from "@/services/api";
import type { DashboardMetrics } from "@/types";
import { formatBRL, formatDateBR, formatPercentage } from "@/utils/formatters";
import {
  ArrowRight,
  Wallet,
  PieChart,
  FileText,
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  PiggyBank,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
} from "lucide-vue-next";

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
} from "chart.js";
import { Doughnut, Bar } from "vue-chartjs";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
);

const router = useRouter();
const loading = ref(true);
const error = ref("");
const selectedPeriod = ref("this_month");
const metrics = ref<DashboardMetrics | null>(null);

const classificationLabels: Record<string, string> = {
  NECESSIDADE: "Necessidades",
  DESEJO: "Desejos",
  INVESTIMENTO: "Investimentos",
};

const periods = [
  { label: "Este mês", value: "this_month" },
  { label: "Mês anterior", value: "last_month" },
  { label: "Últimos 3 meses", value: "last_3_months" },
  { label: "Últimos 6 meses", value: "last_6_months" },
  { label: "Este ano", value: "this_year" },
];

async function loadDashboard() {
  loading.value = true;
  error.value = "";
  try {
    const res = await api.get(
      `/dashboard/metrics?period=${selectedPeriod.value}`,
    );
    metrics.value = res.data;
  } catch (e) {
    error.value =
      "Não foi possível carregar a visão geral. Seus dados continuam salvos.";
  } finally {
    loading.value = false;
  }
}

// Chart: Category Spending (Doughnut)
const categoryChartData = computed(() => {
  if (!metrics.value || metrics.value.category_spending.length === 0)
    return null;
  return {
    labels: metrics.value.category_spending.map((c) => c.category_name),
    datasets: [
      {
        backgroundColor: metrics.value.category_spending.map(
          (c) => c.color || "#2E9E6B",
        ),
        data: metrics.value.category_spending.map((c) => c.amount),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };
});

// Chart: Cash Flow Timeline (Bar)
const cashFlowChartData = computed(() => {
  if (
    !metrics.value ||
    !metrics.value.cash_flow_timeline.some(
      (t) =>
        Number(t.realized_income) !== 0 || Number(t.realized_expense) !== 0,
    )
  )
    return null;
  return {
    labels: metrics.value.cash_flow_timeline.map((t) => t.label),
    datasets: [
      {
        label: "Receitas",
        backgroundColor: "#2E9E6B",
        borderRadius: 4,
        data: metrics.value.cash_flow_timeline.map((t) => t.realized_income),
      },
      {
        label: "Despesas",
        backgroundColor: "#D5503F",
        borderRadius: 4,
        data: metrics.value.cash_flow_timeline.map((t) => t.realized_expense),
      },
    ],
  };
});

// Chart: Needs vs Wants vs Investment (Doughnut)
const classificationChartData = computed(() => {
  if (!metrics.value || metrics.value.classification_spending.length === 0)
    return null;
  const colors: Record<string, string> = {
    NECESSIDADE: "#0F5B4F",
    DESEJO: "#78988B",
    INVESTIMENTO: "#2E9E6B",
  };
  const labels: Record<string, string> = {
    NECESSIDADE: "Necessidades (50%)",
    DESEJO: "Desejos (30%)",
    INVESTIMENTO: "Investimentos (20%)",
    OUTRO: "Outros",
  };
  return {
    labels: metrics.value.classification_spending.map(
      (c) => labels[c.classification] || c.classification,
    ),
    datasets: [
      {
        backgroundColor: metrics.value.classification_spending.map(
          (c) => colors[c.classification] || "#5B6B66",
        ),
        data: metrics.value.classification_spending.map((c) => c.amount),
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };
});

function filterByCategory(categoryId?: string) {
  if (categoryId) {
    router.push({ path: "/transactions", query: { category_id: categoryId } });
  }
}

onMounted(() => {
  loadDashboard();
  window.addEventListener("msfinancas:transaction-created", loadDashboard);
  window.addEventListener("msfinancas:installment-created", loadDashboard);
});

onUnmounted(() => {
  window.removeEventListener("msfinancas:transaction-created", loadDashboard);
  window.removeEventListener("msfinancas:installment-created", loadDashboard);
});
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-heading">
      <div>
        <h1>Visão geral</h1>
        <p>O que entrou, o que saiu e o que cabe nos próximos planos.</p>
      </div>
      <label class="dashboard-period"
        >Período da análise<select
          v-model="selectedPeriod"
          @change="loadDashboard"
        >
          <option
            v-for="period in periods"
            :key="period.value"
            :value="period.value"
          >
            {{ period.label }}
          </option>
        </select></label
      >
    </div>
    <div v-if="error" class="context-message error" role="alert">
      <AlertCircle :size="24" />
      <p>{{ error }}</p>
      <button @click="loadDashboard">Tentar novamente</button>
    </div>
    <div
      v-if="loading"
      class="balance-grid"
      aria-label="Carregando visão geral"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="h-52 rounded-2xl border border-slate-200 bg-white animate-pulse"
      />
    </div>
    <template v-else-if="metrics && !error">
      <div class="balance-grid">
        <section class="balance-card primary" aria-label="Saldo nas contas">
          <div class="balance-label">
            <span>Saldo nas contas</span><Wallet :size="24" />
          </div>
          <p class="balance-value">
            {{ formatBRL(metrics.total_account_balance) }}
          </p>
          <p>
            Somando suas contas e carteiras. Limite de cartão não entra nesse
            saldo.
          </p>
        </section>
        <section class="balance-card">
          <div class="balance-label">
            <span>Receitas recebidas</span
            ><TrendingUp :size="24" class="income" />
          </div>
          <p class="balance-value income">
            {{ formatBRL(metrics.realized_income) }}
          </p>
          <p>+ {{ formatBRL(metrics.pending_income) }} a receber no período</p>
        </section>
        <section class="balance-card">
          <div class="balance-label">
            <span>Despesas pagas</span
            ><TrendingDown :size="24" class="expense" />
          </div>
          <p class="balance-value expense">
            {{ formatBRL(metrics.realized_expense) }}
          </p>
          <p>
            {{ formatBRL(metrics.pending_expense) }} ainda pendentes no período
          </p>
        </section>
      </div>
      <dl class="month-overview">
        <div>
          <dt>Resultado do período</dt>
          <dd
            :class="
              metrics.net_result >= 0 ? 'text-emerald-700' : 'text-red-700'
            "
          >
            {{ formatBRL(metrics.net_result) }}
          </dd>
          <small>Receitas menos despesas</small>
        </div>
        <div>
          <dt>Quanto ficou guardado</dt>
          <dd>
            {{
              metrics.savings_rate == null
                ? "—"
                : formatPercentage(metrics.savings_rate)
            }}
          </dd>
          <small>{{
            metrics.savings_rate == null
              ? "Sem renda para comparar"
              : "Da renda recebida"
          }}</small>
        </div>
        <div>
          <dt>Parcelas a vencer</dt>
          <dd>{{ formatBRL(metrics.future_installments_total) }}</dd>
          <small>Dentro do período escolhido</small>
        </div>
        <div>
          <dt>Resultado previsto</dt>
          <dd>{{ formatBRL(metrics.projected_net) }}</dd>
          <small>Inclui entradas e saídas previstas</small>
        </div>
      </dl>
      <div v-if="Number(metrics.pending_expense) > 0" class="context-message">
        <Clock :size="24" />
        <p>
          Há <strong>{{ formatBRL(metrics.pending_expense) }}</strong> em
          despesas pendentes neste período. Veja o que ainda precisa ser pago.
        </p>
        <RouterLink
          to="/transactions?status=PENDENTE&type=DESPESA"
          class="font-bold inline-flex items-center gap-2"
          >Ver lançamentos <ArrowRight :size="20"
        /></RouterLink>
      </div>
      <div class="dashboard-detail">
        <section class="dashboard-panel">
          <div class="panel-heading">
            <h2>Entradas e saídas</h2>
            <span>Últimos 6 meses</span>
          </div>
          <div class="chart-stage">
            <Bar
              v-if="cashFlowChartData"
              :data="cashFlowChartData"
              :options="{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { usePointStyle: true, padding: 24 },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { border: { display: false }, grid: { color: '#e7efea' } },
                },
              }"
            />
            <div v-else class="chart-empty">
              <TrendingUp :size="44" />
              <p>
                Seu histórico começa com o primeiro<br />lançamento recebido ou
                pago.
              </p>
            </div>
          </div>
        </section>
        <section class="dashboard-panel">
          <div class="panel-heading"><h2>Para onde foi o dinheiro</h2></div>
          <div v-if="metrics.category_spending.length" class="dashboard-list">
            <button
              type="button"
              v-for="category in metrics.category_spending.slice(0, 5)"
              :key="category.category_id"
              class="category-row"
              @click="filterByCategory(category.category_id)"
            >
              <div class="flex items-center gap-3">
                <span
                  class="category-dot"
                  :style="{ background: category.color || '#0F5B4F' }"
                />
                <div>
                  <strong>{{ category.category_name }}</strong>
                  <p>
                    {{ formatPercentage(category.percentage) }} das despesas
                  </p>
                </div>
              </div>
              <strong>{{ formatBRL(category.amount) }}</strong>
            </button>
          </div>
          <div v-else class="chart-empty">
            <PieChart :size="44" />
            <p>
              As categorias aparecem aqui<br />quando você registra uma despesa.
            </p>
          </div>
          <RouterLink to="/transactions" class="dashboard-link"
            >Ver todos os lançamentos <ArrowRight :size="20"
          /></RouterLink>
        </section>
        <section class="dashboard-panel">
          <div class="panel-heading">
            <h2>Maiores despesas</h2>
            <span>{{ metrics.period_label }}</span>
          </div>
          <div v-if="metrics.top_expenses.length" class="dashboard-list">
            <div v-for="expense in metrics.top_expenses" :key="expense.id">
              <div>
                <strong>{{ expense.description }}</strong>
                <p>
                  {{ expense.category_name || "Sem categoria" }} ·
                  {{ formatDateBR(expense.date) }}
                </p>
              </div>
              <span class="amount">− {{ formatBRL(expense.amount) }}</span>
            </div>
          </div>
          <div v-else class="chart-empty">
            <FileText :size="44" />
            <p>
              Nenhuma despesa no período.<br />Seus lançamentos aparecerão aqui.
            </p>
          </div>
        </section>
        <section class="dashboard-panel">
          <div class="panel-heading"><h2>Um olhar para o orçamento</h2></div>
          <div v-if="metrics.classification_spending.length" class="space-y-6">
            <div
              v-for="item in metrics.classification_spending"
              :key="item.classification"
            >
              <div class="flex justify-between gap-4">
                <span>{{
                  classificationLabels[item.classification] ||
                  item.classification
                }}</span
                ><strong>{{ formatBRL(item.amount) }}</strong>
              </div>
              <div class="progress-track">
                <span
                  :style="{
                    width: Math.min(100, Number(item.percentage)) + '%',
                  }"
                />
              </div>
            </div>
          </div>
          <div v-else class="chart-empty">
            <PiggyBank :size="44" />
            <p>
              Defina quanto cabe em cada parte do mês.<br />Você pode ajustar ao
              seu ritmo.
            </p>
          </div>
          <RouterLink to="/budgets" class="dashboard-link"
            >Acompanhar orçamentos <ArrowRight :size="20"
          /></RouterLink>
        </section>
      </div>
      <section class="dashboard-panel mt-7">
        <div class="panel-heading">
          <h2>As contas, por responsável</h2>
          <RouterLink to="/family" class="text-emerald-700 text-base"
            >Ver quem tem acesso</RouterLink
          >
        </div>
        <div
          v-if="metrics.responsible_spending.length"
          class="dashboard-responsibles"
        >
          <article
            v-for="person in metrics.responsible_spending"
            :key="person.responsible_name"
          >
            <h3>{{ person.responsible_name }}</h3>
            <dl>
              <div>
                <dt>Receitas</dt>
                <dd class="text-emerald-700">
                  + {{ formatBRL(person.income) }}
                </dd>
              </div>
              <div>
                <dt>Despesas</dt>
                <dd class="text-red-700">− {{ formatBRL(person.amount) }}</dd>
              </div>
              <div>
                <dt>Resultado</dt>
                <dd class="font-bold">
                  {{ formatBRL(person.income - person.amount) }}
                </dd>
              </div>
            </dl>
          </article>
        </div>
        <p v-else class="text-slate-500">
          Os responsáveis aparecem conforme você registra os lançamentos.
        </p>
      </section>
    </template>
  </div>
</template>
