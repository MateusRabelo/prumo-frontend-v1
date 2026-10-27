import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { api } from "@/services/api";
import type { User, FamilySpace } from "@/types";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const token = ref<string | null>(localStorage.getItem("msfinancas_token"));
  const currentFamilyId = ref<string | null>(
    sessionStorage.getItem("msfinancas_family_id") ||
      localStorage.getItem("msfinancas_family_id"),
  );
  const myFamilies = ref<FamilySpace[]>([]);
  const loading = ref(false);

  const activeFamily = computed(() =>
    myFamilies.value.find((f) => f.id === currentFamilyId.value),
  );
  const canManage = computed(() =>
    ["OWNER", "ADMIN"].includes(activeFamily.value?.role || ""),
  );
  const sharedFamilies = computed(() =>
    myFamilies.value.filter((f) => (f.members_count || 1) > 1),
  );
  const familyError = ref("");
  const isAuthenticated = computed(() => !!token.value);

  async function login(email: string, password: string) {
    loading.value = true;
    try {
      const res = await api.post("/auth/login", { email, password });
      token.value = res.data.access_token;
      user.value = res.data.user;
      currentFamilyId.value =
        localStorage.getItem(`msfinancas:last-family:${res.data.user.id}`) ||
        res.data.current_family_id;

      localStorage.setItem("msfinancas_token", res.data.access_token);
      if (res.data.current_family_id) {
        sessionStorage.setItem("msfinancas_family_id", currentFamilyId.value!);
        localStorage.setItem("msfinancas_family_id", currentFamilyId.value!);
      }
      await fetchMyFamilies();
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function register(full_name: string, email: string, password: string) {
    loading.value = true;
    try {
      const res = await api.post("/auth/register", {
        full_name,
        email,
        password,
      });
      token.value = res.data.access_token;
      user.value = res.data.user;
      currentFamilyId.value =
        localStorage.getItem(`msfinancas:last-family:${res.data.user.id}`) ||
        res.data.current_family_id;

      localStorage.setItem("msfinancas_token", res.data.access_token);
      if (res.data.current_family_id) {
        sessionStorage.setItem("msfinancas_family_id", currentFamilyId.value!);
        localStorage.setItem("msfinancas_family_id", currentFamilyId.value!);
      }
      await fetchMyFamilies();
      return res.data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return;
    try {
      const res = await api.get("/auth/me");
      user.value = res.data;
      await fetchMyFamilies();
    } catch (error: any) {
      if ([401, 403].includes(error.response?.status)) await logout(false);
      else
        familyError.value =
          "Não foi possível atualizar a sessão. Tente novamente.";
    }
  }

  async function fetchMyFamilies() {
    if (!token.value) return;
    try {
      const res = await api.get("/auth/my-families");
      myFamilies.value = res.data;
      familyError.value = "";
      if (
        !myFamilies.value.some((f) => f.id === currentFamilyId.value) &&
        myFamilies.value.length > 0
      ) {
        currentFamilyId.value = myFamilies.value[0].id;
        localStorage.setItem("msfinancas_family_id", myFamilies.value[0].id);
      }
      if (currentFamilyId.value)
        sessionStorage.setItem("msfinancas_family_id", currentFamilyId.value);
    } catch (e) {
      familyError.value =
        "Não foi possível carregar seus espaços. Tente novamente.";
      throw e;
    }
  }

  function switchFamily(familyId: string) {
    if (!myFamilies.value.some((f) => f.id === familyId)) return;
    currentFamilyId.value = familyId;
    if (user.value)
      localStorage.setItem(`msfinancas:last-family:${user.value.id}`, familyId);
    sessionStorage.setItem("msfinancas_family_id", familyId);
    localStorage.setItem("msfinancas_family_id", familyId);
  }

  async function logout(revoke = true) {
    if (revoke && token.value) {
      try {
        await api.post("/auth/logout");
      } catch {
        /* Always clear local credentials. */
      }
    }
    token.value = null;
    user.value = null;
    currentFamilyId.value = null;
    myFamilies.value = [];
    localStorage.removeItem("msfinancas_token");
    localStorage.removeItem("msfinancas_family_id");
    sessionStorage.removeItem("msfinancas_family_id");
  }

  return {
    user,
    activeFamily,
    canManage,
    sharedFamilies,
    familyError,
    token,
    currentFamilyId,
    myFamilies,
    loading,
    isAuthenticated,
    login,
    register,
    fetchMe,
    fetchMyFamilies,
    switchFamily,
    logout,
  };
});
