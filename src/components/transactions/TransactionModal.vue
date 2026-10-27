<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted, computed, watch } from "vue";
import { api } from "@/services/api";
import type {
  Category,
  FinancialAccount,
  PaymentMethod,
  ResponsiblePerson,
  Transaction,
  CreditCard,
} from "@/types";
import {
  X,
  ArrowRightLeft,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-vue-next";

const props = defineProps<{
  transaction?: Transaction | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref("");
const initializing = ref(true);

const categories = ref<Category[]>([]);
const accounts = ref<FinancialAccount[]>([]);
const cards = ref<CreditCard[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);

const form = ref({
  description: props.transaction?.description || "",
  type: props.transaction?.type || "DESPESA",
  amount: props.transaction?.amount ? String(props.transaction.amount) : "",
  date: props.transaction?.date || new Date().toISOString().split("T")[0],
  category_id: props.transaction?.category_id || "",
  account_id: props.transaction?.account_id || "",
  destination_account_id: props.transaction?.destination_account_id || "",
  card_id: props.transaction?.card_id || "",
  responsible_name: props.transaction?.responsible_name || "",
  is_shared: props.transaction?.is_shared || false,
  classification: props.transaction?.classification || "NECESSIDADE",
  payment_method_id: props.transaction?.payment_method_id || "",
  status: props.transaction?.status || "REALIZADA",
  notes: props.transaction?.notes || "",
});

const filteredCategories = computed(() => {
  return categories.value.filter(
    (c) => c.type === form.value.type || c.type === "AMBOS",
  );
});

onMounted(async () => {
  try {
    const [catRes, accRes, cardRes, payRes, respRes] = await Promise.all([
      api.get("/settings/categories"),
      api.get("/settings/accounts"),
      api.get("/cards"),
      api.get("/settings/payment-methods"),
      api.get("/settings/responsibles"),
    ]);
    categories.value = catRes.data;
    accounts.value = accRes.data;
    cards.value = cardRes.data;
    paymentMethods.value = payRes.data;
    responsibles.value = respRes.data;

    if (!form.value.account_id && accounts.value.length > 0) {
      form.value.account_id = accounts.value[0].id;
    }
    if (!form.value.responsible_name && responsibles.value.length > 0) {
      form.value.responsible_name = responsibles.value[0].name;
      form.value.is_shared = responsibles.value[0].is_shared;
    }
    if (!form.value.category_id && filteredCategories.value.length > 0) {
      form.value.category_id = filteredCategories.value[0].id;
    }
  } catch (err: any) {
    error.value =
      "Não foi possível carregar suas contas. Feche e tente novamente.";
  } finally {
    initializing.value = false;
  }
});

function handleResponsibleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const found = responsibles.value.find((r) => r.name === target.value);
  if (found) {
    form.value.is_shared = found.is_shared;
  }
}

watch(
  () => form.value.type,
  () => {
    if (form.value.type !== "DESPESA") form.value.card_id = "";
    if (form.value.type !== "TRANSFERENCIA")
      form.value.destination_account_id = "";
    if (!filteredCategories.value.some((c) => c.id === form.value.category_id))
      form.value.category_id = filteredCategories.value[0]?.id || "";
  },
);
watch(
  () => form.value.category_id,
  (id) => {
    const category = categories.value.find((c) => c.id === id);
    if (category) form.value.classification = category.classification;
  },
);

async function handleSubmit() {
  if (loading.value || initializing.value) return;
  if (
    form.value.type === "TRANSFERENCIA" &&
    (!form.value.destination_account_id ||
      form.value.destination_account_id === form.value.account_id)
  ) {
    error.value = "Escolha uma conta de destino diferente da origem.";
    return;
  }
  if (!form.value.description) {
    error.value = "Informe a descrição da transação";
    return;
  }
  const amtNum = parseMoney(form.value.amount);
  if (isNaN(amtNum) || amtNum <= 0) {
    error.value = "Informe um valor numérico positivo válido";
    return;
  }
  if (!form.value.account_id) {
    error.value = "Selecione uma conta financeira";
    return;
  }

  loading.value = true;
  error.value = "";

  const payload: any = {
    description: form.value.description,
    type: form.value.type,
    amount: amtNum,
    date: form.value.date,
    category_id: form.value.category_id || null,
    account_id: form.value.account_id,
    destination_account_id:
      form.value.type === "TRANSFERENCIA"
        ? form.value.destination_account_id || null
        : null,
    card_id: form.value.card_id || null,
    responsible_name: form.value.responsible_name,
    is_shared: form.value.is_shared,
    classification: form.value.classification,
    payment_method_id: form.value.payment_method_id || null,
    status: form.value.status,
    notes: form.value.notes || null,
  };

  try {
    if (props.transaction) {
      await api.put(`/transactions/${props.transaction.id}`, payload);
    } else {
      await api.post("/transactions/", payload);
    }
    emit("saved");
    emit("close");
  } catch (err: any) {
    error.value =
      typeof err.response?.data?.detail === "string"
        ? err.response.data.detail
        : "Confira os campos do lançamento e tente novamente.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppDialog @close="emit('close')">
    <div class="dialog-content">
      <div
        class="flex items-start justify-between gap-4 border-b border-slate-200 pb-5"
      >
        <div>
          <h2>{{ transaction ? "Editar lançamento" : "Novo lançamento" }}</h2>
          <p class="text-slate-500 mt-2">
            Uma conta registrada, um mês mais claro.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar lançamento"
          @click="emit('close')"
        >
          <X :size="24" />
        </button>
      </div>
      <div class="transaction-type-switch" aria-label="Tipo de lançamento">
        <button
          type="button"
          :aria-pressed="form.type === 'DESPESA'"
          @click="form.type = 'DESPESA'"
        >
          <ArrowDownRight :size="20" />Despesa</button
        ><button
          type="button"
          :aria-pressed="form.type === 'RECEITA'"
          @click="form.type = 'RECEITA'"
        >
          <ArrowUpRight :size="20" />Receita</button
        ><button
          type="button"
          :aria-pressed="form.type === 'TRANSFERENCIA'"
          @click="form.type = 'TRANSFERENCIA'"
        >
          <ArrowRightLeft :size="20" />Transferência
        </button>
      </div>
      <div v-if="error" role="alert" class="form-error">{{ error }}</div>
      <div
        v-if="!initializing && !accounts.length"
        class="context-message mt-5"
      >
        <p>
          Este espaço ainda não tem uma conta para receber lançamentos.
          <RouterLink
            to="/accounts-cards"
            class="font-bold underline"
            @click="emit('close')"
            >Abra Contas e cartões</RouterLink
          >
          para começar.
        </p>
      </div>
      <form @submit.prevent="handleSubmit">
        <div>
          <label for="transaction-description">Descrição</label
          ><input
            id="transaction-description"
            v-model="form.description"
            placeholder="Ex.: compra do mercado"
            maxlength="255"
            required
          />
        </div>
        <div class="grid grid-cols-2">
          <div>
            <label for="transaction-amount">Valor (R$)</label
            ><input
              id="transaction-amount"
              v-model="form.amount"
              inputmode="decimal"
              placeholder="0,00"
              required
            />
          </div>
          <div>
            <label for="transaction-date">Data</label
            ><input
              id="transaction-date"
              v-model="form.date"
              type="date"
              required
            />
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>
            <label for="transaction-account">{{
              form.type === "TRANSFERENCIA"
                ? "Conta de origem"
                : "Conta do lançamento"
            }}</label
            ><select
              id="transaction-account"
              v-model="form.account_id"
              :disabled="initializing"
              required
            >
              <option value="" disabled>
                {{ initializing ? "Carregando contas…" : "Escolha uma conta" }}
              </option>
              <option
                v-for="account in accounts"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>
          <div v-if="form.type === 'TRANSFERENCIA'">
            <label for="transaction-destination">Conta de destino</label
            ><select
              id="transaction-destination"
              v-model="form.destination_account_id"
              required
            >
              <option value="" disabled>Escolha o destino</option>
              <option
                v-for="account in accounts.filter(
                  (a) => a.id !== form.account_id,
                )"
                :key="account.id"
                :value="account.id"
              >
                {{ account.name }}
              </option>
            </select>
          </div>
          <div v-else>
            <label for="transaction-category">Categoria</label
            ><select
              id="transaction-category"
              v-model="form.category_id"
              :disabled="initializing"
            >
              <option value="">
                {{ initializing ? "Carregando categorias…" : "Sem categoria" }}
              </option>
              <option
                v-for="category in filteredCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2">
          <div>
            <label for="transaction-person">Responsável pelo lançamento</label
            ><select
              id="transaction-person"
              v-model="form.responsible_name"
              :disabled="initializing"
              @change="handleResponsibleChange"
              required
            >
              <option value="" disabled>
                {{ initializing ? "Carregando…" : "Escolha o responsável" }}
              </option>
              <option
                v-for="person in responsibles"
                :key="person.id"
                :value="person.name"
              >
                {{ person.name }}
              </option>
            </select>
          </div>
          <div>
            <label for="transaction-status">Situação</label
            ><select id="transaction-status" v-model="form.status">
              <option value="REALIZADA">
                {{
                  form.type === "RECEITA"
                    ? "Já recebida"
                    : form.type === "TRANSFERENCIA"
                      ? "Já transferida"
                      : "Já paga"
                }}
              </option>
              <option value="PENDENTE">Pendente</option>
              <option v-if="form.type === 'DESPESA'" value="VENCIDA">
                Vencida
              </option>
            </select>
          </div>
        </div>
        <div v-if="form.type === 'DESPESA' && cards.length">
          <label for="transaction-card">Compra no cartão?</label
          ><select id="transaction-card" v-model="form.card_id">
            <option value="">Não, pagamento pela conta</option>
            <option v-for="card in cards" :key="card.id" :value="card.id">
              {{ card.name }} · final {{ card.last_digits || "—" }}
            </option>
          </select>
          <p v-if="form.card_id" class="field-help">
            A compra entra na fatura. O saldo da conta muda quando você paga
            essa fatura.
          </p>
        </div>
        <details
          class="form-advanced"
          :open="Boolean(transaction?.notes || transaction?.payment_method_id)"
        >
          <summary>
            Mais detalhes
            <span>Forma de pagamento, orçamento e observações</span>
          </summary>
          <div class="grid grid-cols-2 mt-5">
            <div>
              <label for="transaction-method">Forma de pagamento</label
              ><select id="transaction-method" v-model="form.payment_method_id">
                <option value="">Não informar</option>
                <option
                  v-for="method in paymentMethods"
                  :key="method.id"
                  :value="method.id"
                >
                  {{ method.name }}
                </option>
              </select>
            </div>
            <div>
              <label for="transaction-classification">Parte do orçamento</label
              ><select
                id="transaction-classification"
                v-model="form.classification"
              >
                <option value="NECESSIDADE">Necessidades</option>
                <option value="DESEJO">Desejos</option>
                <option value="INVESTIMENTO">Investimentos</option>
              </select>
            </div>
          </div>
          <div class="mt-5">
            <label for="transaction-notes">Observações</label
            ><textarea
              id="transaction-notes"
              v-model="form.notes"
              rows="2"
              placeholder="Algo que vale lembrar sobre este lançamento"
            />
          </div>
        </details>
        <div class="dialog-action-bar">
          <button
            type="button"
            class="ui-button secondary"
            @click="emit('close')"
          >
            Voltar</button
          ><button
            type="submit"
            class="ui-button primary"
            :disabled="loading || initializing || !accounts.length"
          >
            {{
              loading
                ? "Registrando…"
                : transaction
                  ? "Salvar alterações"
                  : "Registrar lançamento"
            }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
