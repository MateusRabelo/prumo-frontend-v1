<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import BankLogo from "@/components/ui/BankLogo.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted, computed } from "vue";
import { api } from "@/services/api";
import type { FinancialAccount, CreditCard, ResponsiblePerson } from "@/types";
import { formatBRL } from "@/utils/formatters";
import {
  CreditCard as CardIcon,
  Wallet,
  User,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  Calendar,
  Coins,
  ShieldCheck,
  Receipt,
} from "lucide-vue-next";
import CardInvoiceModal from "@/components/cards/CardInvoiceModal.vue";

const accounts = ref<FinancialAccount[]>([]);
const cards = ref<CreditCard[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);

const loading = ref(true);
const error = ref("");
const activeSection = ref<"all" | "cards" | "accounts">("all");

// Account Modal
const showAccountModal = ref(false);
const editingAccount = ref<FinancialAccount | null>(null);
const accountForm = ref({
  name: "",
  bank_name: "",
  account_type: "CHECKING" as "CHECKING" | "SAVINGS" | "WALLET" | "INVESTMENT",
  agency: "",
  account_number: "",
  initial_balance: "0.00",
  initial_balance_date: new Date().toISOString().split("T")[0],
  color: "#3B82F6",
});

// Card Modal
const showCardModal = ref(false);
const editingCard = ref<CreditCard | null>(null);
const cardForm = ref({
  name: "",
  card_type: "CREDIT" as "CREDIT" | "DEBIT" | "MULTIPLE" | "BENEFIT",
  brand: "Mastercard",
  bank_name: "",
  last_digits: "",
  credit_limit: "5000.00",
  closing_day: 25,
  due_day: 5,
  color: "#1E293B",
  responsible_name: "",
  account_id: "",
});

// Invoice Modal
const showInvoiceModal = ref(false);
const selectedCardForInvoice = ref<CreditCard | null>(null);

function openCardInvoices(card: CreditCard) {
  selectedCardForInvoice.value = card;
  showInvoiceModal.value = true;
}

const bankPresets = [
  { name: "Neon", color: "#00C6D8" },
  { name: "Nubank", color: "#8A05BE" },
  { name: "Itaú", color: "#EC7000" },
  { name: "Bradesco", color: "#CC092F" },
  { name: "Santander", color: "#EA1D2C" },
  { name: "Banco do Brasil", color: "#F8D117" },
  { name: "Inter", color: "#FF7A00" },
  { name: "C6 Bank", color: "#242424" },
  { name: "Caixa", color: "#005CA9" },
  { name: "XP Investimentos", color: "#000000" },
  { name: "BTG Pactual", color: "#1B2C4F" },
];

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    const [accRes, cardRes, respRes] = await Promise.all([
      api.get("/settings/accounts"),
      api.get("/cards"),
      api.get("/settings/responsibles"),
    ]);
    accounts.value = accRes.data;
    cards.value = cardRes.data;
    responsibles.value = respRes.data;

    if (responsibles.value.length > 0 && !cardForm.value.responsible_name) {
      cardForm.value.responsible_name = responsibles.value[0].name;
    }
  } catch (err: any) {
    error.value =
      err.response?.data?.detail || "Erro ao carregar contas e cartões";
  } finally {
    loading.value = false;
  }
}

// Summary Metrics
const totalAccountsBalance = computed(() => {
  return accounts.value.reduce(
    (acc, a) => acc + Number(a.current_balance ?? a.initial_balance),
    0,
  );
});

const totalCreditLimit = computed(() => {
  return cards.value.reduce((acc, c) => acc + Number(c.credit_limit), 0);
});

const totalAvailableLimit = computed(() => {
  return cards.value.reduce(
    (acc, c) => acc + Number(c.available_limit ?? c.credit_limit),
    0,
  );
});

const totalUsedLimit = computed(() => {
  return cards.value.reduce((acc, c) => acc + Number(c.used_limit ?? 0), 0);
});

// Account Actions
function openNewAccount() {
  editingAccount.value = null;
  accountForm.value = {
    name: "",
    bank_name: "",
    account_type: "CHECKING",
    agency: "",
    account_number: "",
    initial_balance: "0.00",
    initial_balance_date: new Date().toISOString().split("T")[0],
    color: "#3B82F6",
  };
  showAccountModal.value = true;
}

function openEditAccount(acc: FinancialAccount) {
  editingAccount.value = acc;
  accountForm.value = {
    name: acc.name,
    bank_name: acc.bank_name || "",
    account_type: (acc.account_type as any) || "CHECKING",
    agency: acc.agency || "",
    account_number: acc.account_number || "",
    initial_balance: String(acc.initial_balance),
    initial_balance_date: acc.initial_balance_date,
    color: acc.color,
  };
  showAccountModal.value = true;
}

async function saveAccount() {
  if (!Number.isFinite(parseMoney(accountForm.value.initial_balance))) {
    feedback.notify("Informe um saldo válido, como 1.234,56.");
    return;
  }
  try {
    const payload = {
      ...accountForm.value,
      initial_balance: parseMoney(accountForm.value.initial_balance),
    };
    if (editingAccount.value) {
      await api.put(`/settings/accounts/${editingAccount.value.id}`, payload);
    } else {
      await api.post("/settings/accounts", payload);
    }
    showAccountModal.value = false;
    await loadData();
  } catch (err: any) {
    feedback.notify(
      err.response?.data?.detail || "Erro ao salvar conta bancária",
    );
  }
}

async function deleteAccount(id: string) {
  if (
    !(await feedback.confirm("Deseja realmente desativar esta conta bancária?"))
  )
    return;
  try {
    await api.delete(`/settings/accounts/${id}`);
    await loadData();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao desativar conta");
  }
}

// Card Actions
function openNewCard() {
  editingCard.value = null;
  cardForm.value = {
    name: "",
    card_type: "CREDIT",
    brand: "Mastercard",
    bank_name: "",
    last_digits: "",
    credit_limit: "5000.00",
    closing_day: 25,
    due_day: 5,
    color: "#1E293B",
    responsible_name: responsibles.value[0]?.name || "",
    account_id: accounts.value[0]?.id || "",
  };
  showCardModal.value = true;
}

function openEditCard(card: CreditCard) {
  editingCard.value = card;
  cardForm.value = {
    name: card.name,
    card_type: card.card_type,
    brand: card.brand,
    bank_name: card.bank_name || "",
    last_digits: card.last_digits || "",
    credit_limit: String(card.credit_limit),
    closing_day: card.closing_day,
    due_day: card.due_day,
    color: card.color,
    responsible_name: card.responsible_name || "",
    account_id: card.account_id || "",
  };
  showCardModal.value = true;
}

async function saveCard() {
  if (!cardForm.value.account_id) { feedback.notify('Selecione a conta vinculada ao cartão.'); return; }
  const limit = parseMoney(cardForm.value.credit_limit);
  if (!Number.isFinite(limit) || limit < 0) {
    feedback.notify("Informe um limite válido, igual ou maior que zero.");
    return;
  }
  try {
    const payload = {
      ...cardForm.value,
      credit_limit: parseMoney(cardForm.value.credit_limit),
      closing_day: Number(cardForm.value.closing_day),
      due_day: Number(cardForm.value.due_day),
      account_id: cardForm.value.account_id || null,
    };
    if (editingCard.value) {
      await api.put(`/cards/${editingCard.value.id}`, payload);
    } else {
      await api.post("/cards", payload);
    }
    showCardModal.value = false;
    await loadData();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao salvar cartão");
  }
}

async function deleteCard(id: string) {
  if (!(await feedback.confirm("Deseja desativar este cartão?"))) return;
  try {
    await api.delete(`/cards/${id}`);
    await loadData();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao desativar cartão");
  }
}

function applyBankPreset(
  p: { name: string; color: string },
  target: "account" | "card",
) {
  if (target === "account") {
    accountForm.value.bank_name = p.name;
    accountForm.value.color = p.color;
    if (!accountForm.value.name) accountForm.value.name = `Conta ${p.name}`;
  } else {
    cardForm.value.bank_name = p.name;
    cardForm.value.color = p.color;
    if (!cardForm.value.name) cardForm.value.name = `Cartão ${p.name}`;
  }
}

const accountTypeLabels: Record<string, string> = {
  CHECKING: "Conta Corrente",
  SAVINGS: "Conta Poupança",
  WALLET: "Dinheiro / Carteira",
  INVESTMENT: "Conta Investimento",
};

onMounted(() => {
  loadData();
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
    <!-- Header -->
    <div
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
          Contas e cartões
        </h1>
        <p class="text-base text-gray-500 mt-1">
          Gerencie suas contas bancárias, cartões de crédito e limites
          disponíveis
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="auth.canManage"
          @click="openNewAccount"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-base font-semibold rounded-lg shadow-sm transition-colors"
        >
          <Building2 class="w-5 h-5 text-gray-500" />
          Nova conta
        </button>

        <button
          v-if="auth.canManage"
          @click="openNewCard"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-semibold rounded-lg shadow-sm transition-colors"
        >
          <CardIcon class="w-5 h-5" />
          Novo cartão
        </button>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Saldo nas contas</span
          >
          <Wallet class="w-5 h-5 text-emerald-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ formatBRL(totalAccountsBalance) }}
        </p>
        <p class="text-base text-gray-500 mt-1">
          {{ accounts.length }}
          {{
            accounts.length === 1 ? "conta cadastrada" : "contas cadastradas"
          }}
        </p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Limite total dos cartões</span
          >
          <CardIcon class="w-5 h-5 text-indigo-600" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ formatBRL(totalCreditLimit) }}
        </p>
        <p class="text-base text-gray-500 mt-1">
          {{ cards.length }}
          {{ cards.length === 1 ? "cartão ativo" : "cartões ativos" }}
        </p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Limite disponível</span
          >
          <Coins class="w-5 h-5 text-emerald-500" />
        </div>
        <p class="text-3xl font-bold text-emerald-600">
          {{ formatBRL(totalAvailableLimit) }}
        </p>
        <p class="text-base text-gray-500 mt-1">Livre para novas compras</p>
      </div>

      <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between text-gray-500 mb-2">
          <span class="text-base font-semibold normal-case tracking-normal"
            >Limite comprometido</span
          >
          <AlertCircle class="w-5 h-5 text-amber-500" />
        </div>
        <p class="text-3xl font-bold text-gray-900">
          {{ formatBRL(totalUsedLimit) }}
        </p>
        <p class="text-base text-gray-500 mt-1">Parcelas e faturas abertas</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-base flex items-center gap-3"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <span>{{ error }}</span>
    </div>

    <!-- Section Filter Buttons -->
    <div class="flex items-center gap-2 border-b border-gray-200 pb-3">
      <button
        v-for="s in [
          { id: 'all', label: 'Todos' },
          { id: 'cards', label: `Cartões (${cards.length})` },
          { id: 'accounts', label: `Contas bancárias (${accounts.length})` },
        ]"
        :key="s.id"
        @click="activeSection = s.id as any"
        :class="[
          'px-3.5 py-1.5 text-base font-semibold rounded-lg transition-colors',
          activeSection === s.id
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'text-gray-600 hover:bg-gray-100',
        ]"
      >
        {{ s.label }}
      </button>
    </div>

    <!-- SECTION: CREDIT CARDS -->
    <div
      v-if="activeSection === 'all' || activeSection === 'cards'"
      class="space-y-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Cartões e benefícios</h2>
          <p class="text-base text-gray-500">
            Acompanhe limites, datas de fechamento e faturas
          </p>
        </div>
        <button
          v-if="auth.canManage"
          @click="openNewCard"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm transition-colors"
        >
          <Plus class="w-5 h-5" />
          Adicionar cartão
        </button>
      </div>

      <div
        v-if="cards.length === 0"
        class="bg-white rounded-xl border border-gray-100 p-8 text-center text-base text-gray-400"
      >
        Nenhum cartão ainda. Cadastre o primeiro para acompanhar as faturas.
      </div>

      <div v-else class="credit-card-list">
        <article v-for="card in cards" :key="card.id" class="credit-panel">
          <header>
            <div class="credit-identity">
              <BankLogo :name="card.bank_name || card.name" :size="48" />
              <div>
                <h3>{{ card.name }}</h3>
                <p>
                  {{ card.brand }} · final {{ card.last_digits || "—"
                  }}<span v-if="card.bank_name"> · {{ card.bank_name }}</span>
                </p><p>{{ ({ CREDIT: 'Crédito', DEBIT: 'Débito', MULTIPLE: 'Crédito e débito', BENEFIT: 'Benefício' })[card.card_type] }} · {{ accounts.find(a => a.id === card.account_id)?.name || 'Vincule uma conta ao editar' }}</p>
              </div>
            </div>
            <div class="credit-actions">
              <button v-if="['CREDIT','MULTIPLE'].includes(card.card_type)" class="ui-button primary" @click="openCardInvoices(card)">
                <Receipt :size="20" />Ver faturas</button
              ><button
                v-if="auth.canManage"
                class="icon-button"
                title="Editar cartão"
                @click="openEditCard(card)"
              >
                <Pencil :size="20" /></button
              ><button
                v-if="auth.canManage"
                class="icon-button text-red-700"
                title="Desativar cartão"
                @click="deleteCard(card.id)"
              >
                <Trash2 :size="20" />
              </button>
            </div>
          </header>
          <dl class="credit-numbers">
            <div>
              <dt>Fatura atual</dt>
              <dd>{{ formatBRL(card.current_invoice_total || 0) }}</dd>
              <small>Vence no dia {{ card.due_day }}</small>
            </div>
            <div>
              <dt>Limite disponível</dt>
              <dd class="text-emerald-700">
                {{ formatBRL(card.available_limit ?? card.credit_limit) }}
              </dd>
              <small>De {{ formatBRL(card.credit_limit) }} no total</small>
            </div>
            <div>
              <dt>Limite comprometido</dt>
              <dd>{{ formatBRL(card.used_limit || 0) }}</dd>
              <div class="credit-limit-track">
                <span
                  :style="{
                    width:
                      Math.min(
                        100,
                        (Number(card.used_limit || 0) /
                          (Number(card.credit_limit) || 1)) *
                          100,
                      ) + '%',
                  }"
                />
              </div>
            </div>
          </dl>
          <footer>
            <span
              ><User :size="18" />{{ card.responsible_name || "Família" }}</span
            ><span
              >Fecha no dia {{ card.closing_day }} · Vence no dia
              {{ card.due_day }}</span
            >
          </footer>
        </article>
      </div>
    </div>

    <!-- SECTION: BANK ACCOUNTS -->
    <div
      v-if="activeSection === 'all' || activeSection === 'accounts'"
      class="space-y-4"
    >
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-gray-900">Contas e carteiras</h2>
          <p class="text-base text-gray-500">
            Saldos atuais, agências e contas associadas
          </p>
        </div>
        <button
          v-if="auth.canManage"
          @click="openNewAccount"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm transition-colors"
        >
          <Plus class="w-5 h-5" />
          Adicionar conta
        </button>
      </div>

      <div class="bank-account-list">
        <article
          v-for="acc in accounts"
          :key="acc.id"
          class="bank-account-panel"
        >
          <div class="credit-identity">
            <BankLogo :name="acc.bank_name || acc.name" :size="48" />
            <div>
              <h3>{{ acc.name }}</h3>
              <p>
                {{
                  acc.bank_name ||
                  accountTypeLabels[acc.account_type] ||
                  acc.account_type
                }}
              </p>
            </div>
          </div>
          <div class="bank-account-balance">
            <span>Saldo atual</span
            ><strong>{{
              formatBRL(acc.current_balance ?? acc.initial_balance)
            }}</strong>
          </div>
          <div class="bank-account-meta">
            <p>{{ accountTypeLabels[acc.account_type] || acc.account_type }}</p>
            <p v-if="acc.agency || acc.account_number">
              Agência {{ acc.agency || "—" }} · Conta
              {{ acc.account_number || "—" }}
            </p>
          </div>
          <div class="bank-account-actions">
            <button
              v-if="auth.canManage"
              class="icon-button"
              title="Editar conta"
              @click="openEditAccount(acc)"
            >
              <Pencil :size="20" /></button
            ><button
              v-if="auth.canManage"
              class="icon-button text-red-700"
              title="Desativar conta"
              @click="deleteAccount(acc.id)"
            >
              <Trash2 :size="20" />
            </button>
          </div>
        </article>
        <p v-if="!accounts.length" class="empty-panel-copy">
          Nenhuma conta ainda. Cadastre uma conta ou carteira para começar seus
          lançamentos.
        </p>
      </div>
    </div>

    <!-- MODAL: Credit Card -->
    <AppDialog v-if="showCardModal" @close="showCardModal = false">
      <div class="dialog-content">
        <h3 class="text-base font-bold text-gray-900">
          {{ editingCard ? "Editar Cartão" : "Novo cartão" }}
        </h3>

        <!-- Quick Bank Presets -->
        <div>
          <label class="block text-base font-semibold text-gray-700 mb-1.5"
            >Preencher com Banco / Emissor</label
          >
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="p in bankPresets"
              :key="p.name"
              type="button"
              @click="applyBankPreset(p, 'card')"
              class="px-2 py-1 text-base rounded-lg border border-gray-200 hover:border-gray-400 text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <BankLogo :name="p.name" :size="28" />
              {{ p.name }}
            </button>
          </div>
        </div>

        <form @submit.prevent="saveCard" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Nome do Cartão</label
              >
              <input
                v-model="cardForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Nubank Ultravioleta"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Instituição / Banco</label
              >
              <input
                v-model="cardForm.bank_name"
                type="text"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Nubank, Itaú"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Tipo</label
              >
              <select
                v-model="cardForm.card_type"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white"
              >
                <option value="CREDIT">Crédito</option>
                <option value="DEBIT">Débito</option>
                <option value="MULTIPLE">Múltiplo</option>
                <option value="BENEFIT">Benefício / VR</option>
              </select>
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Bandeira</label
              >
              <select
                v-model="cardForm.brand"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white"
              >
                <option value="Mastercard">Mastercard</option>
                <option value="Visa">Visa</option>
                <option value="Elo">Elo</option>
                <option value="American Express">American Express</option>
                <option value="Hipercard">Hipercard</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Últimos 4 Dígitos</label
              >
              <input
                v-model="cardForm.last_digits"
                type="text"
                maxlength="4"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-mono"
                placeholder="1234"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Limite Total (R$)</label
              >
              <input
                v-model="cardForm.credit_limit"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-semibold"
                placeholder="5000.00"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Dia Fechamento</label
              >
              <input
                v-model="cardForm.closing_day"
                type="number"
                min="1"
                max="31"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Dia Vencimento</label
              >
              <input
                v-model="cardForm.due_day"
                type="number"
                min="1"
                max="31"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
              />
            </div>
          </div>

          <div><label for="card-linked-account" class="block text-base font-semibold mb-2">Conta vinculada ao cartão</label><select id="card-linked-account" v-model="cardForm.account_id" required class="w-full px-3 py-3 border border-gray-200 rounded-lg text-base bg-white"><option value="" disabled>Escolha a conta deste cartão</option><option v-for="account in accounts.filter(a => ['CHECKING','SAVINGS','WALLET'].includes(a.account_type))" :key="account.id" :value="account.id">{{ account.name }}</option></select><p class="field-help mt-2">Compras no débito saem desta conta. Compras no crédito entram na fatura e você escolhe a conta ao pagá-la.</p></div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Responsável / Titular</label
              >
              <select
                v-model="cardForm.responsible_name"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white"
              >
                <option v-for="r in responsibles" :key="r.id" :value="r.name">
                  {{ r.name }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Cor do Cartão</label
              >
              <input
                v-model="cardForm.color"
                type="color"
                class="w-full h-9 p-1 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              @click="showCardModal = false"
              class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700"
            >
              Salvar Cartão
            </button>
          </div>
        </form>
      </div>
    </AppDialog>

    <!-- MODAL: Bank Account -->
    <AppDialog v-if="showAccountModal" @close="showAccountModal = false">
      <div class="dialog-content">
        <h3 class="text-base font-bold text-gray-900">
          {{ editingAccount ? "Editar Conta Bancária" : "Nova conta Bancária" }}
        </h3>

        <!-- Quick Bank Presets -->
        <div>
          <label class="block text-base font-semibold text-gray-700 mb-1.5"
            >Preencher com Banco</label
          >
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="p in bankPresets"
              :key="p.name"
              type="button"
              @click="applyBankPreset(p, 'account')"
              class="px-2 py-1 text-base rounded-lg border border-gray-200 hover:border-gray-400 text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <BankLogo :name="p.name" :size="28" />
              {{ p.name }}
            </button>
          </div>
        </div>

        <form @submit.prevent="saveAccount" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Nome da Conta</label
              >
              <input
                v-model="accountForm.name"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Nubank Principal"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Nome do Banco / Emissor</label
              >
              <input
                v-model="accountForm.bank_name"
                type="text"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ex: Itaú, Nubank"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Tipo de Conta</label
              >
              <select
                v-model="accountForm.account_type"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white"
              >
                <option value="CHECKING">Conta Corrente</option>
                <option value="SAVINGS">Poupança</option>
                <option value="INVESTMENT">Investimento</option>
                <option value="WALLET">Carteira / Dinheiro</option>
              </select>
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Agência</label
              >
              <input
                v-model="accountForm.agency"
                type="text"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
                placeholder="0001"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Número da Conta</label
              >
              <input
                v-model="accountForm.account_number"
                type="text"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
                placeholder="123456-7"
              />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Saldo inicial (R$)</label
              >
              <input
                v-model="accountForm.initial_balance"
                type="text"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-semibold"
                placeholder="0.00"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Data do Saldo</label
              >
              <input
                v-model="accountForm.initial_balance_date"
                type="date"
                required
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base"
              />
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Cor</label
              >
              <input
                v-model="accountForm.color"
                type="color"
                class="w-full h-9 p-1 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              @click="showAccountModal = false"
              class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700"
            >
              Salvar Conta
            </button>
          </div>
        </form>
      </div>
    </AppDialog>

    <!-- Invoice Details & Payment Modal -->
    <CardInvoiceModal
      v-if="showInvoiceModal && selectedCardForInvoice"
      :card="selectedCardForInvoice"
      :accounts="accounts"
      @close="showInvoiceModal = false"
      @invoice-paid="loadData"
    />
  </div>
</template>
