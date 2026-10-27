<script setup lang="ts">
import { formatEnum } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted, computed } from "vue";
import { api } from "@/services/api";
import type { FinancialGoal, GoalContribution } from "@/types";
import { formatBRL, formatDate } from "@/utils/formatters";
import GoalModal from "@/components/goals/GoalModal.vue";
import GoalContributionModal from "@/components/goals/GoalContributionModal.vue";
import {
  Plus,
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  User,
  Pencil,
  Trash2,
  Coins,
  History,
  X,
  AlertCircle,
} from "lucide-vue-next";

const goals = ref<FinancialGoal[]>([]);
const loading = ref(true);
const error = ref("");

const statusFilter = ref<"TODOS" | "EM_ANDAMENTO" | "CONCLUIDA" | "CANCELADA">(
  "EM_ANDAMENTO",
);

// Modals
const showGoalModal = ref(false);
const showContributionModal = ref(false);
const selectedGoal = ref<FinancialGoal | null>(null);

// Contributions History Modal
const showHistoryModal = ref(false);
const historyGoal = ref<FinancialGoal | null>(null);
const contributions = ref<GoalContribution[]>([]);
const loadingHistory = ref(false);

async function loadGoals() {
  loading.value = true;
  error.value = "";
  try {
    const res = await api.get("/goals");
    goals.value = res.data;
  } catch (err: any) {
    error.value =
      err.response?.data?.detail || "Erro ao carregar metas financeiras";
  } finally {
    loading.value = false;
  }
}

const filteredGoals = computed(() => {
  if (statusFilter.value === "TODOS") return goals.value;
  return goals.value.filter((g) => g.status === statusFilter.value);
});

const summary = computed(() => {
  const totalTarget = goals.value.reduce(
    (acc, g) => acc + Number(g.target_amount),
    0,
  );
  const totalCurrent = goals.value.reduce(
    (acc, g) => acc + Number(g.current_amount ?? g.accumulated_amount),
    0,
  );
  const completedCount = goals.value.filter(
    (g) => g.status === "CONCLUIDA",
  ).length;
  const activeCount = goals.value.filter(
    (g) => g.status === "EM_ANDAMENTO",
  ).length;
  const overallPercentage =
    totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return {
    totalTarget,
    totalCurrent,
    completedCount,
    activeCount,
    overallPercentage: Math.min(overallPercentage, 100).toFixed(1),
  };
});

function openNewGoal() {
  selectedGoal.value = null;
  showGoalModal.value = true;
}

function openEditGoal(g: FinancialGoal) {
  selectedGoal.value = g;
  showGoalModal.value = true;
}

function openContribution(g: FinancialGoal) {
  selectedGoal.value = g;
  showContributionModal.value = true;
}

async function openHistory(g: FinancialGoal) {
  historyGoal.value = g;
  showHistoryModal.value = true;
  loadingHistory.value = true;
  try {
    const res = await api.get(`/goals/${g.id}/contributions`);
    contributions.value = res.data;
  } catch (err) {
    console.error(err);
  } finally {
    loadingHistory.value = false;
  }
}

async function deleteGoal(g: FinancialGoal) {
  if (
    !(await feedback.confirm(
      `Tem certeza que deseja excluir a meta "${g.name}"?`,
    ))
  )
    return;
  try {
    await api.delete(`/goals/${g.id}`);
    await loadGoals();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao excluir meta");
  }
}

function onGoalSaved() {
  showGoalModal.value = false;
  loadGoals();
}

function onContributionSaved() {
  showContributionModal.value = false;
  loadGoals();
  if (showHistoryModal.value && historyGoal.value) {
    openHistory(historyGoal.value);
  }
}

onMounted(() => {
  loadGoals();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Metas</h1>
        <p class="text-base text-gray-500 mt-1">
          Acompanhe objetivos, reservas e prazos da família
        </p>
      </div>
      <button
        @click="openNewGoal"
        class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-base transition-colors shadow-sm self-start sm:self-auto"
      >
        <Plus class="w-5 h-5" />
        Nova meta
      </button>
    </div>

    <!-- Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Total guardado</span
          >
          <TrendingUp class="w-5 h-5 text-emerald-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ formatBRL(summary.totalCurrent) }}
        </p>
        <p class="text-base text-gray-500 mt-1">
          De {{ formatBRL(summary.totalTarget) }} planejados
        </p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Progresso das metas</span
          >
          <Target class="w-5 h-5 text-blue-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ summary.overallPercentage }}%
        </p>
        <div class="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-500"
            :style="{ width: `${summary.overallPercentage}%` }"
          ></div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Metas em andamento</span
          >
          <Clock class="w-5 h-5 text-amber-500" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ summary.activeCount }}
        </p>
        <p class="text-base text-gray-500 mt-1">Em andamento</p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Metas concluídas</span
          >
          <CheckCircle2 class="w-5 h-5 text-emerald-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ summary.completedCount }}
        </p>
        <p class="text-base text-gray-500 mt-1">Sonhos realizados</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-2 border-b border-gray-200 pb-3">
      <button
        v-for="filter in [
          { id: 'EM_ANDAMENTO', label: 'Em Andamento' },
          { id: 'CONCLUIDA', label: 'Concluídas' },
          { id: 'TODOS', label: 'Todas' },
        ]"
        :key="filter.id"
        @click="statusFilter = filter.id as any"
        :class="[
          'px-3.5 py-1.5 text-base font-medium rounded-lg transition-colors',
          statusFilter === filter.id
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        {{ filter.label }}
      </button>
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

    <!-- Empty State -->
    <div
      v-else-if="filteredGoals.length === 0"
      class="bg-white rounded-xl border border-gray-100 p-12 text-center"
    >
      <Target class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-gray-900">
        Nenhuma meta encontrada
      </h3>
      <p class="text-base text-gray-500 mt-1 max-w-sm mx-auto">
        Comece cadastrando sua primeira meta financeira para organizar sua
        reserva ou planos futuros.
      </p>
      <button
        @click="openNewGoal"
        class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700 transition-colors"
      >
        <Plus class="w-5 h-5" />
        Cadastrar Meta
      </button>
    </div>

    <!-- Goals Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div
        v-for="goal in filteredGoals"
        :key="goal.id"
        class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
      >
        <div>
          <!-- Header Card -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <span
                :class="[
                  'inline-block px-2 py-0.5 text-base font-semibold rounded-md mb-2',
                  goal.status === 'CONCLUIDA'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : goal.status === 'EM_ANDAMENTO'
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-gray-100 text-gray-600',
                ]"
              >
                {{
                  goal.status === "CONCLUIDA"
                    ? "Concluída"
                    : goal.status === "EM_ANDAMENTO"
                      ? "Em Andamento"
                      : "Cancelada"
                }}
              </span>
              <h3 class="text-xl font-bold text-gray-900 leading-snug">
                {{ goal.name }}
              </h3>
              <p
                v-if="goal.description"
                class="text-base text-gray-500 mt-1 line-clamp-2"
              >
                {{ goal.description }}
              </p>
            </div>

            <!-- Card Actions -->
            <div class="flex items-center gap-1">
              <button
                @click="openEditGoal(goal)"
                class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                title="Editar Meta"
              >
                <Pencil class="w-5 h-5" />
              </button>
              <button
                @click="deleteGoal(goal)"
                class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Excluir Meta"
              >
                <Trash2 class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Progress and Values -->
          <div class="mt-4">
            <div class="flex items-baseline justify-between text-base">
              <span class="text-3xl font-bold text-gray-900">{{
                formatBRL(goal.current_amount ?? goal.accumulated_amount)
              }}</span>
              <span class="text-base text-gray-500 font-medium"
                >alvo {{ formatBRL(goal.target_amount) }}</span
              >
            </div>

            <!-- Progress Bar -->
            <div
              class="w-full bg-gray-100 rounded-full h-2.5 mt-2 overflow-hidden"
            >
              <div
                class="h-2.5 rounded-full transition-all duration-500"
                :class="[
                  goal.progress_percentage >= 100
                    ? 'bg-emerald-500'
                    : goal.progress_percentage >= 50
                      ? 'bg-blue-500'
                      : 'bg-amber-500',
                ]"
                :style="{
                  width: `${Math.min(goal.progress_percentage, 100)}%`,
                }"
              ></div>
            </div>

            <div
              class="flex items-center justify-between text-base text-gray-500 mt-1.5"
            >
              <span class="font-semibold text-gray-700"
                >{{ goal.progress_percentage }}% alcançado</span
              >
              <span v-if="goal.remaining_amount > 0"
                >Falta {{ formatBRL(goal.remaining_amount) }}</span
              >
              <span v-else class="text-emerald-600 font-semibold"
                >Meta alcançada</span
              >
            </div>
          </div>

          <!-- Details & Meta Info -->
          <div
            class="mt-4 pt-3 border-t border-gray-100 space-y-2 text-base text-gray-500"
          >
            <div
              v-if="goal.target_date"
              class="flex items-center justify-between"
            >
              <span class="flex items-center gap-1.5">
                <Calendar class="w-5 h-5 text-gray-400" />
                Data Alvo:
              </span>
              <span class="font-medium text-gray-700">{{
                formatDate(goal.target_date)
              }}</span>
            </div>

            <div
              v-if="
                goal.estimated_monthly_needed && goal.status === 'EM_ANDAMENTO'
              "
              class="flex items-center justify-between"
            >
              <span class="flex items-center gap-1.5">
                <Coins class="w-5 h-5 text-amber-500" />
                Aporte Mensal Sugerido:
              </span>
              <span class="font-semibold text-gray-900"
                >{{ formatBRL(goal.estimated_monthly_needed) }}/mês</span
              >
            </div>

            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <User class="w-5 h-5 text-gray-400" />
                Responsável:
              </span>
              <span class="font-medium text-gray-700">
                {{ goal.responsible_name || "Compartilhado" }}
              </span>
            </div>
          </div>
        </div>

        <!-- Action Footer -->
        <div class="mt-5 pt-3 border-t border-gray-100 flex items-center gap-2">
          <button
            @click="openContribution(goal)"
            class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-base font-semibold rounded-lg transition-colors"
          >
            <Coins class="w-5 h-5" />
            + Aporte / Ajuste
          </button>
          <button
            @click="openHistory(goal)"
            class="inline-flex items-center justify-center px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 text-base font-medium rounded-lg transition-colors"
            title="Ver histórico de aportes"
          >
            <History class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- History Modal -->
    <AppDialog
      v-if="showHistoryModal && historyGoal"
      @close="showHistoryModal = false"
    >
      <div class="dialog-content">
        <div
          class="flex items-center justify-between p-5 border-b border-gray-100"
        >
          <div>
            <h3 class="text-base font-bold text-gray-900">
              Histórico de aportes
            </h3>
            <p class="text-base text-gray-500 mt-0.5">{{ historyGoal.name }}</p>
          </div>
          <button
            @click="showHistoryModal = false"
            class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-5 max-h-[60vh] overflow-y-auto">
          <div v-if="loadingHistory" class="py-8 text-center text-gray-400">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"
            ></div>
          </div>
          <div
            v-else-if="contributions.length === 0"
            class="py-8 text-center text-gray-400 text-base"
          >
            Nenhuma contribuição registrada para esta meta.
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="c in contributions"
              :class="{ 'opacity-50': c.is_reversed }"
              :key="c.id"
              class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div>
                <span
                  :class="[
                    'text-sm font-bold normal-case tracking-normal px-1.5 py-0.5 rounded',
                    c.type === 'CONTRIBUICAO'
                      ? 'bg-emerald-100 text-emerald-800'
                      : c.type === 'RETIRADA'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800',
                  ]"
                >
                  {{ formatEnum(c.type) }}
                </span>
                <p class="text-base text-gray-500 mt-1">
                  {{ formatDate(c.date) }}
                  <span v-if="c.is_reversed" class="font-semibold text-red-700">
                    · Estornado</span
                  >
                </p>
                <p v-if="c.notes" class="text-base text-gray-600 italic mt-0.5">
                  {{ c.notes }}
                </p>
              </div>
              <span
                :class="[
                  'text-base font-bold',
                  c.type === 'CONTRIBUICAO'
                    ? 'text-emerald-600'
                    : c.type === 'RETIRADA'
                      ? 'text-red-600'
                      : 'text-blue-600',
                ]"
              >
                {{ c.type === "RETIRADA" ? "-" : "+" }}{{ formatBRL(c.amount) }}
              </span>
            </div>
          </div>
        </div>

        <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            @click="showHistoryModal = false"
            class="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-base font-semibold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </AppDialog>

    <!-- Modals -->
    <GoalModal
      v-if="showGoalModal"
      :goal="selectedGoal"
      @close="showGoalModal = false"
      @saved="onGoalSaved"
    />

    <GoalContributionModal
      v-if="showContributionModal && selectedGoal"
      :goal="selectedGoal"
      @close="showContributionModal = false"
      @saved="onContributionSaved"
    />
  </div>
</template>
