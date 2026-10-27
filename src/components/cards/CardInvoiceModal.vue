<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import BankLogo from "@/components/ui/BankLogo.vue";
import { parseMoney } from "@/utils/formatters";
import { format } from 'date-fns';
import AppDialog from "@/components/ui/AppDialog.vue";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
import type { Transaction } from "@/types";
import { ref, onMounted, computed, watch } from "vue";
import { api } from "@/services/api";
import type {
  CreditCard,
  FinancialAccount,
  CardInvoiceResponse,
  CardInvoiceItem,
} from "@/types";
import { formatBRL, formatDateBR } from "@/utils/formatters";
import {
  X,
  CreditCard as CardIcon,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Wallet,
  Building2,
  Tag,
  User,
  ArrowRight,
  Plus, Pencil, Trash2,
} from "lucide-vue-next";

const auth = useAuthStore();
const props = defineProps<{
  card: CreditCard;
  accounts: FinancialAccount[];
  initialPeriod?: { year: number; month: number };
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "invoice-paid"): void;
}>();

const loadingInvoices = ref(true);
const loadingDetail = ref(false);
const error = ref("");

const invoices = ref<CardInvoiceResponse[]>([]);
const selectedYear = ref<number>(new Date().getFullYear());
const selectedMonth = ref<number>(new Date().getMonth() + 1);
const activeInvoice = ref<CardInvoiceResponse | null>(null);
const showItemEditor = ref(false);
const editingItem = ref<Transaction | null>(null);
const removingItem = ref<string | null>(null);
const itemBusy = ref(false);
const canEditItems = computed(() => !!activeInvoice.value && Number(activeInvoice.value.paid_amount) === 0 && activeInvoice.value.status !== 'PAGA');
const selectedPaymentAccount = computed(() => eligibleAccounts.value.find(a => a.id === payForm.value.account_id));
const projectedBalance = computed(() => Number(selectedPaymentAccount.value?.current_balance ?? 0) - (parseMoney(payForm.value.amount) || 0));
const itemContext = computed(() => activeInvoice.value ? {
  invoiceId: activeInvoice.value.id,
  cardId: props.card.id,
  startDate: activeInvoice.value.cycle_start_date || activeInvoice.value.closing_date.slice(0, 8) + '01',
  endDate: activeInvoice.value.closing_date,
  accountId: props.card.account_id,
} : undefined);
async function openItem(item?: CardInvoiceItem) {
  if (!canEditItems.value || itemBusy.value) return;
  error.value = '';
  itemBusy.value = true;
  try {
    editingItem.value = item ? (await api.get(`/transactions/${item.id}`)).data : null;
    showItemEditor.value = true;
  } catch (err: any) { error.value = err.response?.data?.detail || 'Não foi possível abrir a compra.'; }
  finally { itemBusy.value = false; }
}
async function itemSaved() {
  showItemEditor.value = false;
  await loadInvoiceDetail(selectedYear.value, selectedMonth.value);
  emit('invoice-paid');
}
async function deleteItem() {
  if (!removingItem.value || itemBusy.value) return;
  itemBusy.value = true;
  try {
    await api.delete(`/transactions/${removingItem.value}`);
    removingItem.value = null;
    await loadInvoiceDetail(selectedYear.value, selectedMonth.value);
    emit('invoice-paid');
  } catch (err: any) { error.value = err.response?.data?.detail || 'Não foi possível excluir a compra.'; }
  finally { itemBusy.value = false; }
}

const showExternal = ref(false), externalReverse = ref(false), externalLoading = ref(false);
const externalPassword = ref(''), externalError = ref('');
const externalDate = ref(format(new Date(), 'yyyy-MM-dd'));
const externalExpected = ref(0);
const currentAlternative = computed(() => invoices.value.find(i => i.is_current && (i.year !== selectedYear.value || i.month !== selectedMonth.value)));
function openExternal(reverse = false) {
  if (!activeInvoice.value) return;
  externalReverse.value = reverse; externalPassword.value = ''; externalError.value = '';
  externalDate.value = format(new Date(), 'yyyy-MM-dd');
  externalExpected.value = Number(activeInvoice.value.total_amount);
  showExternal.value = true;
}
function closeExternal() { if (!externalLoading.value) { showExternal.value = false; externalPassword.value = ''; } }
async function confirmExternal() {
  if (externalLoading.value || !externalPassword.value) return;
  externalLoading.value = true; externalError.value = '';
  try {
    await api.post(`/cards/${props.card.id}/invoices/${selectedYear.value}/${selectedMonth.value}/external-payment${externalReverse.value ? '/reverse' : ''}`, {
      password: externalPassword.value, payment_date: externalDate.value, expected_total: externalExpected.value,
    });
    showExternal.value = false;
    await loadInvoiceDetail(selectedYear.value, selectedMonth.value);
    emit('invoice-paid');
  } catch (err: any) { externalError.value = typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível confirmar. Confira a conexão e tente novamente.'; }
  finally { externalPassword.value = ''; externalLoading.value = false; }
}

// Payment Dialog State
const showPayDialog = ref(false);
const payLoading = ref(false);
const paymentKey = ref(crypto.randomUUID());
const payError = ref("");
const payForm = ref({
  account_id: "",
  payment_date: format(new Date(), 'yyyy-MM-dd'),
  amount: "",
  notes: "",
});

const eligibleAccounts = computed(() => {
  return props.accounts.filter(
    (a) => a.is_active && ["CHECKING", "SAVINGS", "WALLET"].includes(a.account_type),
  );
});

async function fetchInvoicesOverview() {
  loadingInvoices.value = true;
  error.value = "";
  try {
    const res = await api.get(`/cards/${props.card.id}/invoices`);
    invoices.value = res.data;

    // Select current invoice or first available
    const today = new Date();
    const found =
      invoices.value.find((inv) => inv.is_current) ||
      invoices.value.find(
        (inv) =>
          inv.year === today.getFullYear() &&
          inv.month === today.getMonth() + 1,
      );
    if (props.initialPeriod) {
      selectedYear.value = props.initialPeriod.year;
      selectedMonth.value = props.initialPeriod.month;
    } else if (found) {
      selectedYear.value = found.year;
      selectedMonth.value = found.month;
    } else if (invoices.value.length > 0) {
      selectedYear.value = invoices.value[0].year;
      selectedMonth.value = invoices.value[0].month;
    }

    await loadInvoiceDetail(selectedYear.value, selectedMonth.value);
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao carregar faturas";
  } finally {
    loadingInvoices.value = false;
  }
}

async function loadInvoiceDetail(year: number, month: number) {
  selectedYear.value = year;
  selectedMonth.value = month;
  loadingDetail.value = true;
  payError.value = "";
  try {
    const res = await api.get(
      `/cards/${props.card.id}/invoices/${year}/${month}`,
    );
    activeInvoice.value = res.data;

    // Also update this invoice in the overview list
    const idx = invoices.value.findIndex(
      (inv) => inv.year === year && inv.month === month,
    );
    if (idx !== -1) {
      invoices.value[idx] = { ...invoices.value[idx], ...res.data };
    }
  } catch (err: any) {
    error.value =
      err.response?.data?.detail || "Erro ao carregar detalhes da fatura";
  } finally {
    loadingDetail.value = false;
  }
}

function openPayDialog() {
  if (!activeInvoice.value) return;
  if (eligibleAccounts.value.length > 0 && !payForm.value.account_id) {
    payForm.value.account_id = eligibleAccounts.value[0].id;
  }
  payForm.value.payment_date = format(new Date(), 'yyyy-MM-dd');
  payForm.value.amount = String(
    activeInvoice.value.remaining_amount || activeInvoice.value.total_amount,
  );
  payForm.value.notes = `Pagamento da fatura ${activeInvoice.value.period_label} do cartão ${props.card.name}`;
  payError.value = "";
  paymentKey.value = crypto.randomUUID();
  showPayDialog.value = true;
}

async function handleConfirmPayment() {
  if (payLoading.value) return;
  if (!payForm.value.account_id) {
    payError.value = "Selecione a conta bancária para débito";
    return;
  }
  const amountNum = parseMoney(payForm.value.amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    payError.value = "Informe um valor válido de pagamento";
    return;
  }

  payLoading.value = true;
  payError.value = "";
  try {
    await api.post(
      `/cards/${props.card.id}/invoices/${selectedYear.value}/${selectedMonth.value}/pay`,
      {
        account_id: payForm.value.account_id,
        payment_date: payForm.value.payment_date,
        amount: amountNum,
        notes: payForm.value.notes,
      },
      { headers: { "Idempotency-Key": paymentKey.value } },
    );

    showPayDialog.value = false;
    emit("invoice-paid");
    await fetchInvoicesOverview();
  } catch (err: any) {
    payError.value =
      err.response?.data?.detail || "Erro ao registrar pagamento da fatura";
  } finally {
    payLoading.value = false;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "PAGA":
      return {
        label: "Paga",
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "FECHADA":
      return {
        label: "Fechada",
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        icon: Clock,
      };
    case "VENCIDA":
      return {
        label: "Vencida",
        bg: "bg-red-50 text-red-700 border-red-200",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "Aberta",
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        icon: Calendar,
      };
  }
}

onMounted(() => {
  fetchInvoicesOverview();
});
</script>

<template>
  <AppDialog wide @close="emit('close')">
    <div class="dialog-content">
      <!-- Modal Header -->
      <div
        class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70"
      >
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
            :style="{ background: card.color || '#1e293b' }"
          >
            <BankLogo :name="card.bank_name || card.name" :size="36"/>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-xl font-bold text-gray-900 leading-tight">
                Faturas do cartão
              </h2>
              <span
                class="text-base font-semibold px-2 py-0.5 rounded bg-gray-200/70 text-gray-700"
              >
                {{ card.name }} (••{{ card.last_digits || "0000" }})
              </span>
            </div>
            <p class="text-base text-gray-500">
              Fechamento todo dia {{ card.closing_day }} • Vencimento todo dia
              {{ card.due_day }}
            </p>
          </div>
        </div>

        <button
          @click="emit('close')"
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Month Tabs Slider / Selector -->
      <div
        class="border-b border-gray-100 bg-gray-50/30 px-6 py-2 overflow-x-auto"
      >
        <div class="flex items-center gap-2 min-w-max">
          <button
            v-for="inv in invoices"
            :key="`${inv.year}-${inv.month}`"
            @click="loadInvoiceDetail(inv.year, inv.month)"
            :class="[
              'px-3.5 py-2 rounded-xl text-base font-medium transition-all flex items-center gap-2.5 border',
              selectedYear === inv.year && selectedMonth === inv.month
                ? 'bg-white border-emerald-500 text-emerald-800 shadow-xs font-semibold ring-1 ring-emerald-500/20'
                : 'bg-white/60 border-gray-200/80 text-gray-600 hover:bg-white hover:border-gray-300',
            ]"
          >
            <span class="capitalize"
              >{{ inv.period_label.split("/")[0].trim().substring(0, 3) }}/{{
                inv.year.toString().slice(-2)
              }}</span
            >
            <span
              v-if="inv.is_current"
              class="text-sm normal-case px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold"
              >Atual</span
            >
            <span class="font-bold">{{ formatBRL(inv.total_amount) }}</span>
            <span
              class="w-2 h-2 rounded-full"
              :class="[
                inv.status === 'PAGA'
                  ? 'bg-emerald-500'
                  : inv.status === 'VENCIDA'
                    ? 'bg-red-500'
                    : inv.status === 'FECHADA'
                      ? 'bg-amber-500'
                      : 'bg-blue-500',
              ]"
              :title="inv.status"
            ></span>
          </button>
        </div>
      </div>

      <!-- Invoice Detail Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Loading State -->
        <div
          v-if="loadingInvoices || loadingDetail"
          class="py-16 text-center text-gray-400"
        >
          <div
            class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-3"
          ></div>
          <p class="text-base">Carregando informações da fatura...</p>
        </div>

        <!-- Invoice Details View -->
        <template v-else-if="activeInvoice">
          <!-- Active Invoice Card Summary -->
          <div
            class="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
          >
            <div
              class="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5 pointer-events-none"
            ></div>

            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10"
            >
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span
                    class="text-base font-bold normal-case tracking-normal text-slate-300"
                  >
                    Fatura {{ activeInvoice.period_label }}
                  </span>
                  <!-- Badge Status -->
                  <span
                    :class="[
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-semibold border',
                      getStatusBadge(activeInvoice.status).bg,
                    ]"
                  >
                    <component
                      :is="getStatusBadge(activeInvoice.status).icon"
                      class="w-3.5 h-3.5"
                    />
                    {{ getStatusBadge(activeInvoice.status).label }}
                  </span>
                </div>

                <div class="flex items-baseline gap-3">
                  <span class="text-3xl font-extrabold tracking-tight">
                    {{ formatBRL(activeInvoice.total_amount) }}
                  </span>
                  <span
                    v-if="
                      activeInvoice.status !== 'PAGA' &&
                      Number(activeInvoice.paid_amount) > 0
                    "
                    class="text-base text-slate-300"
                  >
                    (Pago: {{ formatBRL(activeInvoice.paid_amount) }})
                  </span>
                </div>

                <div
                  class="flex flex-wrap items-center gap-4 text-base text-slate-300 pt-1"
                >
                  <div class="flex items-center gap-1.5">
                    <Calendar class="w-5 h-5 text-slate-400" />
                    <span
                      >Fechamento:
                      <strong>{{
                        formatDateBR(activeInvoice.closing_date)
                      }}</strong></span
                    >
                  </div>
                  <div class="flex items-center gap-1.5">
                    <CalendarCheck class="w-5 h-5 text-amber-400" />
                    <span
                      >Vencimento:
                      <strong class="text-white">{{
                        formatDateBR(activeInvoice.due_date)
                      }}</strong></span
                    >
                  </div>
                </div>

                <!-- Payment Info if Paid -->
                <div
                  v-if="activeInvoice.status === 'PAGA'"
                  class="pt-2 flex items-center gap-2 text-base text-emerald-400 font-medium"
                >
                  <CheckCircle2 class="w-5 h-5" />
                  <span>
                    Fatura liquidada em
                    {{ formatDateBR(activeInvoice.payment_date || "") }}
                    <span v-if="activeInvoice.payment_account_name && !activeInvoice.external_settled"
                      >via {{ activeInvoice.payment_account_name }}</span
                    >
                  </span>
                </div>
              </div>

              <div v-if="activeInvoice.external_settled" class="space-y-3"><p class="text-base">Pagamento confirmado fora do Prumo. Nenhum novo débito bancário foi criado.</p><button v-if="auth.canManage" type="button" class="ui-button" @click="openExternal(true)">Desfazer confirmação</button></div>
              <!-- Action Button: Pay Invoice -->
              <div
                v-if="activeInvoice.status !== 'PAGA'"
                class="flex flex-col gap-2 min-w-[180px]"
              >
                <button
                  @click="openPayDialog"
                  :disabled="Number(activeInvoice.total_amount) <= 0"
                  class="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-base shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Wallet class="w-5 h-5" />
                  Pagar fatura
                </button>
                <p class="text-sm text-center text-slate-400">Debita da conta bancária e libera limite</p><button v-if="auth.canManage" type="button" class="ui-button" @click="openExternal()">Já paguei</button><p v-if="auth.canManage" class="text-sm text-slate-300 text-center">Confirma um pagamento externo, sem descontar o saldo novamente.</p>
              </div>
            </div>
          </div>

          <section class="context-message my-5"><p>Esta fatura reúne compras de <strong>{{ formatDateBR(activeInvoice.cycle_start_date) }}</strong> até <strong>{{ formatDateBR(activeInvoice.closing_date) }}</strong>, com vencimento em <strong>{{ formatDateBR(activeInvoice.due_date) }}</strong>.</p><p v-if="!activeInvoice.items_count">Nenhuma compra está vinculada a este período. O saldo zero não confirma que uma fatura antiga foi paga.</p><button v-if="currentAlternative" type="button" class="ui-button mt-3" @click="loadInvoiceDetail(currentAlternative.year, currentAlternative.month)">Ver fatura atual: {{ currentAlternative.period_label }} · {{ formatBRL(currentAlternative.total_amount) }}</button></section>
          <!-- Items Breakdown List -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <h3
                class="text-base font-bold text-gray-900 flex items-center gap-2"
              >
                <Receipt class="w-5 h-5 text-gray-500" />
                Lançamentos da fatura
                <span
                  class="text-base px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
                >
                  {{ activeInvoice.items.length }}
                </span>
              </h3>
              <button v-if="canEditItems" type="button" class="ui-button primary" :disabled="itemBusy" @click="openItem()"><Plus :size="18" />Adicionar compra</button>
            </div>
            <p v-if="!canEditItems" class="field-help mb-4">Esta fatura já recebeu pagamento. Suas compras ficam protegidas para preservar o histórico.</p>
            <p class="field-help mb-4">Compras à vista podem ser editadas ou excluídas aqui antes do primeiro pagamento. Gerencie parcelas em Parcelamentos.</p>
            <div v-if="removingItem" class="context-message mb-4" role="alert">
              <p>Excluir esta compra? Ela sairá da fatura e dos lançamentos.</p>
              <button type="button" class="ui-button" @click="removingItem = null">Cancelar</button>
              <button type="button" class="ui-button primary" :disabled="itemBusy" @click="deleteItem">Confirmar exclusão</button>
            </div>

            <!-- Empty Items State -->
            <div
              v-if="activeInvoice.items.length === 0"
              class="border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 bg-gray-50/50"
            >
              <Receipt class="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p class="text-base font-medium text-gray-600">
                Nenhum lançamento registrado nesta fatura
              </p>
              <p class="text-base text-gray-400 mt-1">
                Compras feitas no crédito entre o ciclo de fechamento aparecerão
                aqui automaticamente.
              </p>
            </div>

            <!-- Items Table/List -->
            <div
              v-else
              class="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white shadow-xs"
            >
              <div
                v-for="item in activeInvoice.items"
                :key="item.id"
                class="p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <div class="flex items-center gap-3.5">
                  <div
                    class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-base font-bold"
                    :style="{ background: item.category_color || '#64748b' }"
                  >
                    {{
                      item.category_name
                        ? item.category_name.substring(0, 2).toUpperCase()
                        : "CC"
                    }}
                  </div>

                  <div>
                    <div class="flex items-center gap-2">
                      <p class="text-base font-semibold text-gray-900">
                        {{ item.description }}
                      </p>
                      <span
                        v-if="item.is_installment"
                        class="text-sm font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {{ item.installment_text }}
                      </span>
                    </div>

                    <div
                      class="flex items-center gap-3 text-base text-gray-400 mt-0.5"
                    >
                      <span>{{ formatDateBR(item.date) }}</span>
                      <span>•</span>
                      <span v-if="item.category_name" class="text-gray-600">{{
                        item.category_name
                      }}</span>
                      <span v-if="item.category_name">•</span>
                      <span
                        class="inline-flex items-center gap-1 text-gray-500"
                      >
                        <User class="w-3 h-3" />
                        {{ item.responsible_name }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right">
                  <div v-if="canEditItems && !item.is_installment" class="flex gap-2 justify-end mb-2">
                    <button type="button" class="icon-button" :aria-label="`Editar ${item.description}`" :disabled="itemBusy" @click="openItem(item)"><Pencil :size="18" /></button>
                    <button type="button" class="icon-button" :aria-label="`Excluir ${item.description}`" :disabled="itemBusy" @click="removingItem = item.id"><Trash2 :size="18" /></button>
                  </div>
                  <span class="text-base font-bold text-gray-900 block">
                    {{ formatBRL(item.amount) }}
                  </span>
                  <span
                    class="text-sm font-medium"
                    :class="
                      item.status === 'PAGA'
                        ? 'text-emerald-600'
                        : 'text-gray-400'
                    "
                  >
                    {{
                      item.status === "PAGA"
                        ? "Liquidado"
                        : "Aguardando pagamento"
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div
        class="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-base text-gray-500"
      >
        <span
          >O pagamento da fatura cria a transação de liquidação bancária sem
          duplicar suas despesas nos relatórios.</span
        >
        <button
          @click="emit('close')"
          class="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 font-semibold rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>

    <!-- SUB-MODAL: PAGAR FATURA -->
    <AppDialog v-if="showPayDialog" @close="showPayDialog = false">
      <div class="dialog-content">
        <div
          class="flex items-center justify-between border-b border-gray-100 pb-4"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center"
            >
              <Wallet class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-gray-900">Pagar fatura</h3>
              <p class="text-base text-gray-500">
                {{ card.name }} • {{ activeInvoice?.period_label }}
              </p>
            </div>
          </div>
          <button
            @click="showPayDialog = false"
            class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <form @submit.prevent="handleConfirmPayment" class="mt-4 space-y-4">
          <!-- Error Alert -->
          <div
            v-if="payError"
            class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-base flex items-center gap-2"
          >
            <AlertTriangle class="w-5 h-5 flex-shrink-0" />
            <span>{{ payError }}</span>
          </div>

          <!-- Total Due Callout -->
          <div
            class="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between"
          >
            <span class="text-base font-medium text-gray-600"
              >Total a pagar:</span
            >
            <span class="text-xl font-bold text-gray-900">{{
              formatBRL(
                activeInvoice?.remaining_amount ||
                  activeInvoice?.total_amount ||
                  0,
              )
            }}</span>
          </div>

          <!-- Select Bank Account -->
          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1">
              Debitar de qual Conta Bancária? *
            </label>
            <select
              v-model="payForm.account_id"
              required
              class="w-full text-base rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 py-2.5 px-3 bg-white"
            >
              <option value="" disabled>Selecione uma conta...</option>
              <option
                v-for="acc in eligibleAccounts"
                :key="acc.id"
                :value="acc.id"
              >
                {{ acc.name }} (Saldo:
                {{ formatBRL(acc.current_balance ?? acc.initial_balance) }})
              </option>
            </select>
          </div>

          <!-- Payment Date & Amount -->
          <div v-if="selectedPaymentAccount" class="context-message" role="status">
            <p>Saldo após este pagamento: <strong>{{ formatBRL(projectedBalance) }}</strong>.
              <span v-if="projectedBalance < 0"> Faltam {{ formatBRL(-projectedBalance) }} nesta conta. Você pode fazer pagamentos parciais usando contas diferentes.</span>
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1">
                Data do Pagamento *
              </label>
              <input
                v-model="payForm.payment_date"
                type="date"
                required
                class="w-full text-base rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 py-2 px-3"
              />
            </div>

            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1">
                Valor Pago (R$) *
              </label>
              <input
                v-model="payForm.amount"
                type="text"
                required
                placeholder="0,00"
                class="w-full text-base rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 py-2 px-3"
              />
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1">
              Observações
            </label>
            <input
              v-model="payForm.notes"
              type="text"
              placeholder="Ex: Pagamento integral via Nubank"
              class="w-full text-base rounded-lg border-gray-300 focus:border-emerald-500 focus:ring-emerald-500 py-2 px-3"
            />
          </div>

          <!-- Submit Buttons -->
          <div
            class="flex items-center justify-end gap-3 pt-3 border-t border-gray-100"
          >
            <button
              type="button"
              @click="showPayDialog = false"
              class="px-4 py-2 text-base font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              :disabled="payLoading"
              class="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCircle2 class="w-5 h-5" />
              {{ payLoading ? "Processando..." : "Confirmar pagamento" }}
            </button>
          </div>
        </form>
      </div>
    </AppDialog>
    <AppDialog v-if="showExternal" class="external-payment-dialog" @close="closeExternal"><form class="p-6 sm:p-8 space-y-5 w-full max-w-lg" @submit.prevent="confirmExternal"><h2 class="text-2xl font-bold">{{ externalReverse ? 'Desfazer confirmação externa' : 'Já paguei esta fatura' }}</h2><p>{{ activeInvoice?.period_label }} · {{ card.name }}</p><p>Esta ação {{ externalReverse ? 'reabre a pendência' : 'confirma que o pagamento já aconteceu fora do Prumo' }}. O saldo das contas bancárias permanece igual.</p><p v-if="!externalReverse && externalExpected === 0" class="context-message">Não há compras cadastradas neste mês. Você confirma apenas o encerramento desta fatura; o valor histórico pago não será reconstruído.</p><p v-else-if="!externalReverse">Valor restante a conciliar: <strong>{{ formatBRL(activeInvoice?.remaining_amount || 0) }}</strong>.</p><div v-if="externalError" class="form-error" role="alert">{{ externalError }}</div><div v-if="!externalReverse"><label for="external-payment-date" class="block font-semibold mb-2">Quando você pagou?</label><input id="external-payment-date" v-model="externalDate" type="date" :max="format(new Date(), 'yyyy-MM-dd')" required class="w-full border rounded-lg p-3" /></div><div><label for="external-payment-password" class="block font-semibold mb-2">Senha da sua conta no Prumo</label><input id="external-payment-password" v-model="externalPassword" type="password" autocomplete="current-password" maxlength="128" required :disabled="externalLoading" class="w-full border rounded-lg p-3" /><p class="field-help mt-2">Use a senha da conta conectada, {{ auth.user?.email }}.</p></div><label class="flex gap-3 items-start"><input type="checkbox" required class="mt-1 w-5 h-5" :disabled="externalLoading" /><span>{{ externalReverse ? 'Conferi e quero reabrir esta fatura.' : 'Conferi no banco que esta fatura já está totalmente paga.' }}</span></label><div class="flex flex-wrap justify-end gap-3"><button type="button" class="ui-button" :disabled="externalLoading" @click="closeExternal">Cancelar</button><button type="submit" class="ui-button primary" :disabled="externalLoading">{{ externalLoading ? 'Confirmando…' : externalReverse ? 'Desfazer confirmação' : 'Confirmar que já paguei' }}</button></div></form></AppDialog>
    <TransactionModal v-if="showItemEditor" :transaction="editingItem" :invoice-context="itemContext" @close="showItemEditor = false" @saved="itemSaved" />
  </AppDialog>
</template>

<style scoped>.external-payment-dialog { width: min(560px, calc(100vw - 40px)); }</style>
