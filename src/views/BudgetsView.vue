<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted, watch } from "vue";
import { api } from "@/services/api";
import type { Budget503020, CustomBudget } from "@/types";
import { formatBRL, formatPercentage } from "@/utils/formatters";
import CustomBudgetModal from "@/components/budgets/CustomBudgetModal.vue";
import {
  PieChart,
  Save,
  Plus,
  AlertTriangle,
  CheckCircle,
  Trash2,
  AlertCircle,
} from "lucide-vue-next";

const now = new Date();
const selectedYear = ref(now.getFullYear());
const selectedMonth = ref(now.getMonth() + 1);

const loading = ref(false);
const budget503020 = ref<Budget503020 | null>(null);
const customBudgets = ref<CustomBudget[]>([]);
const showCustomModal = ref(false);
const editingBudget = ref<CustomBudget | null>(null);

// 50/30/20 form
const estimatedIncome = ref("");
const needsPct = ref(50);
const wantsPct = ref(30);
const savingsPct = ref(20);
const error503020 = ref("");
const success503020 = ref("");

async function loadBudgets() {
  loading.value = true;
  error503020.value = "";
  try {
    const [bRes, cRes] = await Promise.all([
      api.get(
        `/budgets/503020?year=${selectedYear.value}&month=${selectedMonth.value}`,
      ),
      api.get(
        `/budgets/custom?year=${selectedYear.value}&month=${selectedMonth.value}`,
      ),
    ]);
    budget503020.value = bRes.data;
    customBudgets.value = cRes.data;

    if (bRes.data) {
      estimatedIncome.value = String(bRes.data.estimated_income);
      needsPct.value = Number(bRes.data.needs_percentage);
      wantsPct.value = Number(bRes.data.wants_percentage);
      savingsPct.value = Number(bRes.data.savings_percentage);
    }
  } catch (err) {
    error503020.value =
      "Não foi possível carregar os orçamentos. Tente novamente.";
  } finally {
    loading.value = false;
  }
}

async function save503020() {
  error503020.value = "";
  success503020.value = "";

  const sumPct =
    Number(needsPct.value) + Number(wantsPct.value) + Number(savingsPct.value);
  if (sumPct !== 100) {
    error503020.value = `A soma dos percentuais deve ser exatamente 100% (atual: ${sumPct}%)`;
    return;
  }

  const incomeNum = parseMoney(estimatedIncome.value);
  if (isNaN(incomeNum) || incomeNum < 0) {
    error503020.value = "Informe uma renda estimada válida";
    return;
  }

  try {
    const res = await api.post("/budgets/503020", {
      year: selectedYear.value,
      month: selectedMonth.value,
      estimated_income: incomeNum,
      needs_percentage: needsPct.value,
      wants_percentage: wantsPct.value,
      savings_percentage: savingsPct.value,
    });
    budget503020.value = res.data;
    success503020.value = "Regra 50/30/20 salva com sucesso!";
    setTimeout(() => {
      success503020.value = "";
    }, 3000);
  } catch (err: any) {
    error503020.value =
      err.response?.data?.detail || "Erro ao salvar regra 50/30/20";
  }
}

async function deleteCustomBudget(b: CustomBudget) {
  if (
    !(await feedback.confirm(
      `Deseja remover o limite de orçamento para ${b.category_name || b.responsible_name || "este item"}?`,
    ))
  )
    return;
  try {
    await api.delete(`/budgets/custom/${b.id}`);
    loadBudgets();
  } catch {
    feedback.notify("Erro ao excluir orçamento");
  }
}

watch([selectedYear, selectedMonth], () => {
  loadBudgets();
});

onMounted(() => {
  loadBudgets();
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="!auth.canManage" class="context-message">
      <p>
        Você pode consultar estes dados. Contas, preferências e orçamentos são
        gerenciados pelos administradores do espaço.
      </p>
      <RouterLink to="/family" class="font-semibold"
        >Ver quem administra</RouterLink
      >
    </div>
    <!-- Header with Month/Year Selector -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Orçamentos
        </h1>
        <p class="text-base text-slate-500">
          Defina sua regra 50/30/20 e tetos mensais por categoria. Compras no crédito comprometem o orçamento no mês da compra; parcelas entram no mês do vencimento. O pagamento da fatura não é contado novamente.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model.number="selectedMonth"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold text-slate-700 outline-none shadow-2xs"
        >
          <option
            v-for="(name, idx) in [
              'Janeiro',
              'Fevereiro',
              'Março',
              'Abril',
              'Maio',
              'Junho',
              'Julho',
              'Agosto',
              'Setembro',
              'Outubro',
              'Novembro',
              'Dezembro',
            ]"
            :key="idx"
            :value="idx + 1"
          >
            {{ name }}
          </option>
        </select>

        <select
          v-model.number="selectedYear"
          class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-base font-semibold text-slate-700 outline-none shadow-2xs"
        >
          <option
            v-for="y in [2024, 2025, 2026, 2027, 2028]"
            :key="y"
            :value="y"
          >
            {{ y }}
          </option>
        </select>
      </div>
    </div>

    <!-- Regra 50/30/20 Section -->
    <div
      class="rounded-2xl bg-white p-6 shadow-2xs border border-slate-200/80 space-y-6"
    >
      <div
        class="flex items-center justify-between border-b border-slate-100 pb-4"
      >
        <div>
          <h2 class="text-base font-bold text-slate-900">Regra 50 / 30 / 20</h2>
          <p class="text-base text-slate-500">
            Distribuição recomendada: 50% Necessidades, 30% Desejos e 20% Metas
            e Poupança
          </p>
        </div>
      </div>

      <div
        v-if="error503020"
        class="rounded-lg bg-red-50 p-3 text-base font-medium text-red-700 border border-red-200"
      >
        {{ error503020 }}
      </div>
      <div
        v-if="success503020"
        class="rounded-lg bg-emerald-50 p-3 text-base font-medium text-emerald-700 border border-emerald-200"
      >
        {{ success503020 }}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Renda Estimada do Mês (R$)</label
          >
          <input
            :disabled="!auth.canManage"
            v-model="estimatedIncome"
            type="text"
            placeholder="Ex: 5000,00"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-bold"
          />
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Necessidades (%)</label
          >
          <input
            :disabled="!auth.canManage"
            v-model.number="needsPct"
            type="number"
            min="0"
            max="100"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Desejos (%)</label
          >
          <input
            :disabled="!auth.canManage"
            v-model.number="wantsPct"
            type="number"
            min="0"
            max="100"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div class="flex items-center gap-2">
          <div class="flex-1">
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Metas / Poupança (%)</label
            >
            <input
              :disabled="!auth.canManage"
              v-model.number="savingsPct"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            v-if="auth.canManage"
            @click="save503020"
            class="rounded-lg bg-emerald-600 px-4 py-2.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs h-[38px] flex items-center gap-1.5"
          >
            <Save class="h-5 w-5" />
            Salvar
          </button>
        </div>
      </div>

      <p v-if="budget503020" class="context-message">Comprometido no mês: <strong>{{ formatBRL(Number(budget503020.needs_spent) + Number(budget503020.wants_spent) + Number(budget503020.savings_spent) + Number(budget503020.other_spent || 0)) }}</strong><span v-if="Number(budget503020.other_spent || 0) > 0"> · Outros gastos: {{ formatBRL(budget503020.other_spent || 0) }}. Esses gastos aparecem no total, fora das três faixas da regra.</span></p>
      <!-- Realized vs Allocated Comparison Cards -->
      <div
        v-if="budget503020"
        class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100"
      >
        <!-- Necessidades -->
        <div
          class="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2"
        >
          <div class="flex justify-between items-center text-base">
            <span class="font-bold text-blue-900"
              >Necessidades ({{ budget503020.needs_percentage }}%)</span
            >
            <span class="text-blue-700 font-semibold"
              >{{ formatBRL(budget503020.needs_allocated) }} teto</span
            >
          </div>
          <div class="flex justify-between text-base text-slate-600">
            <span>Gasto / comprometido:</span>
            <span class="font-bold text-slate-900">{{
              formatBRL(budget503020.needs_spent)
            }}</span>
          </div>
          <div class="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-blue-600 rounded-full transition-all"
              :style="{
                width: `${budget503020.needs_allocated > 0 ? Math.min(100, (budget503020.needs_spent / budget503020.needs_allocated) * 100) : 0}%`,
              }"
            />
          </div>
          <p class="text-sm text-right text-blue-800 font-medium">
            Saldo restante:
            {{
              formatBRL(budget503020.needs_allocated - budget503020.needs_spent)
            }}
          </p>
        </div>

        <!-- Desejos -->
        <div
          class="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2"
        >
          <div class="flex justify-between items-center text-base">
            <span class="font-bold text-amber-900"
              >Desejos ({{ budget503020.wants_percentage }}%)</span
            >
            <span class="text-amber-700 font-semibold"
              >{{ formatBRL(budget503020.wants_allocated) }} teto</span
            >
          </div>
          <div class="flex justify-between text-base text-slate-600">
            <span>Gasto / comprometido:</span>
            <span class="font-bold text-slate-900">{{
              formatBRL(budget503020.wants_spent)
            }}</span>
          </div>
          <div class="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-amber-500 rounded-full transition-all"
              :style="{
                width: `${budget503020.wants_allocated > 0 ? Math.min(100, (budget503020.wants_spent / budget503020.wants_allocated) * 100) : 0}%`,
              }"
            />
          </div>
          <p class="text-sm text-right text-amber-800 font-medium">
            Saldo restante:
            {{
              formatBRL(budget503020.wants_allocated - budget503020.wants_spent)
            }}
          </p>
        </div>

        <!-- Metas / Poupança -->
        <div
          class="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2"
        >
          <div class="flex justify-between items-center text-base">
            <span class="font-bold text-emerald-900"
              >Metas / Poupança ({{ budget503020.savings_percentage }}%)</span
            >
            <span class="text-emerald-700 font-semibold"
              >{{ formatBRL(budget503020.savings_allocated) }} meta</span
            >
          </div>
          <div class="flex justify-between text-base text-slate-600">
            <span>Investido / comprometido:</span>
            <span class="font-bold text-slate-900">{{
              formatBRL(budget503020.savings_spent)
            }}</span>
          </div>
          <div class="h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-600 rounded-full transition-all"
              :style="{
                width: `${budget503020.savings_allocated > 0 ? Math.min(100, (budget503020.savings_spent / budget503020.savings_allocated) * 100) : 0}%`,
              }"
            />
          </div>
          <p class="text-sm text-right text-emerald-800 font-medium">
            Falta guardar:
            {{
              formatBRL(
                Math.max(
                  0,
                  budget503020.savings_allocated - budget503020.savings_spent,
                ),
              )
            }}
          </p>
        </div>
      </div>
    </div>

    <!-- Custom Category Budgets -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-slate-900">
            Orçamentos por categoria
          </h2>
          <p class="text-base text-slate-500">
            Defina tetos por categoria para receber alertas antes de estourar
          </p>
        </div>

        <button
          v-if="auth.canManage"
          @click="
            editingBudget = null;
            showCustomModal = true;
          "
          class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus class="h-5 w-5" />
          Novo orçamento
        </button>
      </div>

      <div
        v-if="customBudgets.length === 0"
        class="rounded-2xl bg-white p-8 text-center text-base text-slate-400 border border-slate-200/80"
      >
        Nenhum limite personalizado definido para este mês.
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="b in customBudgets"
          :key="b.id"
          class="rounded-xl border p-4 bg-white shadow-2xs space-y-3"
          :class="
            b.is_exceeded
              ? 'border-red-300 ring-1 ring-red-300'
              : b.is_warning
                ? 'border-amber-300'
                : 'border-slate-200/80'
          "
        >
          <div class="flex items-center justify-between">
            <h3 class="text-base font-bold text-slate-900">
              {{ b.category_name || b.responsible_name || "Geral" }}
            </h3>
            <button
              v-if="auth.canManage"
              @click="deleteCustomBudget(b)"
              class="text-slate-400 hover:text-red-600"
            >
              <Trash2 class="h-5 w-5" />
            </button>
          </div>

          <!-- Alert Badge -->
          <div
            v-if="b.is_exceeded"
            class="rounded bg-red-50 p-2 text-sm font-semibold text-red-700 flex items-center gap-1.5"
          >
            <AlertTriangle class="h-5 w-5 shrink-0" />
            Orçamento excedido em {{ formatBRL(b.exceeded_amount) }}!
          </div>
          <div
            v-else-if="b.is_warning"
            class="rounded bg-amber-50 p-2 text-sm font-semibold text-amber-700 flex items-center gap-1.5"
          >
            <AlertCircle class="h-5 w-5 shrink-0" />
            Atenção: {{ b.consumed_percentage }}% do limite consumido!
          </div>

          <div class="space-y-1 text-base">
            <div class="flex justify-between text-slate-500">
              <span>Gasto / comprometido:</span>
              <span class="font-bold text-slate-800">{{
                formatBRL(b.realized_spent)
              }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Limite máximo:</span>
              <span class="font-bold text-slate-800">{{
                formatBRL(b.limit_amount)
              }}</span>
            </div>
            <div class="flex justify-between text-slate-500">
              <span>Restante disponível:</span>
              <span
                class="font-bold"
                :class="
                  b.remaining_amount >= 0 ? 'text-emerald-600' : 'text-red-600'
                "
              >
                {{ formatBRL(b.remaining_amount) }}
              </span>
            </div>
          </div>

          <!-- Progress -->
          <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="
                b.is_exceeded
                  ? 'bg-red-600'
                  : b.is_warning
                    ? 'bg-amber-500'
                    : 'bg-emerald-600'
              "
              :style="{ width: `${Math.min(100, b.consumed_percentage)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Budget Modal -->
    <CustomBudgetModal
      v-if="showCustomModal"
      :year="selectedYear"
      :month="selectedMonth"
      :budget="editingBudget"
      @close="
        showCustomModal = false;
        editingBudget = null;
      "
      @saved="loadBudgets"
    />
  </div>
</template>
