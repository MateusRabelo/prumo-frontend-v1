<script setup lang="ts">
import { formatEnum } from "@/utils/formatters";
import AppDialog from "@/components/ui/AppDialog.vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
const auth = useAuthStore();
import { useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
import { ref, onMounted } from "vue";
import { api } from "@/services/api";
import type { Category, ResponsiblePerson, PaymentMethod } from "@/types";
import {
  Tag,
  Wallet,
  Users,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  AlertCircle,
} from "lucide-vue-next";

type Tab = "categories" | "responsibles" | "payment_methods";
const route = useRoute();
const initialTab = ["categories", "responsibles", "payment_methods"].includes(
  String(route.query.tab),
)
  ? (route.query.tab as Tab)
  : "categories";
const activeTab = ref<Tab>(initialTab);

// Data states
const categories = ref<Category[]>([]);
const responsibles = ref<ResponsiblePerson[]>([]);
const paymentMethods = ref<PaymentMethod[]>([]);

const loading = ref(false);
const error = ref("");
const successMessage = ref("");

// Modal state
const showCategoryModal = ref(false);
const editingCategory = ref<Category | null>(null);
const categoryForm = ref({
  name: "",
  color: "#10B981",
  icon: "tag",
  classification: "NECESSIDADE" as "NECESSIDADE" | "DESEJO" | "INVESTIMENTO",
  type: "DESPESA" as "DESPESA" | "RECEITA" | "AMBOS",
  order_index: 0,
});

const showResponsibleModal = ref(false);
const editingResponsible = ref<ResponsiblePerson | null>(null);
const responsibleForm = ref({
  name: "",
  is_shared: false,
});

const showPaymentMethodModal = ref(false);
const paymentMethodForm = ref({
  name: "",
});

async function loadAll() {
  loading.value = true;
  error.value = "";
  try {
    const [catRes, respRes, pmRes] = await Promise.all([
      api.get("/settings/categories"),
      api.get("/settings/responsibles"),
      api.get("/settings/payment-methods"),
    ]);
    categories.value = catRes.data;
    responsibles.value = respRes.data;
    paymentMethods.value = pmRes.data;
  } catch (err: any) {
    error.value =
      err.response?.data?.detail || "Erro ao carregar configurações";
  } finally {
    loading.value = false;
  }
}

// Category handlers
function openNewCategory() {
  editingCategory.value = null;
  categoryForm.value = {
    name: "",
    color: "#10B981",
    icon: "tag",
    classification: "NECESSIDADE",
    type: "DESPESA",
    order_index: categories.value.length,
  };
  showCategoryModal.value = true;
}

function openEditCategory(cat: Category) {
  editingCategory.value = cat;
  categoryForm.value = {
    name: cat.name,
    color: cat.color,
    icon: cat.icon,
    classification: cat.classification,
    type: cat.type,
    order_index: cat.order_index,
  };
  showCategoryModal.value = true;
}

async function saveCategory() {
  try {
    if (editingCategory.value) {
      await api.put(
        `/settings/categories/${editingCategory.value.id}`,
        categoryForm.value,
      );
    } else {
      await api.post("/settings/categories", categoryForm.value);
    }
    showCategoryModal.value = false;
    await loadAll();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao salvar categoria");
  }
}

async function deleteCategory(id: string) {
  if (!(await feedback.confirm("Deseja realmente desativar esta categoria?")))
    return;
  try {
    await api.delete(`/settings/categories/${id}`);
    await loadAll();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao excluir categoria");
  }
}

// Responsible handlers
function openNewResponsible() {
  editingResponsible.value = null;
  responsibleForm.value = { name: "", is_shared: false };
  showResponsibleModal.value = true;
}

function openEditResponsible(resp: ResponsiblePerson) {
  editingResponsible.value = resp;
  responsibleForm.value = { name: resp.name, is_shared: resp.is_shared };
  showResponsibleModal.value = true;
}

async function saveResponsible() {
  try {
    if (editingResponsible.value) {
      await api.put(
        `/settings/responsibles/${editingResponsible.value.id}`,
        responsibleForm.value,
      );
    } else {
      await api.post("/settings/responsibles", responsibleForm.value);
    }
    showResponsibleModal.value = false;
    await loadAll();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao salvar responsável");
  }
}

// Payment method handlers
function openNewPaymentMethod() {
  paymentMethodForm.value = { name: "" };
  showPaymentMethodModal.value = true;
}

async function savePaymentMethod() {
  try {
    await api.post("/settings/payment-methods", paymentMethodForm.value);
    showPaymentMethodModal.value = false;
    await loadAll();
  } catch (err: any) {
    feedback.notify(err.response?.data?.detail || "Erro ao salvar método");
  }
}

onMounted(() => {
  loadAll();
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
    <div>
      <h1 class="text-3xl font-bold text-gray-900 tracking-tight">
        Preferências do espaço
      </h1>
      <p class="text-base text-gray-500 mt-1">
        Organize categorias, responsáveis pelos lançamentos e formas de
        pagamento.
      </p>
    </div>

    <!-- Error State -->
    <div
      v-if="error"
      class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-base flex items-center gap-3"
    >
      <AlertCircle class="w-5 h-5 flex-shrink-0" />
      <span>{{ error }}</span>
    </div>

    <div class="context-message">
      <p>
        Contas bancárias e cartões ficam em
        <RouterLink to="/accounts-cards" class="font-semibold underline"
          >Contas e cartões</RouterLink
        >. Para convidar pessoas, abra
        <RouterLink to="/family" class="font-semibold underline"
          >Família e acesso</RouterLink
        >.
      </p>
    </div>
    <!-- Navigation Tabs -->
    <div
      class="flex items-center gap-2 overflow-x-auto border-b border-gray-200"
    >
      <button
        v-for="t in [
          { id: 'categories', label: 'Categorias', icon: Tag },
          { id: 'responsibles', label: 'Responsáveis', icon: Users },
          {
            id: 'payment_methods',
            label: 'Métodos de Pagamento',
            icon: CreditCard,
          },
        ]"
        :key="t.id"
        @click="activeTab = t.id as any"
        :class="[
          'flex items-center gap-2 px-4 py-3 text-base font-semibold border-b-2 transition-all -mb-[2px]',
          activeTab === t.id
            ? 'border-emerald-600 text-emerald-600'
            : 'border-transparent text-gray-500 hover:text-gray-800',
        ]"
      >
        <component :is="t.icon" class="w-4 h-4" />
        {{ t.label }}
      </button>
    </div>

    <!-- TAB 1: CATEGORIES -->
    <div v-if="activeTab === 'categories'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-base text-gray-500">
          Categorias para classificar receitas e despesas
        </p>
        <button
          v-if="auth.canManage"
          @click="openNewCategory"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm transition-colors"
        >
          <Plus class="w-5 h-5" />
          Nova categoria
        </button>
      </div>

      <div
        class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div class="overflow-x-auto">
          <table class="w-full text-left text-base">
            <thead
              class="bg-gray-50 text-base font-semibold text-gray-500 normal-case tracking-normal border-b border-gray-100"
            >
              <tr>
                <th class="py-3 px-4">Nome</th>
                <th class="py-3 px-4">Tipo</th>
                <th class="py-3 px-4">Classificação (50/30/20)</th>
                <th class="py-3 px-4 text-center">Status</th>
                <th class="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="cat in categories"
                :key="cat.id"
                class="hover:bg-gray-50"
              >
                <td
                  class="py-3 px-4 font-medium text-gray-900 flex items-center gap-2.5"
                >
                  <div
                    class="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    :style="{ backgroundColor: cat.color || '#94a3b8' }"
                  ></div>
                  {{ cat.name }}
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'text-base px-2 py-0.5 rounded font-medium',
                      cat.type === 'RECEITA'
                        ? 'bg-emerald-50 text-emerald-700'
                        : cat.type === 'DESPESA'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-700',
                    ]"
                  >
                    {{ formatEnum(cat.type) }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <span
                    :class="[
                      'text-base px-2 py-0.5 rounded font-semibold',
                      cat.classification === 'NECESSIDADE'
                        ? 'bg-blue-50 text-blue-700'
                        : cat.classification === 'DESEJO'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-emerald-50 text-emerald-700',
                    ]"
                  >
                    {{
                      cat.classification === "NECESSIDADE"
                        ? "Necessidade (50%)"
                        : cat.classification === "DESEJO"
                          ? "Desejo (30%)"
                          : "Investimento (20%)"
                    }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    :class="[
                      'text-sm font-bold px-2 py-0.5 rounded-full',
                      cat.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-500',
                    ]"
                  >
                    {{ cat.is_active ? "Ativa" : "Inativa" }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      v-if="auth.canManage"
                      @click="openEditCategory(cat)"
                      class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <Pencil class="w-5 h-5" />
                    </button>
                    <button
                      v-if="auth.canManage"
                      @click="deleteCategory(cat.id)"
                      class="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 class="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 3: RESPONSIBLES -->
    <div v-if="activeTab === 'responsibles'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-base text-gray-500">
          Nomes usados para identificar de quem é cada lançamento. Este cadastro
          não concede acesso à aplicação.
        </p>
        <button
          v-if="auth.canManage"
          @click="openNewResponsible"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm transition-colors"
        >
          <Plus class="w-5 h-5" />
          Novo responsável
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="resp in responsibles"
          :key="resp.id"
          class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div>
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-gray-900">{{ resp.name }}</h4>
              <span
                v-if="resp.is_shared"
                class="text-sm bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full"
              >
                Compartilhado
              </span>
            </div>
            <p class="text-base text-gray-400 mt-0.5">
              {{ resp.is_active ? "Ativo" : "Inativo" }}
            </p>
          </div>
          <button
            v-if="auth.canManage"
            @click="openEditResponsible(resp)"
            class="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <Pencil class="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 4: PAYMENT METHODS -->
    <div v-if="activeTab === 'payment_methods'" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-base text-gray-500">
          Meios de pagamento utilizados nos lançamentos
        </p>
        <button
          v-if="auth.canManage"
          @click="openNewPaymentMethod"
          class="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-base font-semibold shadow-sm transition-colors"
        >
          <Plus class="w-5 h-5" />
          Novo Método
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div
          v-for="pm in paymentMethods"
          :key="pm.id"
          class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <CreditCard class="w-5 h-5 text-gray-400" />
            <span class="font-semibold text-gray-900 text-base">{{
              pm.name
            }}</span>
          </div>
          <span class="text-base text-emerald-600 font-medium">Ativo</span>
        </div>
      </div>
    </div>

    <!-- MODAL: Category -->
    <AppDialog v-if="showCategoryModal" @close="showCategoryModal = false">
      <div class="dialog-content">
        <h3 class="text-base font-bold text-gray-900">
          {{ editingCategory ? "Editar Categoria" : "Nova categoria" }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1"
              >Nome</label
            >
            <input
              v-model="categoryForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Alimentação, Aluguel"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Tipo</label
              >
              <select
                v-model="categoryForm.type"
                class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="DESPESA">Despesa</option>
                <option value="RECEITA">Receita</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </div>
            <div>
              <label class="block text-base font-semibold text-gray-700 mb-1"
                >Cor</label
              >
              <input
                v-model="categoryForm.color"
                type="color"
                class="w-full h-9 p-1 border border-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1"
              >Classificação 50/30/20</label
            >
            <select
              v-model="categoryForm.classification"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="NECESSIDADE">Gastos Essenciais (50%)</option>
              <option value="DESEJO">Estilo de Vida / Desejos (30%)</option>
              <option value="INVESTIMENTO">Metas / Investimentos (20%)</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            @click="showCategoryModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            @click="saveCategory"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </AppDialog>

    <!-- MODAL: Responsible -->
    <AppDialog
      v-if="showResponsibleModal"
      @close="showResponsibleModal = false"
    >
      <div class="dialog-content">
        <h3 class="text-base font-bold text-gray-900">
          {{ editingResponsible ? "Editar Responsável" : "Novo responsável" }}
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1"
              >Nome</label
            >
            <input
              v-model="responsibleForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: João, Maria, Compartilhado"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="responsibleForm.is_shared"
              type="checkbox"
              id="is_shared"
              class="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <label for="is_shared" class="text-base text-gray-700 font-medium">
              Marcar como Responsabilidade Compartilhada (Família)
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            @click="showResponsibleModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            @click="saveResponsible"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </AppDialog>

    <!-- MODAL: Payment Method -->
    <AppDialog
      v-if="showPaymentMethodModal"
      @close="showPaymentMethodModal = false"
    >
      <div class="dialog-content">
        <h3 class="text-base font-bold text-gray-900">
          Novo Método de Pagamento
        </h3>
        <div class="space-y-3">
          <div>
            <label class="block text-base font-semibold text-gray-700 mb-1"
              >Nome do Método</label
            >
            <input
              v-model="paymentMethodForm.name"
              type="text"
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Ex: Cartão XP, Vale Refeição"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            @click="showPaymentMethodModal = false"
            class="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-base font-medium hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            @click="savePaymentMethod"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-base font-medium hover:bg-emerald-700"
          >
            Salvar
          </button>
        </div>
      </div>
    </AppDialog>
  </div>
</template>
