<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { FinancialAccount, FinancialGoal } from "@/types";
import { formatBRL } from "@/utils/formatters";
import { X, PlusCircle, MinusCircle } from "lucide-vue-next";

const props = defineProps<{
  goal: FinancialGoal;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref("");
const accounts = ref<FinancialAccount[]>([]);

const form = ref({
  type: "CONTRIBUICAO" as "CONTRIBUICAO" | "RETIRADA" | "AJUSTE",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  account_id: "",
  notes: "",
});

onMounted(async () => {
  try {
    const res = await api.get("/settings/accounts");
    accounts.value = res.data;
    if (accounts.value.length > 0) form.value.account_id = accounts.value[0].id;
  } catch {
    error.value = "Erro ao carregar contas";
  }
});

async function handleSubmit() {
  const amt = parseMoney(form.value.amount);
  if (isNaN(amt) || amt <= 0) {
    error.value = "Informe um valor válido";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await api.post(`/goals/${props.goal.id}/contributions`, {
      type: form.value.type,
      amount: amt,
      date: form.value.date,
      account_id: form.value.account_id || null,
      notes: form.value.notes || null,
    });
    emit("saved");
    emit("close");
  } catch (err: any) {
    error.value =
      err.response?.data?.detail || "Erro ao registrar movimentação na meta";
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
          <h3 class="text-base font-bold text-slate-900">Aporte / Retirada</h3>
          <p class="text-base text-slate-500">
            Meta: {{ goal.name }} ({{ formatBRL(goal.accumulated_amount) }} de
            {{ formatBRL(goal.target_amount) }})
          </p>
        </div>
        <button
          @click="emit('close')"
          class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Type Switcher -->
      <div class="grid grid-cols-2 gap-2 my-4">
        <button
          type="button"
          @click="form.type = 'CONTRIBUICAO'"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-base font-semibold transition-all border"
          :class="
            form.type === 'CONTRIBUICAO'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 shadow-xs'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          "
        >
          <PlusCircle class="h-5 w-5" />
          Aporte (Guardar)
        </button>
        <button
          type="button"
          @click="form.type = 'RETIRADA'"
          class="flex items-center justify-center gap-1.5 rounded-lg py-2 text-base font-semibold transition-all border"
          :class="
            form.type === 'RETIRADA'
              ? 'border-amber-300 bg-amber-50 text-amber-700 shadow-xs'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          "
        >
          <MinusCircle class="h-5 w-5" />
          Retirada (Resgate)
        </button>
      </div>

      <div
        v-if="error"
        class="mb-4 rounded-lg bg-red-50 p-3 text-base font-medium text-red-700 border border-red-200"
      >
        {{ error }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Valor (R$)</label
            >
            <input
              v-model="form.amount"
              type="text"
              placeholder="0,00"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-semibold"
              required
            />
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Data</label
            >
            <input
              v-model="form.date"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1">
            {{
              form.type === "CONTRIBUICAO"
                ? "Debitar da Conta"
                : "Creditar na Conta"
            }}
          </label>
          <select
            v-model="form.account_id"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">Não movimentar conta</option>
            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">
              {{ acc.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Observações (opcional)</label
          >
          <input
            v-model="form.notes"
            type="text"
            placeholder="Ex: Aporte do 13º salário"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
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
            {{ loading ? "Salvando..." : "Confirmar" }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
