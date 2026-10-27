<script setup lang="ts">
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { FinancialAccount, Installment } from "@/types";
import { formatBRL, formatDateBR } from "@/utils/formatters";
import { X, CheckCircle } from "lucide-vue-next";

const props = defineProps<{
  installment: Installment;
  planDescription: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "paid"): void;
}>();

const loading = ref(false);
const error = ref("");
const accounts = ref<FinancialAccount[]>([]);

const form = ref({
  payment_date: new Date().toISOString().split("T")[0],
  account_id: "",
});

onMounted(async () => {
  try {
    const res = await api.get("/settings/accounts");
    accounts.value = res.data;
    if (accounts.value.length > 0) {
      form.value.account_id = accounts.value[0].id;
    }
  } catch {
    error.value = "Erro ao carregar contas";
  }
});

async function handlePay() {
  loading.value = true;
  error.value = "";
  try {
    await api.post(`/installments/installments/${props.installment.id}/pay`, {
      payment_date: form.value.payment_date,
      account_id: form.value.account_id || null,
    });
    emit("paid");
    emit("close");
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao registrar pagamento";
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
          <h3 class="text-base font-bold text-slate-900">
            Registrar pagamento
          </h3>
          <p class="text-base text-slate-500">
            Parcela {{ installment.installment_number }} de
            {{ planDescription }}
          </p>
        </div>
        <button
          @click="emit('close')"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="my-4 rounded-xl bg-slate-50 p-4 border border-slate-200/60">
        <div
          class="flex items-center justify-between text-base text-slate-500 mb-1"
        >
          <span>Valor da Parcela:</span>
          <span>Vencimento:</span>
        </div>
        <div class="flex items-center justify-between font-bold text-slate-900">
          <span class="text-base text-emerald-600">{{
            formatBRL(installment.amount)
          }}</span>
          <span>{{ formatDateBR(installment.due_date) }}</span>
        </div>
      </div>

      <div
        v-if="error"
        class="mb-4 rounded-lg bg-red-50 p-3 text-base font-medium text-red-700 border border-red-200"
      >
        {{ error }}
      </div>

      <form @submit.prevent="handlePay" class="space-y-4">
        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Data do Pagamento</label
          >
          <input
            v-model="form.payment_date"
            type="date"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Conta de Pagamento (Débito)</label
          >
          <select
            v-model="form.account_id"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          >
            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
              {{ acc.name }}
            </option>
          </select>
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
            class="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-base font-semibold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
          >
            <CheckCircle class="h-5 w-5" />
            {{ loading ? "Processando..." : "Confirmar pagamento" }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
