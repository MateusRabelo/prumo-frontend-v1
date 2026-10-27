import { ref } from "vue";

export const notices = ref<
  { id: number; text: string; kind: "success" | "error" }[]
>([]);
export const confirmation = ref<{
  message: string;
  resolve: (value: boolean) => void;
} | null>(null);
let nextId = 0;

export function useFeedback() {
  function notify(text: string, kind: "success" | "error" = "error") {
    const id = ++nextId;
    notices.value.push({
      id,
      text:
        typeof text === "string"
          ? text
          : "Não foi possível concluir a operação.",
      kind,
    });
    setTimeout(() => {
      notices.value = notices.value.filter((n) => n.id !== id);
    }, 6500);
  }
  function confirm(message: string): Promise<boolean> {
    if (confirmation.value) return Promise.resolve(false);
    return new Promise((resolve) => {
      confirmation.value = { message, resolve };
    });
  }
  function settle(value: boolean) {
    confirmation.value?.resolve(value);
    confirmation.value = null;
  }
  return { notify, confirm, settle };
}
