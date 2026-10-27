<script setup lang="ts">
import { parseMoney } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { FinancialGoal, ResponsiblePerson } from "@/types";
import { X } from "lucide-vue-next";

const props = defineProps<{
  goal?: FinancialGoal | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "saved"): void;
}>();

const loading = ref(false);
const error = ref("");
const responsibles = ref<ResponsiblePerson[]>([]);

const form = ref({
  name: props.goal?.name || "",
  description: props.goal?.description || "",
  target_amount: props.goal?.target_amount
    ? String(props.goal.target_amount)
    : "",
  target_date: props.goal?.target_date || "",
  responsible_name: props.goal?.responsible_name || "",
  is_shared: props.goal?.is_shared || false,
  status: props.goal?.status || "EM_ANDAMENTO",
});

onMounted(async () => {
  try {
    const res = await api.get("/settings/responsibles");
    responsibles.value = res.data;
    if (!form.value.responsible_name && responsibles.value.length > 0) {
      form.value.responsible_name = responsibles.value[0].name;
      form.value.is_shared = responsibles.value[0].is_shared;
    }
  } catch {
    error.value = "Erro ao carregar responsáveis";
  }
});

function handleResponsibleChange(e: Event) {
  const target = e.target as HTMLSelectElement;
  const found = responsibles.value.find((r) => r.name === target.value);
  if (found) form.value.is_shared = found.is_shared;
}

async function handleSubmit() {
  if (!form.value.name) {
    error.value = "Informe o nome da meta";
    return;
  }
  const amt = parseMoney(form.value.target_amount);
  if (isNaN(amt) || amt <= 0) {
    error.value = "Informe um valor alvo válido";
    return;
  }

  loading.value = true;
  error.value = "";

  const payload: any = {
    name: form.value.name,
    description: form.value.description || null,
    target_amount: amt,
    target_date: form.value.target_date || null,
    responsible_name: form.value.responsible_name,
    is_shared: form.value.is_shared,
  };

  try {
    if (props.goal) {
      payload.status = form.value.status;
      await api.put(`/goals/${props.goal.id}`, payload);
    } else {
      await api.post("/goals/", payload);
    }
    emit("saved");
    emit("close");
  } catch (err: any) {
    error.value = err.response?.data?.detail || "Erro ao salvar meta";
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
            {{ goal ? "Editar meta" : "Nova meta" }}
          </h3>
          <p class="text-base text-slate-500">
            Defina objetivos e acompanhe suas conquistas
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
            >Nome da Meta</label
          >
          <input
            v-model="form.name"
            type="text"
            placeholder="Ex: Reserva de Emergência, Viagem Europa"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Valor Alvo (R$)</label
            >
            <input
              v-model="form.target_amount"
              type="text"
              placeholder="0,00"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-semibold"
              required
            />
          </div>

          <div>
            <label class="block text-base font-semibold text-slate-700 mb-1"
              >Prazo Estimado</label
            >
            <input
              v-model="form.target_date"
              type="date"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
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

        <div v-if="goal">
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Status</label
          >
          <select
            v-model="form.status"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          >
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div>
          <label class="block text-base font-semibold text-slate-700 mb-1"
            >Descrição / Motivação</label
          >
          <textarea
            v-model="form.description"
            rows="2"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none"
            placeholder="Detalhes sobre o objetivo..."
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
            {{ loading ? "Salvando..." : "Salvar meta" }}
          </button>
        </div>
      </form>
    </div>
  </AppDialog>
</template>
