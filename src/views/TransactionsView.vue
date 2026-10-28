<script setup lang="ts">
import TransactionCardInfo from "@/components/transactions/TransactionCardInfo.vue";
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { useRoute } from "vue-router";
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { api } from "@/services/api";
import type {
  Category,
  FinancialAccount,
  ResponsiblePerson,
  Transaction,
  TransactionSummary,
} from "@/types";
import { formatBRL, formatDateBR } from "@/utils/formatters";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
import {
  Search,
  Filter,
  Download,
  Plus,
  Copy,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
} from "lucide-vue-next";

const loading = ref(false);
const loadError = ref("");
const transactions = ref<Transaction[]>([]);
const totalCount = ref(0);
const summary = ref<TransactionSummary | null>(null);

// Filters
const route = useRoute();
const search = ref("");
const selectedType = ref(
  typeof route.query.type === "string" ? route.query.type : "",
);
const selectedCategoryId = ref(
  typeof route.query.category_id === "string" ? route.query.category_id : "",
);
const selectedAccountId = ref("");
const selectedResponsible = ref("");
const selectedStatus = ref(
  typeof route.query.status === "string" ? route.query.status : "",
);
const startDate = ref("");
const endDate = ref("");
const page = ref(1);
const limit = 50;

// Data sources
const categories = ref<Category[]>([]);
const accounts = ref<FinancialAccount[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);

// Modal state
const showModal = ref(false);
const editingTransaction = ref<Transaction | null>(null);

async function loadFilterOptions() {
  try {
    const [catRes, accRes, respRes] = await Promise.all([
      api.get("/settings/categories"),
      api.get("/settings/accounts"),
      api.get("/settings/responsibles"),
    ]);
    categories.value = catRes.data;
    accounts.value = accRes.data;
    responsibles.value = respRes.data;
  } catch (err) {
    console.error("Error loading filters", err);
  }
}

const selectedIds = ref<string[]>([]);
const bulkResponsible = ref("");
const bulkStatus = ref("");
const bulkSaving = ref(false);
const bulkError = ref("");
const allVisibleSelected = computed(() => transactions.value.length > 0 && transactions.value.every(t => selectedIds.value.includes(t.id)));
function toggleVisible() {
  selectedIds.value = allVisibleSelected.value ? [] : transactions.value.map(t => t.id);
}
async function applyBulk() {
  if (bulkSaving.value || !selectedIds.value.length || (!bulkResponsible.value && !bulkStatus.value)) return;
  const rows = transactions.value.filter(t => selectedIds.value.includes(t.id));
  const changes = [bulkResponsible.value ? `Responsável: ${bulkResponsible.value}` : '', bulkStatus.value ? `Situação: ${bulkStatus.value === 'REALIZADA' ? 'Concluída' : bulkStatus.value === 'PENDENTE' ? 'Pendente' : 'Vencida'}` : ''].filter(Boolean).join('. ');
  if (!(await feedback.confirm(`Alterar ${rows.length} lançamentos? ${changes}. No crédito, isso não registra pagamento da fatura. Saldos de contas podem mudar ao alterar a situação.`))) return;
  bulkSaving.value = true;
  bulkError.value = '';
  try {
    const res = await api.post('/transactions/bulk', {
      items: rows.map(t => ({id: t.id, updated_at: t.updated_at})),
      ...(bulkResponsible.value ? {responsible_name: bulkResponsible.value} : {}),
      ...(bulkStatus.value ? {status: bulkStatus.value} : {}),
    });
    feedback.notify(`${res.data.updated} lançamentos atualizados`, "success");
    bulkResponsible.value = ''; bulkStatus.value = '';
    await loadTransactions();
  } catch (err: any) {
    bulkError.value = typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível aplicar as alterações. Confira a lista antes de tentar novamente.';
  } finally { bulkSaving.value = false; }
}

async function loadTransactions() {
  selectedIds.value = [];

  loading.value = true;
  loadError.value = "";
  try {
    const params: Record<string, any> = {
      skip: (page.value - 1) * limit,
      limit: limit,
    };
    if (search.value) params.search = search.value;
    if (selectedType.value) params.type = selectedType.value;
    if (selectedCategoryId.value) params.category_id = selectedCategoryId.value;
    if (selectedAccountId.value) params.account_id = selectedAccountId.value;
    if (selectedResponsible.value)
      params.responsible_name = selectedResponsible.value;
    if (selectedStatus.value) params.status = selectedStatus.value;
    if (startDate.value) params.start_date = startDate.value;
    if (endDate.value) params.end_date = endDate.value;

    const res = await api.get("/transactions/", { params });
    transactions.value = res.data.items;
    totalCount.value = res.data.total;
    summary.value = res.data.summary;
  } catch (err) {
    loadError.value =
      "Não foi possível carregar os lançamentos. Tente novamente.";
  } finally {
    loading.value = false;
  }
}

async function handleDelete(t: Transaction) {
  if (
    !(await feedback.confirm(
      `Deseja realmente excluir a transação "${t.description}"?`,
    ))
  )
    return;
  try {
    await api.delete(`/transactions/${t.id}`);
    loadTransactions();
  } catch (err) {
    feedback.notify("Erro ao excluir transação");
  }
}

async function handleDuplicate(t: Transaction) {
  try {
    await api.post(`/transactions/${t.id}/duplicate`);
    loadTransactions();
  } catch (err) {
    feedback.notify("Erro ao duplicar transação");
  }
}

function handleExportCSV() {
  const query = new URLSearchParams();
  if (selectedType.value) query.append("type", selectedType.value);
  if (selectedCategoryId.value)
    query.append("category_id", selectedCategoryId.value);
  if (selectedAccountId.value)
    query.append("account_id", selectedAccountId.value);
  if (selectedResponsible.value)
    query.append("responsible_name", selectedResponsible.value);
  if (selectedStatus.value) query.append("status", selectedStatus.value);
  if (startDate.value) query.append("start_date", startDate.value);
  if (endDate.value) query.append("end_date", endDate.value);

  const token = localStorage.getItem("msfinancas_token");
  const familyId = localStorage.getItem("msfinancas_family_id");
  const baseUrl =
    import.meta.env.VITE_API_URL || "http://localhost:8001/api/v1";

  // Trigger download with headers via fetch blob
  fetch(`${baseUrl}/transactions/export/csv?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Family-Id": familyId || "",
    },
  })
    .then((res) => res.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `msfinancas_transacoes_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(() => feedback.notify("Erro ao exportar CSV"));
}

watch(
  [
    selectedType,
    selectedCategoryId,
    selectedAccountId,
    selectedResponsible,
    selectedStatus,
    startDate,
    endDate,
  ],
  () => {
    page.value = 1;
    loadTransactions();
  },
);

let debounceTimer: any;
function onSearchInput() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    loadTransactions();
  }, 350);
}

onUnmounted(() => clearTimeout(debounceTimer));

onMounted(() => {
  loadFilterOptions();
  loadTransactions();
});
</script>

<template>
  <div class="space-y-6">
    <div v-if="loadError" class="context-message error" role="alert">
      <p>{{ loadError }}</p>
      <button @click="loadTransactions">Tentar novamente</button>
    </div>
    <div class="page-heading">
      <h1>Lançamentos</h1>
      <p>
        Receitas, despesas e transferências do espaço ativo. Use os filtros para
        encontrar um lançamento.
      </p>
    </div>
    <!-- Summary Header Cards based on Applied Filters -->
    <div
      v-if="summary"
      class="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-5"
    >
      <div
        class="rounded-xl bg-white p-3.5 shadow-2xs border border-slate-200/80"
      >
        <span class="text-sm font-semibold text-slate-400"
          >Receitas recebidas</span
        >
        <p class="text-xl font-bold text-emerald-600 mt-1">
          {{ formatBRL(summary.total_realized_income) }}
        </p>
      </div>

      <div
        class="rounded-xl bg-white p-3.5 shadow-2xs border border-slate-200/80"
      >
        <span class="text-sm font-semibold text-slate-400">Despesas pagas</span>
        <p class="text-xl font-bold text-red-600 mt-1">
          {{ formatBRL(summary.total_realized_expense) }}
        </p>
      </div>

      <div
        class="rounded-xl bg-white p-3.5 shadow-2xs border border-slate-200/80"
      >
        <span class="text-sm font-semibold text-slate-400"
          >Resultado do período</span
        >
        <p
          class="text-xl font-bold mt-1"
          :class="
            summary.realized_net >= 0 ? 'text-emerald-700' : 'text-red-700'
          "
        >
          {{ formatBRL(summary.realized_net) }}
        </p>
      </div>

      <div
        class="rounded-xl bg-white p-3.5 shadow-2xs border border-slate-200/80"
      >
        <span class="text-sm font-semibold text-slate-400"
          >Despesas pendentes</span
        >
        <p class="text-xl font-bold text-amber-600 mt-1">
          {{ formatBRL(summary.total_pending_expense) }}
        </p>
      </div>
    </div>

    <!-- Filters & Action Toolbar -->
    <div
      class="rounded-2xl bg-white p-4 shadow-2xs border border-slate-200/80 space-y-3"
    >
      <div class="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <!-- Search Input -->
        <div class="relative w-full sm:w-80">
          <Search
            class="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400"
          />
          <input
            v-model="search"
            @input="onSearchInput"
            type="text"
            placeholder="Buscar por descrição ou notas..."
            class="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            @click="handleExportCSV"
            class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download class="h-5 w-5 text-slate-500" />
            Exportar CSV
          </button>

          <button
            @click="
              editingTransaction = null;
              showModal = true;
            "
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <Plus class="h-5 w-5" />
            Novo lançamento
          </button>
        </div>
      </div>

      <!-- Advanced Filters row -->
      <div
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 pt-2 border-t border-slate-100"
      >
        <div>
          <label
            class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
            >Tipo</label
          >
          <select
            v-model="selectedType"
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-base text-slate-800 outline-none"
          >
            <option value="">Todos os tipos</option>
            <option value="DESPESA">Despesa</option>
            <option value="RECEITA">Receita</option>
            <option value="TRANSFERENCIA">Transferência</option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
            >Categoria</label
          >
          <select
            v-model="selectedCategoryId"
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-base text-slate-800 outline-none"
          >
            <option value="">Todas as categorias</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">
              {{ c.name }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
            >Conta</label
          >
          <select
            v-model="selectedAccountId"
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-base text-slate-800 outline-none"
          >
            <option value="">Todas as contas</option>
            <option v-for="a in accounts" :key="a.id" :value="a.id">
              {{ a.name }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
            >Responsável</label
          >
          <select
            v-model="selectedResponsible"
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-base text-slate-800 outline-none"
          >
            <option value="">Todos</option>
            <option v-for="r in responsibles" :key="r.id" :value="r.name">
              {{ r.name }}
            </option>
          </select>
        </div>

        <div>
          <label
            class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
            >Status</label
          >
          <select
            v-model="selectedStatus"
            class="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-base text-slate-800 outline-none"
          >
            <option value="">Todos</option>
            <option value="REALIZADA">Realizada</option>
            <option value="PENDENTE">Pendente</option>
            <option value="VENCIDA">Vencida</option>
          </select>
        </div>

        <div class="flex gap-3 col-span-2">
          <div class="flex-1 min-w-0">
            <label
              class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
              >Início</label
            >
            <input
              v-model="startDate"
              type="date"
              class="w-full rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-sm text-slate-800 outline-none"
            />
          </div>
          <div class="flex-1 min-w-0">
            <label
              class="block text-sm font-semibold text-slate-400 normal-case mb-0.5"
              >Fim</label
            >
            <input
              v-model="endDate"
              type="date"
              class="w-full rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-sm text-slate-800 outline-none"
            />
          </div>
        </div>
      </div>
    </div>

    <section class="rounded-2xl border border-slate-200 bg-white p-4 space-y-4" aria-label="Ações em massa" :aria-busy="bulkSaving">
      <div class="flex flex-wrap items-center gap-4">
        <label class="flex items-center gap-3 font-semibold">
          <input type="checkbox" :checked="allVisibleSelected" :indeterminate="selectedIds.length > 0 && !allVisibleSelected" :disabled="loading || bulkSaving || !transactions.length" @change="toggleVisible" class="h-5 w-5 accent-emerald-700" />
          Selecionar esta página
        </label>
        <span aria-live="polite">{{ selectedIds.length }} selecionados</span>
        <button v-if="selectedIds.length" type="button" :disabled="bulkSaving" @click="selectedIds = []" class="font-semibold text-emerald-800">Limpar seleção</button>
      </div>
      <div v-if="selectedIds.length" class="space-y-3">
        <div class="flex flex-wrap items-end gap-4">
          <label class="flex min-w-0 w-full sm:w-auto flex-col gap-2">Responsável
            <select aria-label="Responsável do lote" v-model="bulkResponsible" :disabled="bulkSaving" class="w-full min-w-0"><option value="">Manter responsável</option><option v-for="r in responsibles.filter(r => r.is_active)" :key="r.id" :value="r.name">{{ r.name }}</option></select>
          </label>
          <label class="flex min-w-0 w-full sm:w-auto flex-col gap-2">Situação
            <select aria-label="Situação do lote" v-model="bulkStatus" :disabled="bulkSaving" class="w-full min-w-0"><option value="">Manter situação</option><option value="REALIZADA">Concluída (paga / recebida / transferida)</option><option value="PENDENTE">Pendente</option><option value="VENCIDA">Vencida</option></select>
          </label>
          <button class="ui-button primary" type="button" :disabled="bulkSaving || (!bulkResponsible && !bulkStatus)" @click="applyBulk">{{ bulkSaving ? 'Aplicando…' : `Aplicar em ${selectedIds.length} lançamentos` }}</button>
        </div>
        <p class="text-sm text-slate-600">A seleção vale apenas para esta página e é limpa ao mudar os filtros ou a página. Parcelas e movimentos de faturas pagas devem ser alterados no fluxo correspondente. No crédito, mudar a situação não paga a fatura.</p>
        <p v-if="bulkError" role="alert" class="text-red-700">{{ bulkError }} Nenhuma alteração do lote foi salva.</p>
      </div>
    </section>

    <!-- Transactions Table -->
    <div
      class="rounded-2xl bg-white shadow-2xs border border-slate-200/80 overflow-hidden"
    >
      <div class="mobile-transactions md:hidden">
        <article v-for="transaction in transactions" :key="transaction.id">
          <label class="flex items-center gap-3 mb-3"><input type="checkbox" v-model="selectedIds" :value="transaction.id" :disabled="bulkSaving || loading" class="h-5 w-5 accent-emerald-700" />Selecionar {{ transaction.description }}</label>
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-sm text-slate-500">
                {{ formatDateBR(transaction.date) }}
              </p>
              <h3>{{ transaction.description }}</h3>
            </div>
            <strong
              class="mobile-amount"
              :class="
                transaction.type === 'DESPESA'
                  ? 'text-red-700'
                  : 'text-emerald-700'
              "
              >{{
                transaction.type === "DESPESA"
                  ? "−"
                  : transaction.type === "RECEITA"
                    ? "+"
                    : ""
              }}{{ formatBRL(transaction.amount) }}</strong
            >
          </div>
          <p class="text-sm text-slate-500 mt-3">
            {{ transaction.category_name || "Sem categoria" }} ·
            {{ transaction.account_name }}
          </p><TransactionCardInfo :transaction="transaction" />
          <div class="flex items-center justify-between gap-3 mt-3">
            <span class="text-sm text-slate-500"
              >{{ transaction.responsible_name }} ·
              {{
                transaction.status === "REALIZADA"
                  ? "Realizada"
                  : transaction.status === "PENDENTE"
                    ? "Pendente"
                    : "Vencida"
              }}</span
            >
            <div class="flex">
              <button
                :aria-label="`Duplicar ${transaction.description}`"
                class="icon-button"
                @click="handleDuplicate(transaction)"
              >
                <Copy :size="20" /></button
              ><button
                :aria-label="`Editar ${transaction.description}`"
                class="icon-button"
                @click="
                  editingTransaction = transaction;
                  showModal = true;
                "
              >
                <Edit2 :size="20" /></button
              ><button
                :aria-label="`Excluir ${transaction.description}`"
                class="icon-button text-red-700"
                @click="handleDelete(transaction)"
              >
                <Trash2 :size="20" />
              </button>
            </div>
          </div>
        </article>
        <p v-if="!transactions.length && !loading" class="p-6 text-slate-500">
          Nenhum lançamento com esses filtros. Tente outro período ou registre o
          primeiro.
        </p>
      </div>
      <div class="overflow-x-auto hidden md:block">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="border-b border-slate-100 bg-slate-50/75 text-sm font-bold normal-case tracking-normal text-slate-500"
            >
              <th class="py-3 px-4"><span class="sr-only">Selecionar</span></th><th class="py-3 px-4">Data</th>
              <th class="py-3 px-4">Descrição</th>
              <th class="py-3 px-4">Categoria</th>
              <th class="py-3 px-4">Conta e cartão</th>
              <th class="py-3 px-4">Responsável</th>
              <th class="py-3 px-4">Status</th>
              <th class="py-3 px-4 text-right">Valor</th>
              <th class="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-base">
            <tr
              v-for="t in transactions"
              :key="t.id"
              class="hover:bg-slate-50/60 transition-colors"
            >
              <td class="py-3 px-4"><input type="checkbox" v-model="selectedIds" :value="t.id" :aria-label="`Selecionar ${t.description}`" :disabled="bulkSaving || loading" class="h-5 w-5 accent-emerald-700" /></td>
              <td
                class="py-3 px-4 whitespace-nowrap text-slate-600 font-medium"
              >
                {{ formatDateBR(t.date) }}
              </td>
              <td class="py-3 px-4">
                <div class="font-bold text-slate-900">{{ t.description }}</div>
                <div
                  v-if="t.notes"
                  class="text-sm text-slate-400 truncate max-w-xs"
                >
                  {{ t.notes }}
                </div>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-semibold"
                  :style="{
                    backgroundColor: (t.category_color || '#64748B') + '15',
                    color: t.category_color || '#64748B',
                  }"
                >
                  {{ t.category_name || "Sem categoria" }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-slate-600">
                {{ t.account_name || "-" }}
                <TransactionCardInfo :transaction="t" />
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="rounded px-1.5 py-0.5 text-sm font-semibold"
                  :class="
                    t.is_shared
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-slate-100 text-slate-700'
                  "
                >
                  {{ t.responsible_name }}
                </span>
              </td>
              <td class="py-3 px-4 whitespace-nowrap">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-sm font-semibold"
                  :class="{
                    'bg-emerald-50 text-emerald-700 border border-emerald-200':
                      t.status === 'REALIZADA',
                    'bg-amber-50 text-amber-700 border border-amber-200':
                      t.status === 'PENDENTE',
                    'bg-red-50 text-red-700 border border-red-200':
                      t.status === 'VENCIDA',
                  }"
                >
                  {{
                    t.status === "REALIZADA"
                      ? t.type === "RECEITA"
                        ? "Recebida"
                        : "Paga"
                      : t.status
                  }}
                </span>
              </td>
              <td
                class="py-3 px-4 whitespace-nowrap text-right font-bold"
                :class="{
                  'text-emerald-600': t.type === 'RECEITA',
                  'text-red-600': t.type === 'DESPESA',
                  'text-blue-600': t.type === 'TRANSFERENCIA',
                }"
              >
                {{ t.type === "DESPESA" ? "-" : t.type === "RECEITA" ? "+" : ""
                }}{{ formatBRL(t.amount) }}
              </td>
              <td class="py-3 px-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="handleDuplicate(t)"
                    title="Duplicar"
                    class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Copy class="h-5 w-5" />
                  </button>
                  <button
                    @click="
                      editingTransaction = t;
                      showModal = true;
                    "
                    title="Editar"
                    class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <Edit2 class="h-5 w-5" />
                  </button>
                  <button
                    @click="handleDelete(t)"
                    title="Excluir"
                    class="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 class="h-5 w-5" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="transactions.length === 0 && !loading">
              <td colspan="9" class="py-12 text-center text-slate-400">
                Nenhuma transação encontrada com os filtros selecionados.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Transaction Modal -->
    <TransactionModal
      v-if="showModal"
      :transaction="editingTransaction"
      @close="
        showModal = false;
        editingTransaction = null;
      "
      @saved="loadTransactions"
    />
  </div>
</template>
