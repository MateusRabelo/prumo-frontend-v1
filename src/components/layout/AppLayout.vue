<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowRight, Users } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useFeedback } from "@/composables/useFeedback";
import AppSidebar from "./AppSidebar.vue";
import AppHeader from "./AppHeader.vue";
import AppFeedback from "./AppFeedback.vue";
import TransactionModal from "@/components/transactions/TransactionModal.vue";
const route = useRoute();
const auth = useAuthStore();
const feedback = useFeedback();
const mobileSidebarOpen = ref(false);
const showTransactionModal = ref(false);
const revision = ref(0);
const otherSharedSpaces = computed(() =>
  auth.sharedFamilies.filter((f) => f.id !== auth.currentFamilyId),
);
const showSpaceHint = computed(
  () =>
    (auth.activeFamily?.members_count || 1) === 1 &&
    otherSharedSpaces.value.length > 0 &&
    route.path !== "/family",
);
watch(
  () => auth.currentFamilyId,
  () => {
    showTransactionModal.value = false;
    mobileSidebarOpen.value = false;
    feedback.settle(false);
  },
);
watch(
  () => route.fullPath,
  () => {
    mobileSidebarOpen.value = false;
  },
);
function closeOnEscape(event: KeyboardEvent) {
  if (event.key === "Escape") mobileSidebarOpen.value = false;
}
onMounted(() => window.addEventListener("keydown", closeOnEscape));
onUnmounted(() => window.removeEventListener("keydown", closeOnEscape));
function saved() {
  showTransactionModal.value = false;
  revision.value++;
  feedback.notify("Lançamento salvo.", "success");
}
</script>
<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">Ir para o conteúdo</a>
    <button
      v-if="mobileSidebarOpen"
      class="sidebar-backdrop lg:hidden"
      aria-label="Fechar navegação"
      @click="mobileSidebarOpen = false"
    />
    <AppSidebar
      :mobile-open="mobileSidebarOpen"
      @close="mobileSidebarOpen = false"
    />
    <div class="app-workspace" :inert="mobileSidebarOpen || undefined">
      <AppHeader
        :title="(route.meta.title as string) || 'Prumo'"
        :mobile-open="mobileSidebarOpen"
        @toggle-mobile="mobileSidebarOpen = !mobileSidebarOpen"
        @new-transaction="showTransactionModal = true"
      />
      <main id="main-content" class="app-main" tabindex="-1">
        <div class="app-page">
          <div
            v-if="auth.familyError"
            role="alert"
            class="context-message error"
          >
            <p>{{ auth.familyError }}</p>
            <button @click="auth.fetchMe()">Tentar novamente</button>
          </div>
          <div v-if="showSpaceHint" class="context-message">
            <Users :size="20" />
            <p>
              Você também participa de
              <strong>{{ otherSharedSpaces[0]?.name }}</strong
              >. Os lançamentos de cada espaço ficam separados.
            </p>
            <button @click="auth.switchFamily(otherSharedSpaces[0]!.id)">
              Abrir espaço compartilhado <ArrowRight :size="15" />
            </button>
          </div>
          <RouterView
            :key="`${auth.currentFamilyId}:${route.path}:${revision}`"
          />
        </div>
      </main>
    </div>
    <TransactionModal
      v-if="showTransactionModal"
      @close="showTransactionModal = false"
      @saved="saved"
    />
    <AppFeedback />
  </div>
</template>
