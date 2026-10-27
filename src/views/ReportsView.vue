<script setup lang="ts">
import { formatEnum } from "@/utils/formatters";
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted, watch } from "vue";
import { api } from "@/services/api";
import type { MonthlyReportResponse, AnnualReportResponse } from "@/types";
import { formatBRL, formatPercent } from "@/utils/formatters";
import {
  FileText,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-vue-next";

const mode = ref<"monthly" | "annual">("monthly");

const currentDate = new Date();
const selectedYear = ref(currentDate.getFullYear());
const selectedMonth = ref(currentDate.getMonth() + 1);

const monthlyReport = ref<MonthlyReportResponse | null>(null);
const annualReport = ref<AnnualReportResponse | null>(null);

const loading = ref(false);
const error = ref("");

const monthsList = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

async function loadReport() {
  loading.value = true;
  error.value = "";
  try {
    if (mode.value === "monthly") {
      const res = await api.get("/reports/monthly", {
        params: { year: selectedYear.value, month: selectedMonth.value },
      });
      monthlyReport.value = res.data;
    } else {
      const res = await api.get("/reports/annual", {
        params: { year: selectedYear.value },
      });
      annualReport.value = res.data;
    }
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao carregar relatório";
  } finally {
    loading.value = false;
  }
}

function prevMonth() {
  if (selectedMonth.value === 1) {
    selectedMonth.value = 12;
    selectedYear.value--;
  } else {
    selectedMonth.value--;
  }
}

function nextMonth() {
  if (selectedMonth.value === 12) {
    selectedMonth.value = 1;
    selectedYear.value++;
  } else {
    selectedMonth.value++;
  }
}

watch([mode, selectedYear, selectedMonth], () => {
  loadReport();
});

async function exportCSV() {
  try {
    const params: any = { year: selectedYear.value };
    if (mode.value === "monthly") {
      params.month = selectedMonth.value;
    }
    const response = await api.get("/transactions/export/csv", {
      params,
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `transacoes_${selectedYear.value}_${mode.value === "monthly" ? selectedMonth.value : "anual"}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    feedback.notify("Erro ao exportar CSV de transações");
  }
}

function printReport() {
  window.print();
}

onMounted(() => {
  loadReport();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header Controls (Hidden on Print) -->
    <div
      class="print:hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
          Relatórios
        </h1>
        <p class="text-base text-gray-500 mt-1">
          Demonstrativos consolidados, evolução e distribuição de despesas
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <!-- Mode Tabs -->
        <div class="flex items-center bg-gray-100 p-1 rounded-xl">
          <button
            @click="mode = 'monthly'"
            :class="[
              'px-3 py-1.5 text-base font-semibold rounded-lg transition-colors',
              mode === 'monthly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ]"
          >
            Mensal
          </button>
          <button
            @click="mode = 'annual'"
            :class="[
              'px-3 py-1.5 text-base font-semibold rounded-lg transition-colors',
              mode === 'annual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900',
            ]"
          >
            Anual
          </button>
        </div>

        <!-- Period Selector -->
        <div
          v-if="mode === 'monthly'"
          class="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm px-2 py-1 gap-1"
        >
          <button
            @click="prevMonth"
            class="p-1 text-gray-500 hover:text-gray-800 rounded-md"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <span
            class="text-base font-semibold text-gray-800 min-w-[120px] text-center"
          >
            {{ monthsList[selectedMonth - 1] }} {{ selectedYear }}
          </span>
          <button
            @click="nextMonth"
            class="p-1 text-gray-500 hover:text-gray-800 rounded-md"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>

        <div
          v-else
          class="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm px-2 py-1 gap-1"
        >
          <button
            @click="selectedYear--"
            class="p-1 text-gray-500 hover:text-gray-800 rounded-md"
          >
            <ChevronLeft class="w-5 h-5" />
          </button>
          <span
            class="text-base font-semibold text-gray-800 min-w-[70px] text-center"
          >
            {{ selectedYear }}
          </span>
          <button
            @click="selectedYear++"
            class="p-1 text-gray-500 hover:text-gray-800 rounded-md"
          >
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>

        <!-- Action Buttons -->
        <button
          @click="exportCSV"
          class="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-base font-medium rounded-xl shadow-sm transition-colors"
          title="Exportar dados em planilha CSV"
        >
          <Download class="w-5 h-5 text-gray-500" />
          CSV
        </button>

        <button
          @click="printReport"
          class="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-medium rounded-xl shadow-sm transition-colors"
          title="Imprimir ou gerar PDF"
        >
          <Printer class="w-5 h-5" />
          Imprimir / PDF
        </button>
      </div>
    </div>

    <!-- Printable Header (Visible only on print) -->
    <div class="hidden print:block border-b border-gray-200 pb-4 mb-6">
      <h1 class="text-3xl font-bold text-gray-900">
        Prumo — Relatório financeiro
      </h1>
      <p class="text-base text-gray-600">
        Período:
        {{
          mode === "monthly"
            ? `${monthsList[selectedMonth - 1]} de ${selectedYear}`
            : `Exercício ${selectedYear}`
        }}
      </p>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-base flex items-center gap-3"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex justify-center items-center py-20 text-gray-400"
    >
      <div
        class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"
      ></div>
    </div>

    <!-- CONTENT: Monthly Report -->
    <div v-else-if="mode === 'monthly' && monthlyReport" class="space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Receitas recebidas</span
            >
            <TrendingUp class="w-5 h-5 text-emerald-600" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{ formatBRL(monthlyReport.realized_income) }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Despesas pagas</span
            >
            <TrendingDown class="w-5 h-5 text-red-600" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{ formatBRL(monthlyReport.realized_expense) }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Resultado Líquido</span
            >
            <Scale
              class="w-5 h-5"
              :class="
                Number(monthlyReport.net_result) >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              "
            />
          </div>
          <p
            class="text-3xl font-bold"
            :class="
              Number(monthlyReport.net_result) >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
            "
          >
            {{ formatBRL(monthlyReport.net_result) }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Taxa de Poupança</span
            >
            <PiggyBank class="w-5 h-5 text-blue-600" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{
              monthlyReport.savings_rate !== null
                ? formatPercent(monthlyReport.savings_rate)
                : "N/A"
            }}
          </p>
        </div>
      </div>

      <!-- Categories & Classification Breakdowns -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Category Breakdown -->
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h3 class="text-base font-bold text-gray-900 mb-4">
            Despesas por Categoria
          </h3>
          <div
            v-if="monthlyReport.categories.length === 0"
            class="py-8 text-center text-base text-gray-400"
          >
            Nenhuma despesa realizada neste mês.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="cat in monthlyReport.categories"
              :key="cat.category_id"
              class="flex flex-col gap-1.5 p-2 rounded-lg hover:bg-gray-50"
            >
              <div
                class="flex flex-wrap items-center justify-between gap-3 text-base"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: cat.color || '#94a3b8' }"
                  ></div>
                  <span class="font-medium text-gray-800">{{
                    cat.category_name
                  }}</span>
                  <span
                    class="text-sm px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                  >
                    {{ formatEnum(cat.classification) }}
                  </span>
                </div>
                <div class="report-total text-right">
                  <span class="font-bold text-gray-900">{{
                    formatBRL(cat.total_amount)
                  }}</span>
                  <span class="text-base text-gray-400 ml-2"
                    >({{ cat.percentage }}%)</span
                  >
                </div>
              </div>
              <div
                class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden"
              >
                <div
                  class="h-1.5 rounded-full"
                  :style="{
                    width: `${Math.min(cat.percentage, 100)}%`,
                    backgroundColor: cat.color || '#10b981',
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 50/30/20 Classification & Responsibles -->
        <div class="space-y-6">
          <!-- 50/30/20 Breakdown -->
          <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 class="text-base font-bold text-gray-900 mb-4">
              Classificação 50 / 30 / 20
            </h3>
            <div class="space-y-4">
              <div
                v-for="c in monthlyReport.classifications"
                :key="c.classification"
                class="space-y-1.5"
              >
                <div
                  class="flex flex-wrap items-center justify-between gap-3 text-base"
                >
                  <span class="font-semibold text-gray-700">
                    {{
                      ["NECESSIDADE", "ESSENCIAL"].includes(c.classification)
                        ? "Gastos Essenciais (50%)"
                        : ["DESEJO", "NAO_ESSENCIAL"].includes(c.classification)
                          ? "Estilo de Vida (30%)"
                          : c.classification === "INVESTIMENTO" ? "Investimentos & Metas (20%)" : "Outros"
                    }}
                  </span>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-gray-900">{{
                      formatBRL(c.total_amount)
                    }}</span>
                    <span class="text-gray-400"
                      >({{ c.percentage }}% da receita)</span
                    >
                  </div>
                </div>
                <div
                  class="w-full bg-gray-100 rounded-full h-2 overflow-hidden"
                >
                  <div
                    class="h-2 rounded-full"
                    :class="[
                      ['NECESSIDADE','ESSENCIAL'].includes(c.classification)
                        ? 'bg-blue-600'
                        : ['DESEJO','NAO_ESSENCIAL'].includes(c.classification)
                          ? 'bg-purple-600'
                          : 'bg-emerald-600',
                    ]"
                    :style="{ width: `${Math.min(c.percentage, 100)}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Responsible Breakdown -->
          <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h3 class="text-base font-bold text-gray-900 mb-3">
              Divisão por Responsável
            </h3>
            <div
              v-if="monthlyReport.responsibles.length === 0"
              class="py-4 text-center text-base text-gray-400"
            >
              Sem dados de despesas por responsável.
            </div>
            <div v-else class="space-y-2.5">
              <div
                v-for="resp in monthlyReport.responsibles"
                :key="resp.responsible_id"
                class="flex flex-wrap items-center justify-between gap-3 text-base p-2 bg-gray-50 rounded-lg"
              >
                <span class="font-medium text-gray-800">{{
                  resp.responsible_name
                }}</span>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-gray-900">{{
                    formatBRL(resp.total_amount)
                  }}</span>
                  <span class="text-base text-gray-500"
                    >({{ resp.percentage }}%)</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- CONTENT: Annual Report -->
    <div v-else-if="mode === 'annual' && annualReport" class="space-y-6">
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Total de Receitas</span
            >
            <TrendingUp class="w-5 h-5 text-emerald-600" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{ formatBRL(annualReport.total_income) }}
          </p>
          <p class="text-base text-gray-500 mt-1">
            Média: {{ formatBRL(annualReport.average_monthly_income) }}/mês
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Total de Despesas</span
            >
            <TrendingDown class="w-5 h-5 text-red-600" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{ formatBRL(annualReport.total_expense) }}
          </p>
          <p class="text-base text-gray-500 mt-1">
            Média: {{ formatBRL(annualReport.average_monthly_expense) }}/mês
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Saldo Líquido Acumulado</span
            >
            <Scale
              class="w-5 h-5"
              :class="
                Number(annualReport.net_result) >= 0
                  ? 'text-emerald-600'
                  : 'text-red-600'
              "
            />
          </div>
          <p
            class="text-3xl font-bold"
            :class="
              Number(annualReport.net_result) >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
            "
          >
            {{ formatBRL(annualReport.net_result) }}
          </p>
        </div>

        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <div
            class="flex flex-wrap items-center justify-between gap-3 text-gray-500 mb-2"
          >
            <span class="text-base font-semibold normal-case tracking-normal"
              >Exercício</span
            >
            <Calendar class="w-5 h-5 text-gray-500" />
          </div>
          <p class="text-3xl font-bold text-gray-900">
            {{ annualReport.year }}
          </p>
          <p class="text-base text-gray-500 mt-1">12 meses consolidados</p>
        </div>
      </div>

      <!-- Annual Month-by-Month Table -->
      <div
        class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div class="p-5 border-b border-gray-100">
          <h3 class="text-base font-bold text-gray-900">
            Evolução Mensal ({{ annualReport.year }})
          </h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-base">
            <thead
              class="bg-gray-50 text-base font-semibold text-gray-500 normal-case tracking-normal border-b border-gray-100"
            >
              <tr>
                <th class="py-3 px-4">Mês</th>
                <th class="py-3 px-4 text-right">Receitas</th>
                <th class="py-3 px-4 text-right">Despesas</th>
                <th class="py-3 px-4 text-right">Resultado</th>
                <th class="py-3 px-4 text-right">Taxa Poupança</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="m in annualReport.months"
                :key="m.month"
                class="hover:bg-gray-50 transition-colors"
              >
                <td class="py-3 px-4 font-medium text-gray-900">
                  {{ m.month_name }}
                </td>
                <td class="py-3 px-4 text-right font-medium text-emerald-600">
                  {{ formatBRL(m.income) }}
                </td>
                <td class="py-3 px-4 text-right font-medium text-red-600">
                  {{ formatBRL(m.expense) }}
                </td>
                <td
                  class="py-3 px-4 text-right font-bold"
                  :class="
                    Number(m.net) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  "
                >
                  {{ formatBRL(m.net) }}
                </td>
                <td class="py-3 px-4 text-right text-gray-600">
                  {{
                    m.savings_rate !== null
                      ? formatPercent(m.savings_rate)
                      : "—"
                  }}
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 font-bold border-t-2 border-gray-200">
              <tr>
                <td class="py-3 px-4 text-gray-900">TOTAL ANUAL</td>
                <td class="py-3 px-4 text-right text-emerald-600">
                  {{ formatBRL(annualReport.total_income) }}
                </td>
                <td class="py-3 px-4 text-right text-red-600">
                  {{ formatBRL(annualReport.total_expense) }}
                </td>
                <td
                  class="py-3 px-4 text-right"
                  :class="
                    Number(annualReport.net_result) >= 0
                      ? 'text-emerald-600'
                      : 'text-red-600'
                  "
                >
                  {{ formatBRL(annualReport.net_result) }}
                </td>
                <td class="py-3 px-4 text-right text-gray-400">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Top Categories in Year -->
      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h3 class="text-base font-bold text-gray-900 mb-4">
          Maiores Despesas do Ano
        </h3>
        <div
          v-if="annualReport.top_categories.length === 0"
          class="py-6 text-center text-base text-gray-400"
        >
          Nenhuma despesa registrada neste ano.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="cat in annualReport.top_categories"
            :key="cat.category_id"
            class="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2.5">
              <div
                class="w-3.5 h-3.5 rounded-full"
                :style="{ backgroundColor: cat.color || '#94a3b8' }"
              ></div>
              <div>
                <p class="font-medium text-gray-900 text-base">
                  {{ cat.category_name }}
                </p>
                <p class="text-base text-gray-500">
                  {{ formatEnum(cat.classification) }}
                </p>
              </div>
            </div>
            <div class="report-total text-right">
              <p class="font-bold text-gray-900 text-base">
                {{ formatBRL(cat.total_amount) }}
              </p>
              <p class="text-base text-gray-500">
                {{ cat.percentage }}% das despesas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
