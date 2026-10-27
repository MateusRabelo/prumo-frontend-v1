<script setup lang="ts">
import { onMounted, onUnmounted, onUpdated, ref, useId } from "vue";
const emit = defineEmits<{ (e: "close"): void }>();
defineProps<{ wide?: boolean }>();
const dialog = ref<HTMLDialogElement>();
const titleId = useId();
let fieldSequence = 0;
function associateFields() {
  const title = dialog.value?.querySelector("h1,h2,h3");
  if (title) {
    title.id = titleId;
    dialog.value?.setAttribute("aria-labelledby", titleId);
  }
  dialog.value?.querySelectorAll("label:not([for])").forEach((label) => {
    let next = label.nextElementSibling;
    let field: Element | null = null;
    while (next && !field) {
      field = next.matches("input,select,textarea")
        ? next
        : next.querySelector("input,select,textarea");
      next = next.nextElementSibling;
    }
    if (field) {
      if (!field.id) field.id = `${titleId}-field-${fieldSequence++}`;
      label.setAttribute("for", field.id);
    }
  });
  dialog.value?.querySelectorAll("button").forEach((button) => {
    if (!button.textContent?.trim()) {
      button.classList.add("icon-only");
      if (!button.getAttribute("aria-label"))
        button.setAttribute("aria-label", button.title || "Fechar");
    }
  });
}
onMounted(() => {
  associateFields();
  dialog.value?.showModal();
});
onUpdated(associateFields);
onUnmounted(() => dialog.value?.close());
</script>
<template>
  <dialog
    ref="dialog"
    class="prumo-dialog"
    :class="{ wide }"
    @cancel.prevent="emit('close')"
  >
    <slot />
  </dialog>
</template>
