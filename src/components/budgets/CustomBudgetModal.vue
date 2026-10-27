<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { Category, CustomBudget, ResponsiblePerson } from "@/types";
import { X } from "lucide-vue-next";

const props = defineProps<{
  year: number;
  month: number;
  budget?: CustomBudget | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref("");
const categories = ref<Category[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);

const form = ref({
  category_id: props.budget?.category_id || "",
  responsible_name: props.budget?.responsible_name || "",
  classification: props.budget?.classification || "",
  limit_amount: props.budget?.limit_amount
    ? String(props.budget.limit_amount)
    : "",
  alert_threshold_percentage: props.budget?.alert_threshold_percentage || 80,
});

onMounted(async () => {
  try {
    const [catRes, respRes] = await Promise.all([
      api.get("/settings/categories"),
      api.get("/settings/responsibles"),
    ]);
    categories.value = catRes.data.filter(
      (c: Category) => c.type === "DESPESA" || c.type === "AMBOS",
    );
    responsibles.value = respRes.data;
  } catch {
    error.value = "Erro ao carregar opções";
  }
});

async function handleSubmit() {
  const limit = parseMoney(form.value.limit_amount);
  if (isNaN(limit) || limit <= 0) {
    error.value = "Informe um teto de gastos válido";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    if (props.budget) {
      await api.put(`/budgets/custom/${props.budget.id}`, {
        limit_amount: limit,
        alert_threshold_percentage: form.value.alert_threshold_percentage,
      });
    } else {
      await api.post("/budgets/custom", {
        year: props.year,
        month: props.month,
        category_id: form.value.category_id || null,
        responsible_name: form.value.responsible_name || null,
        classification: form.value.classification || null,
        limit_amount: limit,
        alert_threshold_percentage: form.value.alert_threshold_percentage,
      });
    }
    emit("saved");
    emit("close");
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao salvar orçamento";
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
            {{ budget ? "Editar orçamento" : "Novo orçamento" }}
          </h3>
          <p class="text-base text-slate-500">
            Defina um teto mensal de gastos e receba alertas de consumo
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
        <div v-if="!budget">
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Categoria (opcional)</label
          >
          <select
            v-model="form.category_id"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">Todas as categorias</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <div v-if="!budget">
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Responsável (opcional)</label
          >
          <select
            v-model="form.responsible_name"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="">Todos os responsáveis</option>
            <option v-for="r in responsibles" :key="r.id" :value="r.name">
              {{ r.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Limite Máximo de Gastos (R$)</label
          >
          <input
            v-model="form.limit_amount"
            type="text"
            placeholder="0,00"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-semibold"
            required
          />
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1">
            Alerta de Consumo: {{ form.alert_threshold_percentage }}%
          </label>
          <input
            v-model.number="form.alert_threshold_percentage"
            type="range"
            min="50"
            max="100"
            step="5"
            class="w-full accent-emerald-600 cursor-pointer"
          />
          <div class="flex justify-between text-sm text-slate-400 mt-0.5">
            <span>50%</span>
            <span>80% (recomendado)</span>
            <span>100%</span>
          </div>
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
            {{ loading ? "Salvando..." : "Salvar orçamento" }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
