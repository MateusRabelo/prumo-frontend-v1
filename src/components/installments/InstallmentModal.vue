<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted, computed } from "vue";
import { api } from "@/services/api";
import type {
  Category,
  FinancialAccount,
  PaymentMethod,
  ResponsiblePerson,
  CreditCard,
} from "@/types";
import { formatBRL } from "@/utils/formatters";
import { X, Calendar } from "lucide-vue-next";

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref("");

const categories = ref<Category[]>([]);
const accounts = ref<FinancialAccount[]>([]);
const cards = ref<CreditCard[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);

const form = ref({
  description: "",
  total_amount: "",
  installments_count: 3,
  purchase_date: new Date().toISOString().split("T")[0],
  first_due_date: new Date().toISOString().split("T")[0],
  category_id: "",
  account_id: "",
  card_id: "",
  payment_method_id: "",
  responsible_name: "",
  is_shared: false,
  notes: "",
});

const estimatedInstallmentAmount = computed(() => {
  const num = parseMoney(form.value.total_amount);
  const count = form.value.installments_count;
  if (isNaN(num) || num <= 0 || !count || count <= 0) return 0;
  return num / count;
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
    categories.value = catRes.data.filter(
      (c: Category) => c.type === "DESPESA" || c.type === "AMBOS",
    );
    accounts.value = accRes.data;
    cards.value = cardRes.data;
    paymentMethods.value = payRes.data;
    responsibles.value = respRes.data;

    if (categories.value.length > 0)
      form.value.category_id = categories.value[0].id;
    if (accounts.value.length > 0) form.value.account_id = accounts.value[0].id;
    if (cards.value.length > 0) form.value.card_id = cards.value[0].id;
    if (responsibles.value.length > 0) {
      form.value.responsible_name = responsibles.value[0].name;
      form.value.is_shared = responsibles.value[0].is_shared;
    }
  } catch {
    error.value = "Erro ao carregar dados";
  }
});

function handleResponsibleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const found = responsibles.value.find((r) => r.name === target.value);
  if (found) form.value.is_shared = found.is_shared;
}

async function handleSubmit() {
  if (!form.value.description) {
    error.value = "Informe a descrição da compra";
    return;
  }
  const amtNum = parseMoney(form.value.total_amount);
  if (isNaN(amtNum) || amtNum <= 0) {
    error.value = "Informe um valor total válido";
    return;
  }
  if (!form.value.category_id) {
    error.value = "Selecione uma categoria";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await api.post("/installments/", {
      description: form.value.description,
      category_id: form.value.category_id,
      account_id: form.value.account_id || null,
      card_id: form.value.card_id || null,
      payment_method_id: form.value.payment_method_id || null,
      responsible_name: form.value.responsible_name,
      is_shared: form.value.is_shared,
      total_amount: amtNum,
      installments_count: form.value.installments_count,
      purchase_date: form.value.purchase_date,
      first_due_date: form.value.first_due_date,
      notes: form.value.notes || null,
    });
    emit("saved");
    emit("close");
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao criar parcelamento";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AppDialog @close="emit('close')">
    <div class="dialog-content">
      <div
        class="flex items-center justify-between border-b border-slate-100 pb-4"
      >
        <div>
          <h3 class="text-base font-bold text-slate-900">Novo parcelamento</h3>
          <p class="text-base text-slate-500">
            Cadastre uma compra parcelada com divisão exata de centavos
          </p>
        </div>
        <button
          @click="emit('close')"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div
        v-if="error"
        class="mt-4 rounded-lg bg-red-50 p-3 text-base font-medium text-red-700 border border-red-200"
      >
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="mt-4 space-y-4">
        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Descrição da Compra</label
          >
          <input
            v-model="form.description"
            type="text"
            placeholder="Ex: Notebook Dell, Celular, Sofá"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Valor total (R$)</label
            >
            <input
              v-model="form.total_amount"
              type="text"
              placeholder="0,00"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-semibold"
              required
            />
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Qtd. Parcelas</label
            >
            <input
              v-model.number="form.installments_count"
              type="number"
              min="1"
              max="120"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        <!-- Preview banner -->
        <div
          v-if="estimatedInstallmentAmount > 0"
          class="rounded-lg bg-emerald-50/80 p-3 border border-emerald-200/80 flex items-center justify-between text-base"
        >
          <span class="text-emerald-800 font-medium"
            >Estimativa por parcela:</span
          >
          <span class="text-emerald-900 font-bold"
            >{{ form.installments_count }}x de ~{{
              formatBRL(estimatedInstallmentAmount)
            }}</span
          >
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Data da compra</label
            >
            <input
              v-model="form.purchase_date"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Vencimento da 1ª Parcela</label
            >
            <input
              v-model="form.first_due_date"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Categoria</label
            >
            <select
              v-model="form.category_id"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            >
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Responsável</label
            >
            <select
              v-model="form.responsible_name"
              @change="handleResponsibleChange"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option v-for="r in responsibles" :key="r.id" :value="r.name">
                {{ r.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Cartão de crédito (opcional)</label
            >
            <select
              v-model="form.card_id"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">Nenhum cartão</option>
              <option v-for="c in cards" :key="c.id" :value="c.id">
                {{ c.name }} ({{ c.brand }} •••• {{ c.last_digits || "0000" }})
              </option>
            </select>
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Conta para pagamento</label
            >
            <select
              v-model="form.account_id"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">Não vincular conta</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
                {{ acc.name }}
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Observações (opcional)</label
          >
          <textarea
            v-model="form.notes"
            rows="2"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
          />
        </div>

        <div
          class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100"
        >
          <button
            type="button"
            @click="emit('close')"
            class="rounded-lg border border-slate-200 px-4 py-2 text-base font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="rounded-lg bg-emerald-600 px-5 py-2 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {{ loading ? "Gerando..." : "Criar parcelamento" }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
