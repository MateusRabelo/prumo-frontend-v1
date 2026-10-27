<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Users,
  UserRound,
  Plus,
  ArrowUpRight,
  Check,
  Copy,
  X,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-vue-next";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useFeedback } from "@/composables/useFeedback";
import type { FamilyMember, FamilyInvitation } from "@/types";
import { formatDate } from "@/utils/formatters";
const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const feedback = useFeedback();
const members = ref<FamilyMember[]>([]);
const invitations = ref<FamilyInvitation[]>([]);
const loading = ref(true);
const busy = ref(false);
const error = ref("");
const inviteDialog = ref<HTMLDialogElement>();
const acceptDialog = ref<HTMLDialogElement>();
const inviteEmail = ref("");
const inviteRole = ref("MEMBER");
const inviteLink = ref("");
const inviteCode = ref("");
const acceptCode = ref("");
const formError = ref("");
const copied = ref(false);
const shared = computed(
  () => (auth.activeFamily?.members_count || members.value.length) > 1,
);
const others = computed(() =>
  auth.myFamilies.filter((f) => f.id !== auth.currentFamilyId),
);
const roles: Record<string, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
};
function message(err: any, fallback: string) {
  return typeof err.response?.data?.detail === "string"
    ? err.response.data.detail
    : fallback;
}
async function load() {
  loading.value = true;
  error.value = "";
  try {
    members.value = (await api.get("/family/members")).data;
    invitations.value = auth.canManage
      ? (await api.get("/family/invitations")).data
      : [];
  } catch (err) {
    error.value = message(err, "Não foi possível carregar os integrantes.");
  } finally {
    loading.value = false;
  }
}
function switchSpace(id: string) {
  auth.switchFamily(id);
  router.replace({ path: "/family", query: {} });
  feedback.notify(
    "Espaço alterado. Agora você vê os dados dessa família.",
    "success",
  );
}
function openInvite() {
  formError.value = "";
  inviteLink.value = "";
  inviteCode.value = "";
  copied.value = false;
  inviteDialog.value?.showModal();
}
function openAccept() {
  formError.value = "";
  acceptDialog.value?.showModal();
}
async function createInvite() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    const result = await api.post("/family/invite", {
      invited_email: inviteEmail.value,
      role: inviteRole.value,
    });
    inviteCode.value = result.data.token;
    const url = new URL("/family", window.location.origin);
    url.searchParams.set("invite", result.data.token);
    inviteLink.value = url.toString();
    await load();
  } catch (err) {
    formError.value = message(err, "Não foi possível criar o convite.");
  } finally {
    busy.value = false;
  }
}
async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value);
    copied.value = true;
  } catch {
    formError.value =
      "Não foi possível copiar. Selecione e copie o link abaixo.";
  }
}
async function acceptInvite() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    let code = acceptCode.value.trim();
    if (code.startsWith("http"))
      code = new URL(code).searchParams.get("invite") || code;
    const result = await api.post("/family/accept-invite", { token: code });
    await auth.fetchMyFamilies();
    acceptDialog.value?.close();
    auth.switchFamily(result.data.id);
    await router.replace("/family");
    feedback.notify(
      "Convite aceito. Você está no espaço compartilhado.",
      "success",
    );
  } catch (err) {
    formError.value = message(err, "Não foi possível aceitar o convite.");
  } finally {
    busy.value = false;
  }
}
async function revoke(invitation: FamilyInvitation) {
  if (
    !(await feedback.confirm(
      `Revogar o convite para ${invitation.invited_email}? O link deixará de funcionar.`,
    ))
  )
    return;
  try {
    await api.delete(`/family/invitations/${invitation.id}`);
    await load();
    feedback.notify("Convite revogado.", "success");
  } catch (err) {
    feedback.notify(message(err, "Não foi possível revogar o convite."));
  }
}
onMounted(async () => {
  await load();
  if (typeof route.query.invite === "string") {
    acceptCode.value = route.query.invite;
    openAccept();
  }
});
</script>
<template>
  <div class="family-page">
    <div class="family-heading">
      <div>
        <p class="eyebrow">Seu espaço</p>
        <h1>Família e acesso</h1>
        <p>
          Saiba com quem você divide as finanças e escolha o espaço que quer
          acompanhar.
        </p>
      </div>
      <button class="ui-button secondary" @click="openAccept">
        <KeyRound :size="16" />Tenho um convite
      </button>
    </div>
    <div v-if="error" class="context-message error" role="alert">
      <p>{{ error }}</p>
      <button @click="load">Tentar novamente</button>
    </div>
    <div class="family-grid">
      <div class="family-primary">
        <section class="family-overview" aria-labelledby="active-title">
          <div class="flex items-start justify-between gap-4">
            <span class="family-symbol"
              ><Users v-if="shared" :size="26" :stroke-width="1.6" /><UserRound
                v-else
                :size="26"
                :stroke-width="1.6" /></span
            ><span class="space-badge"
              ><span class="status-dot" />Espaço ativo</span
            >
          </div>
          <h2 id="active-title">{{ auth.activeFamily?.name }}</h2>
          <p class="overview-description">
            {{
              shared
                ? "Os integrantes abaixo têm acesso aos lançamentos e ao planejamento deste espaço."
                : "Por enquanto, só você tem acesso aos dados deste espaço."
            }}
          </p>
          <div class="overview-facts">
            <div>
              <strong>{{ loading ? "—" : members.length }}</strong
              ><span>{{
                members.length === 1
                  ? "pessoa com acesso"
                  : "pessoas com acesso"
              }}</span>
            </div>
            <div>
              <strong>{{ roles[auth.activeFamily?.role || "MEMBER"] }}</strong
              ><span>seu papel aqui</span>
            </div>
            <div>
              <strong>{{ auth.activeFamily?.currency || "BRL" }}</strong
              ><span>moeda do espaço</span>
            </div>
          </div>
        </section>
        <section class="family-members" aria-labelledby="members-title">
          <div class="section-heading">
            <div>
              <h2 id="members-title">Quem tem acesso</h2>
              <p>
                Permissões válidas apenas para {{ auth.activeFamily?.name }}.
              </p>
            </div>
            <button
              v-if="auth.canManage"
              class="ui-button primary compact"
              @click="openInvite"
            >
              <Plus :size="15" />Convidar pessoa
            </button>
          </div>
          <div
            v-if="loading"
            class="p-6 space-y-5"
            aria-label="Carregando integrantes"
          >
            <div
              v-for="n in 2"
              :key="n"
              class="h-10 rounded bg-slate-100 animate-pulse"
            />
          </div>
          <div v-else class="member-list">
            <div v-for="member in members" :key="member.id" class="member-row">
              <span class="member-avatar">{{
                (member.full_name || member.alias_name).charAt(0)
              }}</span>
              <div class="member-details">
                <strong
                  >{{ member.full_name || member.alias_name }}
                  <span
                    v-if="member.user_id === auth.user?.id"
                    class="you-label"
                    >você</span
                  ></strong
                >
                <p>{{ member.email }}</p>
              </div>
              <span class="member-role" :class="member.role.toLowerCase()">{{
                roles[member.role]
              }}</span>
            </div>
          </div>
          <div class="permission-note">
            <ShieldCheck :size="16" />
            <p>
              Administradores gerenciam contas, configurações e convites.
              Membros consultam as finanças e registram lançamentos.
            </p>
          </div>
        </section>
        <section
          v-if="auth.canManage"
          class="family-invites"
          aria-labelledby="invites-title"
        >
          <div class="section-heading">
            <div>
              <h2 id="invites-title">Convites criados</h2>
              <p>
                Um convite só pode ser aceito pela conta do e-mail indicado.
              </p>
            </div>
            <span class="count-badge">{{ invitations.length }}</span>
          </div>
          <div v-if="!loading && !invitations.length" class="invite-empty">
            <span><KeyRound :size="19" /></span>
            <div>
              <strong>Nenhum convite pendente</strong>
              <p>Ao convidar alguém, copie o link e envie para essa pessoa.</p>
            </div>
          </div>
          <div
            v-for="invitation in invitations"
            :key="invitation.id"
            class="invite-row"
          >
            <div>
              <strong>{{ invitation.invited_email }}</strong>
              <p>
                {{
                  new Date(invitation.expires_at) < new Date()
                    ? "Expirado em"
                    : "Válido até"
                }}
                {{ formatDate(invitation.expires_at) }} ·
                {{ roles[invitation.role] }}
              </p>
            </div>
            <button @click="revoke(invitation)">Revogar</button>
          </div>
        </section>
      </div>
      <aside class="family-secondary">
        <section class="your-spaces" aria-labelledby="spaces-title">
          <div class="section-heading">
            <div>
              <h2 id="spaces-title">Seus espaços</h2>
              <p>
                Você participa de {{ auth.myFamilies.length }}
                {{ auth.myFamilies.length === 1 ? "espaço" : "espaços" }}.
              </p>
            </div>
          </div>
          <button
            v-for="space in auth.myFamilies"
            :key="space.id"
            class="space-option"
            :class="{ selected: space.id === auth.currentFamilyId }"
            :aria-current="
              space.id === auth.currentFamilyId ? 'true' : undefined
            "
            @click="switchSpace(space.id)"
          >
            <span class="space-option-icon"
              ><Users
                v-if="(space.members_count || 1) > 1"
                :size="18" /><UserRound v-else :size="18" /></span
            ><span
              ><strong>{{ space.name }}</strong
              ><small>{{
                (space.members_count || 1) > 1
                  ? `${space.members_count} pessoas · Compartilhado`
                  : "Só você"
              }}</small></span
            ><Check
              v-if="space.id === auth.currentFamilyId"
              :size="16"
            /><ArrowUpRight v-else :size="16" />
          </button>
          <p class="space-footnote">
            Trocar de espaço muda os lançamentos, contas e metas que você vê. Os
            dados continuam separados.
          </p>
        </section>
        <div
          v-if="others.some((f) => (f.members_count || 1) > 1) && !shared"
          class="shared-callout"
        >
          <Users :size="21" />
          <h3>Seu espaço compartilhado já está aqui</h3>
          <p>
            Você já tem acesso a
            {{ others.find((f) => (f.members_count || 1) > 1)?.name }}. Abra
            esse espaço para acompanhar as finanças em conjunto.
          </p>
          <button
            @click="
              switchSpace(others.find((f) => (f.members_count || 1) > 1)!.id)
            "
          >
            Abrir espaço compartilhado <ArrowRight :size="15" />
          </button>
        </div>
        <div class="access-explainer">
          <Info :size="18" />
          <h3>Responsável é diferente de integrante</h3>
          <p>
            O responsável identifica de quem é um lançamento. Só as pessoas em
            “Quem tem acesso” podem entrar neste espaço com a própria conta.
          </p>
          <RouterLink to="/settings?tab=responsibles"
            >Ver responsáveis <ArrowUpRight :size="14"
          /></RouterLink>
        </div>
      </aside>
    </div>
    <dialog
      ref="inviteDialog"
      class="family-dialog"
      aria-labelledby="invite-title"
      @close="formError = ''"
    >
      <div class="dialog-title">
        <h2 id="invite-title">Convidar para {{ auth.activeFamily?.name }}</h2>
        <button aria-label="Fechar convite" @click="inviteDialog?.close()">
          <X :size="19" />
        </button>
      </div>
      <p v-if="formError" role="alert" class="form-error">{{ formError }}</p>
      <div v-if="inviteLink" class="invite-result">
        <span class="result-icon"><Check :size="24" /></span>
        <h3>Convite criado</h3>
        <p>
          Envie este link para <strong>{{ inviteEmail }}</strong
          >. A pessoa precisa entrar com esse mesmo e-mail para aceitar.
        </p>
        <label for="invite-link">Link de convite</label
        ><input
          id="invite-link"
          :value="inviteLink"
          readonly
          @focus="($event.target as HTMLInputElement).select()"
        /><button class="ui-button primary w-full" @click="copyLink">
          <Copy :size="16" />{{ copied ? "Link copiado" : "Copiar link" }}
        </button>
        <details>
          <summary>Usar código manual</summary>
          <code>{{ inviteCode }}</code>
        </details>
        <p class="text-xs">
          O link é mostrado apenas agora. Você pode revogá-lo na lista de
          convites.
        </p>
      </div>
      <form v-else @submit.prevent="createInvite">
        <p>
          Você está convidando alguém para este espaço, com acesso aos seus
          dados financeiros.
        </p>
        <label for="invite-email">E-mail da pessoa</label
        ><input
          id="invite-email"
          v-model="inviteEmail"
          type="email"
          autocomplete="email"
          required
          placeholder="nome@exemplo.com"
        /><label for="invite-role">Permissão de acesso</label
        ><select id="invite-role" v-model="inviteRole">
          <option value="MEMBER">
            Membro — consultar e registrar lançamentos
          </option>
          <option value="ADMIN">Administrador — gerenciar o espaço</option>
        </select>
        <div class="dialog-actions">
          <button
            type="button"
            class="ui-button secondary"
            @click="inviteDialog?.close()"
          >
            Voltar</button
          ><button :disabled="busy" class="ui-button primary">
            {{ busy ? "Criando…" : "Criar convite" }}
          </button>
        </div>
      </form>
    </dialog>
    <dialog
      ref="acceptDialog"
      class="family-dialog"
      aria-labelledby="accept-title"
      @close="formError = ''"
    >
      <div class="dialog-title">
        <h2 id="accept-title">Entrar em um espaço</h2>
        <button aria-label="Fechar" @click="acceptDialog?.close()">
          <X :size="19" />
        </button>
      </div>
      <p v-if="formError" role="alert" class="form-error">{{ formError }}</p>
      <form @submit.prevent="acceptInvite">
        <p>
          Cole o link ou código que você recebeu. Você está entrando como
          <strong>{{ auth.user?.email }}</strong
          >.
        </p>
        <label for="accept-code">Link ou código de convite</label
        ><input
          id="accept-code"
          v-model="acceptCode"
          required
          placeholder="Cole o convite aqui"
          autocomplete="off"
        />
        <p>
          Aceitar dá acesso a outro espaço. Seus dados atuais não serão movidos
          ou misturados.
        </p>
        <div class="dialog-actions">
          <button
            type="button"
            class="ui-button secondary"
            @click="acceptDialog?.close()"
          >
            Voltar</button
          ><button :disabled="busy" class="ui-button primary">
            {{ busy ? "Entrando…" : "Aceitar e abrir espaço" }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>
