<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Check,
  ChevronDown,
  Users,
  UserRound,
  ArrowUpRight,
} from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
const emit = defineEmits<{ (e: "changed"): void }>();
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const open = ref(false);
const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const panelId = useId();
function outside(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) open.value = false;
}
function escape(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    open.value = false;
    trigger.value?.focus();
  }
}
onMounted(() => {
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", escape);
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", outside);
  document.removeEventListener("keydown", escape);
});
function choose(id: string) {
  auth.switchFamily(id);
  open.value = false;
  router.replace({ path: route.path, query: {} });
  emit("changed");
}
</script>
<template>
  <div ref="root" class="space-switcher">
    <button
      ref="trigger"
      class="space-trigger"
      :aria-expanded="open"
      :aria-controls="panelId"
      aria-label="Trocar espaço financeiro"
      @click="open = !open"
    >
      <span class="space-trigger-label">Seu espaço</span
      ><span class="space-trigger-name"
        >{{ auth.activeFamily?.name || "Carregando…"
        }}<ChevronDown :size="20" /></span
      ><span class="space-trigger-meta">{{
        (auth.activeFamily?.members_count || 1) > 1
          ? `${auth.activeFamily?.members_count} pessoas · Compartilhado`
          : "Só você neste espaço"
      }}</span>
    </button>
    <div
      v-if="open"
      :id="panelId"
      class="space-menu"
      aria-label="Seus espaços financeiros"
    >
      <p>Escolha o espaço que quer acompanhar</p>
      <button
        v-for="space in auth.myFamilies"
        :key="space.id"
        :aria-pressed="space.id === auth.currentFamilyId"
        @click="choose(space.id)"
      >
        <Users v-if="(space.members_count || 1) > 1" :size="24" /><UserRound
          v-else
          :size="24"
        /><span
          ><strong>{{ space.name }}</strong
          ><small>{{
            (space.members_count || 1) > 1
              ? `${space.members_count} pessoas · Compartilhado`
              : "Só você"
          }}</small></span
        ><Check v-if="space.id === auth.currentFamilyId" :size="20" /></button
      ><RouterLink
        to="/family"
        @click="
          open = false;
          emit('changed');
        "
        >Gerenciar espaços e acesso <ArrowUpRight :size="18"
      /></RouterLink>
    </div>
  </div>
</template>
