<script setup lang="ts">
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type {
  InstallmentPlan,
  Installment,
  InstallmentCalendarMonth,
} from "@/types";
import { formatBRL, formatDateBR } from "@/utils/formatters";
import InstallmentModal from "@/components/installments/InstallmentModal.vue";
import InstallmentPayModal from "@/components/installments/InstallmentPayModal.vue";
import {
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  CreditCard,
  AlertCircle,
} from "lucide-vue-next";

const loading = ref(false);
const loadError = ref("");
const plans = ref<InstallmentPlan[]>([]);
const calendarMonths = ref<InstallmentCalendarMonth[]>([]);
const expandedPlanId = ref<string | null>(null);

const showCreateModal = ref(false);
const showPayModal = ref(false);
const payingInstallment = ref<Installment | null>(null);
const payingPlanDescription = ref("");

async function loadPlans() {
  loading.value = true;
  loadError.value = "";
  try {
    const [plansRes, calRes] = await Promise.all([
      api.get("/installments/"),
      api.get("/installments/calendar/overview?months_ahead=6"),
    ]);
    plans.value = plansRes.data;
    calendarMonths.value = calRes.data;
  } catch (err) {
    loadError.value =
      "Não foi possível carregar seus parcelamentos. Tente novamente.";
  } finally {
    loading.value = false;
  }
}

function toggleExpand(id: string) {
  expandedPlanId.value = expandedPlanId.value === id ? null : id;
}

function openPay(plan: InstallmentPlan, inst: Installment) {
  payingPlanDescription.value = plan.description;
  payingInstallment.value = inst;
  showPayModal.value = true;
}

async function cancelPlan(plan: InstallmentPlan) {
  if (
    !(await feedback.confirm(
      `Deseja cancelar o parcelamento "${plan.description}"? As parcelas pendentes serão canceladas, e as já pagas serão preservadas.`,
    ))
  ) {
    return;
  }
  try {
    await api.post(`/installments/${plan.id}/cancel`);
    loadPlans();
  } catch (err) {
    feedback.notify("Erro ao cancelar parcelamento");
  }
}

onMounted(() => {
  loadPlans();
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="loadError" class="context-message error" role="alert">
      <p>{{ loadError }}</p>
      <button @click="loadPlans">Tentar novamente</button>
    </div>
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Parcelamentos
        </h1>
        <p class="text-base text-slate-500">
          Gerencie parcelamentos de cartão, carnês e compromissos futuros
        </p>
      </div>

      <button
        @click="showCreateModal = true"
        class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
      >
        <Plus class="h-5 w-5" />
        Novo parcelamento
      </button>
    </div>

    <!-- Calendar Projection (Next 6 Months) -->
    <div class="rounded-2xl bg-white p-5 shadow-2xs border border-slate-200/80">
      <div class="flex items-center gap-2 mb-4">
        <Calendar class="h-5 w-5 text-emerald-600" />
        <h2 class="text-base font-bold text-slate-900">
          Compromisso dos próximos meses
        </h2>
      </div>

      <div
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3"
      >
        <div
          v-for="m in calendarMonths"
          :key="`${m.year}-${m.month}`"
          class="rounded-xl border border-slate-200/70 p-3 bg-slate-50/50 flex flex-col justify-between"
        >
          <div>
            <span
              class="text-sm font-bold normal-case tracking-normal text-slate-400"
            >
              {{
                [
                  "Jan",
                  "Fev",
                  "Mar",
                  "Abr",
                  "Mai",
                  "Jun",
                  "Jul",
                  "Ago",
                  "Set",
                  "Out",
                  "Nov",
                  "Dez",
                ][m.month - 1]
              }}
              / {{ m.year }}
            </span>
            <p class="text-base font-extrabold text-slate-900 mt-1">
              {{ formatBRL(m.total_due) }}
            </p>
          </div>
          <div class="mt-2 text-sm text-slate-500 space-y-0.5">
            <div class="flex justify-between">
              <span>Pago:</span>
              <span class="font-semibold text-emerald-600">{{
                formatBRL(m.total_paid)
              }}</span>
            </div>
            <div class="flex justify-between">
              <span>Pendente:</span>
              <span class="font-semibold text-amber-600">{{
                formatBRL(m.total_pending)
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Installment Plans List -->
    <div class="space-y-4">
      <h2 class="text-base font-bold text-slate-900">Seus parcelamentos</h2>

      <div
        v-if="plans.length === 0 && !loading"
        class="rounded-2xl bg-white p-12 text-center text-base text-slate-400 border border-slate-200/80"
      >
        Nenhum parcelamento ativo cadastrado.
      </div>

      <div
        v-for="plan in plans"
        :key="plan.id"
        class="rounded-2xl bg-white p-5 shadow-2xs border border-slate-200/80 space-y-4"
      >
        <!-- Card Top Details -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-900">
                {{ plan.description }}
              </h3>
              <span
                class="rounded-full px-2 py-0.5 text-sm font-semibold"
                :class="{
                  'bg-emerald-50 text-emerald-700 border border-emerald-200':
                    plan.status === 'COMPLETED',
                  'bg-blue-50 text-blue-700 border border-blue-200':
                    plan.status === 'ACTIVE',
                  'bg-slate-100 text-slate-600 border border-slate-200':
                    plan.status === 'CANCELLED',
                }"
              >
                {{
                  plan.status === "ACTIVE"
                    ? "Ativo"
                    : plan.status === "COMPLETED"
                      ? "Concluído"
                      : "Cancelado"
                }}
              </span>
            </div>
            <p class="text-base text-slate-500 mt-0.5">
              {{ plan.category_name }} • {{ plan.responsible_name }} • Compra em
              {{ formatDateBR(plan.purchase_date) }}
            </p>
          </div>

          <!-- Total & Remaining Badges -->
          <div class="flex items-center gap-4 text-right">
            <div>
              <span class="text-sm text-slate-400 font-medium">Total:</span>
              <p class="text-base font-bold text-slate-900">
                {{ formatBRL(plan.total_amount) }}
              </p>
            </div>
            <div>
              <span class="text-sm text-slate-400 font-medium">Restante:</span>
              <p class="text-base font-bold text-red-600">
                {{ formatBRL(plan.remaining_amount) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div>
          <div class="flex justify-between text-base text-slate-500 mb-1">
            <span>Progresso do pagamento</span>
            <span
              >{{ formatBRL(plan.paid_amount) }} de
              {{ formatBRL(plan.total_amount) }} ({{
                Math.round((plan.paid_amount / plan.total_amount) * 100)
              }}%)</span
            >
          </div>
          <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-600 rounded-full transition-all"
              :style="{
                width: `${Math.min(100, (plan.paid_amount / plan.total_amount) * 100)}%`,
              }"
            />
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div
          class="flex items-center justify-between pt-2 border-t border-slate-100"
        >
          <button
            @click="toggleExpand(plan.id)"
            class="inline-flex items-center gap-1 text-base font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>{{
              expandedPlanId === plan.id
                ? "Ocultar parcelas"
                : `Ver todas as ${plan.installments_count} parcelas`
            }}</span>
            <component
              :is="expandedPlanId === plan.id ? ChevronUp : ChevronDown"
              class="h-4 w-4"
            />
          </button>

          <button
            v-if="plan.status === 'ACTIVE'"
            @click="cancelPlan(plan)"
            class="text-base font-semibold text-slate-400 hover:text-red-600 transition-colors"
          >
            Cancelar parcelamento
          </button>
        </div>

        <!-- Expanded Installments List -->
        <div
          v-if="expandedPlanId === plan.id"
          class="pt-3 border-t border-slate-100"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div
              v-for="inst in plan.installments"
              :key="inst.id"
              class="rounded-lg p-3 border text-base flex items-center justify-between"
              :class="{
                'bg-emerald-50/50 border-emerald-200': inst.status === 'PAGA',
                'bg-white border-slate-200': inst.status === 'PENDENTE',
                'bg-slate-50 border-slate-200 text-slate-400':
                  inst.status === 'CANCELADA',
              }"
            >
              <div>
                <p class="font-bold text-slate-900">
                  Parcela {{ inst.installment_number }}/{{
                    plan.installments_count
                  }}
                </p>
                <p class="text-slate-500 text-sm">
                  Vence: {{ formatDateBR(inst.due_date) }}
                </p>
                <p class="font-extrabold text-slate-800 mt-1">
                  {{ formatBRL(inst.amount) }}
                </p>
              </div>

              <div>
                <span
                  v-if="inst.status === 'PAGA'"
                  class="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-sm font-bold text-emerald-800"
                >
                  <CheckCircle class="h-3 w-3" /> Paga
                </span>
                <button
                  v-else-if="inst.status === 'PENDENTE'"
                  @click="openPay(plan, inst)"
                  class="rounded bg-emerald-600 px-2.5 py-1 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                >
                  Pagar
                </button>
                <span v-else class="text-sm font-semibold text-slate-400"
                  >Cancelada</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <InstallmentModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @saved="loadPlans"
    />

    <InstallmentPayModal
      v-if="showPayModal && payingInstallment"
      :installment="payingInstallment"
      :plan-description="payingPlanDescription"
      @close="
        showPayModal = false;
        payingInstallment = null;
      "
      @paid="loadPlans"
    />
  </div>
</template>
