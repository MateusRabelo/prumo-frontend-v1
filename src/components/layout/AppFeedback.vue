<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from "vue";
import { X, CheckCircle2, AlertCircle } from "lucide-vue-next";
import { confirmation, notices, useFeedback } from "@/composables/useFeedback";
const feedback = useFeedback();
const dialog = ref<HTMLDialogElement>();
onUnmounted(() => feedback.settle(false));
watch(confirmation, async (value) => {
  await nextTick();
  if (value) dialog.value?.showModal();
  else dialog.value?.close();
});
</script>
<template>
  <div class="notice-stack" aria-live="polite">
    <div
      v-for="notice in notices"
      :key="notice.id"
      class="notice"
      :class="notice.kind"
    >
      <CheckCircle2 v-if="notice.kind === 'success'" :size="19" /><AlertCircle
        v-else
        :size="19"
      />
      <p>{{ notice.text }}</p>
      <button
        aria-label="Fechar aviso"
        @click="notices = notices.filter((n) => n.id !== notice.id)"
      >
        <X :size="16" />
      </button>
    </div>
  </div>
  <dialog
    ref="dialog"
    class="confirmation-dialog"
    aria-labelledby="confirmation-title"
    @cancel.prevent="feedback.settle(false)"
  >
    <h2 id="confirmation-title">Confirmar alteração</h2>
    <p>{{ confirmation?.message }}</p>
    <div class="flex justify-end gap-3 mt-6">
      <button
        autofocus
        class="ui-button secondary"
        @click="feedback.settle(false)"
      >
        Voltar</button
      ><button class="ui-button danger" @click="feedback.settle(true)">
        Confirmar
      </button>
    </div>
  </dialog>
</template>
