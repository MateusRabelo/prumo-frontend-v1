<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/services/api';
import { formatBRL, formatDateBR } from '@/utils/formatters';
import type { FinancialAccount, CreditCard, Category } from '@/types';
import { FileUp, Check, ArrowRight, Trash2, Lightbulb, AlertCircle } from 'lucide-vue-next';
import { useFeedback } from '@/composables/useFeedback';
interface Row {
  index: number; date: string; amount: string; original_description: string; description: string;
  detectedType: boolean; suggestedCategory: string | null; type: 'RECEITA' | 'DESPESA' | ''; category_id: string | null; blocked: boolean; warning: string;
  duplicate: boolean; possible_installment?: boolean; refunded_in_statement?: boolean; possible_duplicate: boolean; learned: boolean; selected: boolean; remember: boolean;
}
interface StatementSummary { issuer: string; year: number; month: number; purchases: string | null; previous_balance: string | null; amount_due: string | null; recognized_credits: string; recognized_payments: string; totals_match: boolean | null; requires_reconciliation: boolean }
interface Rule { id: string; merchant: string; description: string }
const accounts = ref<FinancialAccount[]>([]), cards = ref<CreditCard[]>([]), categories = ref<Category[]>([]);
const rules = ref<Rule[]>([]);
const source = ref<'bank' | 'card'>('bank');
const accountId = ref(''), cardId = ref('');
const now = new Date();
const referenceMonth = ref(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
const file = ref<File | null>(null), fileInput = ref<HTMLInputElement | null>(null);
const rows = ref<Row[]>([]), warnings = ref<string[]>([]), token = ref('');
const statement = ref<StatementSummary | null>(null);
const reconciliationReviewed = ref(false);
const loading = ref(false), saving = ref(false), initializing = ref(true), reviewed = ref(false);
const error = ref(''), result = ref<{ imported: number; skipped: number } | null>(null);
const feedback = useFeedback();
const liquidAccounts = computed(() => accounts.value.filter(a => ['CHECKING', 'SAVINGS', 'WALLET'].includes(a.account_type)));
const creditCards = computed(() => cards.value.filter(c => ['CREDIT', 'MULTIPLE'].includes(c.card_type)));
const selected = computed(() => rows.value.filter(row => row.selected && !row.blocked && !row.duplicate));
const unresolved = computed(() => selected.value.some(row => !row.type || !row.description.trim()));
const totals = computed(() => selected.value.reduce((total, row) => {
  const cents = Math.round(Number(row.amount) * 100);
  if (row.type === 'RECEITA') total.income += cents;
  if (row.type === 'DESPESA') total.expense += cents;
  return total;
}, { income: 0, expense: 0 }));
function availableCategories(row: Row) { return categories.value.filter(c => c.type === 'AMBOS' || c.type === row.type); }
async function loadRules() { rules.value = (await api.get('/imports/rules')).data; }
onMounted(async () => {
  try {
    const [a, c, cat] = await Promise.all([api.get('/settings/accounts'), api.get('/cards'), api.get('/settings/categories'), loadRules()]);
    accounts.value = a.data; cards.value = c.data; categories.value = cat.data;
    accountId.value = liquidAccounts.value[0]?.id || ''; cardId.value = creditCards.value[0]?.id || '';
  } catch { error.value = 'Não foi possível carregar as contas e regras. Atualize a página para tentar novamente.'; }
  finally { initializing.value = false; }
});
function chooseFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] || null;
  result.value = null;
}
async function preview() {
  if (loading.value || !file.value || !accountId.value) return;
  error.value = '';
  result.value = null;
  if (file.value.size > 4 * 1024 * 1024) { error.value = 'O arquivo deve ter até 4 MB.'; return; }
  if (source.value === 'card' && !cardId.value) { error.value = 'Selecione o cartão desta fatura.'; return; }
  const form = new FormData();
  form.append('file', file.value); form.append('account_id', accountId.value); form.append('reference_month', referenceMonth.value);
  if (source.value === 'card') form.append('card_id', cardId.value);
  loading.value = true;
  try {
    const res = await api.post('/imports/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    rows.value = res.data.rows.map((row: Row) => ({ ...row, detectedType: !!row.type, suggestedCategory: row.category_id, type: row.type || '', selected: !row.blocked && !row.duplicate && !row.possible_duplicate && !row.possible_installment && !row.refunded_in_statement, remember: false }));
    for (const row of rows.value) {
      if (row.category_id && !availableCategories(row).some(c => c.id === row.category_id)) row.category_id = null;
    }
    statement.value = res.data.statement || null; reconciliationReviewed.value = false;
    warnings.value = res.data.warnings; token.value = res.data.preview_token; reviewed.value = false;
  } catch (err: any) { error.value = typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível ler o arquivo. Tente exportar novamente pelo banco.'; }
  finally { loading.value = false; }
}
function rename(row: Row) { row.remember = row.description.trim() !== row.original_description; reviewed.value = false; }
function reset() { statement.value = null; reconciliationReviewed.value = false; token.value = ''; rows.value = []; reviewed.value = false; error.value = ''; }
function changeType(row: Row) {
  row.category_id = availableCategories(row).some(c => c.id === row.suggestedCategory) ? row.suggestedCategory : null;
  reviewed.value = false;
}
async function confirmImport() {
  if (saving.value || !reviewed.value || !selected.value.length || unresolved.value || statement.value?.totals_match === false || (statement.value?.requires_reconciliation && !reconciliationReviewed.value)) return;
  saving.value = true; error.value = '';
  try {
    const res = await api.post('/imports/confirm', { preview_token: token.value, reviewed: true, reconciliation_reviewed: reconciliationReviewed.value, entries: selected.value.map(row => ({ index: row.index, description: row.description, type: row.type, category_id: row.category_id || null, remember: row.remember })) });
    result.value = res.data; reset(); file.value = null; if (fileInput.value) fileInput.value.value = '';
    await loadRules().catch(() => feedback.notify('Lançamentos salvos. Não foi possível atualizar a lista de regras agora.'));
  } catch (err: any) { error.value = typeof err.response?.data?.detail === 'string' ? err.response.data.detail : 'Não foi possível salvar a importação. Confira os lançamentos antes de tentar novamente.'; }
  finally { saving.value = false; }
}
async function removeRule(rule: Rule) {
  if (!await feedback.confirm(`Esquecer a regra “${rule.description}”? Os lançamentos já salvos serão mantidos.`)) return;
  try { await api.delete(`/imports/rules/${rule.id}`); await loadRules(); }
  catch { feedback.notify('Não foi possível remover a regra.'); }
}
</script>

<template>
  <div class="import-page">
    <header><p class="import-eyebrow">MENOS DIGITAÇÃO, MAIS CLAREZA</p><h1>Importar extrato</h1><p class="import-intro">Envie o arquivo, confira cada lançamento e salve só o que estiver certo.</p></header>
    <p v-if="initializing" role="status">Carregando suas contas…</p>
    <div v-if="error" class="form-error" role="alert">{{ error }}</div>
    <section v-if="result" class="import-success" role="status"><Check :size="24" /><div><h2>{{ result.imported }} lançamentos importados</h2><p v-if="result.skipped">{{ result.skipped }} duplicados ignorados.</p><p>Confira em <RouterLink to="/transactions">Lançamentos</RouterLink> ou em <RouterLink to="/invoices">Faturas</RouterLink>.</p></div></section>
    <form v-if="!initializing && !token" class="import-source" @submit.prevent="preview">
      <h2>1. De onde vem o arquivo?</h2>
      <div class="import-fields">
        <div><label for="import-source">Tipo de extrato</label><select id="import-source" v-model="source"><option value="bank">Conta bancária</option><option value="card">Fatura de cartão de crédito</option></select></div>
        <div><label for="import-account">{{ source === 'card' ? 'Conta de referência do cartão' : 'Conta que receberá os lançamentos' }}</label><select id="import-account" v-model="accountId" required><option v-for="account in liquidAccounts" :key="account.id" :value="account.id">{{ account.name }}</option></select></div>
        <div v-if="source === 'card'"><label for="import-card">Cartão da fatura</label><select id="import-card" v-model="cardId" required><option v-for="card in creditCards" :key="card.id" :value="card.id">{{ card.name }}</option></select></div>
        <div><label for="import-month">Mês de referência do arquivo</label><input id="import-month" v-model="referenceMonth" type="month" min="2000-01" max="2100-12" required /></div>
      </div>
      <p v-if="source === 'card'" class="field-help">As compras vão para as faturas conforme a data e o ciclo do cartão. A conta de referência não será debitada agora. Parcelas já cadastradas devem ser desmarcadas na prévia para evitar duplicação.</p>
      <p v-else class="field-help">Importe somente lançamentos ainda não cadastrados. Transferências entre suas próprias contas devem ser registradas como transferência em Lançamentos, para não aparecerem como renda ou despesa.</p>
      <p class="field-help">O mês ajuda a identificar o ano quando o PDF mostra somente dia e mês. Confira datas de dezembro e janeiro na prévia.</p>
      <label for="import-file" class="import-upload"><FileUp :size="28" /><span><strong>Escolha um PDF, CSV ou OFX</strong><small>PDF com texto selecionável · até 4 MB e 30 páginas · até 500 lançamentos</small></span></label>
      <input id="import-file" ref="fileInput" type="file" accept=".pdf,.csv,.ofx,application/pdf,text/csv" required @change="chooseFile" />
      <p v-if="!liquidAccounts.length">Primeiro, cadastre uma conta em <RouterLink to="/accounts-cards" class="underline">Contas e cartões</RouterLink>.</p>
      <button type="submit" class="ui-button primary" :disabled="loading || !file || !accountId">{{ loading ? 'Lendo o extrato…' : 'Gerar prévia para conferir' }}<ArrowRight :size="18" /></button>
      <p class="field-help">O arquivo é processado no servidor do Prumo, sem envio para provedores de IA. O arquivo original não é mantido após o processamento. A prévia expira em 30 minutos.</p>
    </form>
    <section v-if="token" class="import-review" aria-labelledby="import-review-title">
      <div class="import-review-heading"><div><h2 id="import-review-title">2. Confira antes de salvar</h2><p>{{ source === 'card' ? creditCards.find(c => c.id === cardId)?.name : liquidAccounts.find(a => a.id === accountId)?.name }} · {{ rows.length }} linhas reconhecidas. Nenhum lançamento foi salvo ainda.</p></div><button type="button" class="ui-button" :disabled="saving" @click="reset">Escolher outro arquivo</button></div>
      <section v-if="statement" class="import-statement-summary" aria-label="Resumo reconhecido do PDF">
        <h3>{{ statement.issuer }} · Fatura {{ String(statement.month).padStart(2, '0') }}/{{ statement.year }}</h3>
        <dl><div><dt>Saldo da fatura anterior</dt><dd>{{ statement.previous_balance === null ? 'Não informado' : formatBRL(Number(statement.previous_balance)) }}</dd></div><div><dt>Compras no PDF</dt><dd>{{ formatBRL(Number(statement.purchases)) }}</dd></div><div><dt>Pagamentos recebidos</dt><dd>{{ formatBRL(Number(statement.recognized_payments)) }}</dd></div><div><dt>Estornos e créditos</dt><dd>{{ formatBRL(Number(statement.recognized_credits)) }}</dd></div><div><dt>Total a pagar informado pelo banco</dt><dd>{{ statement.amount_due === null ? 'Não informado' : formatBRL(Number(statement.amount_due)) }}</dd></div></dl>
        <p v-if="statement.totals_match === true">As somas das compras, créditos e pagamentos reconhecidos conferem com o resumo do PDF.</p>
        <p v-else class="import-warning">As somas não puderam ser conferidas com o resumo. Não confirme uma importação incompleta.</p>
        <p>O total de compras não é o valor ainda devido. Pagamentos, créditos e saldo anterior explicam a diferença. As compras selecionadas serão vinculadas ao mês de fatura reconhecido no PDF.</p>
      </section>
      <div class="import-caution"><AlertCircle :size="22" /><p>Compare com o arquivo original: saldos, totais e linhas não reconhecidas ficam fora da importação. Confira especialmente datas, parcelas e pagamentos de fatura. Possíveis duplicados vêm desmarcados; duplicados de importações anteriores não serão salvos novamente.</p></div>
      <details v-if="warnings.length"><summary>{{ warnings.length }} avisos de leitura — confira no arquivo original</summary><ul><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul></details>
      <article v-for="row in rows" :key="row.index" class="import-row" :class="{ excluded: !row.selected || row.blocked || row.duplicate }">
        <div class="import-row-top"><label class="import-check"><input v-model="row.selected" type="checkbox" :disabled="row.blocked || row.duplicate || saving" @change="reviewed = false" /><span>{{ formatDateBR(row.date) }}</span></label><strong>{{ formatBRL(Number(row.amount)) }}</strong><span v-if="row.duplicate">Já importado</span><span v-else-if="row.possible_duplicate">Possível duplicado</span><span v-else-if="row.learned" class="import-learned"><Lightbulb :size="16" />Nome reconhecido</span></div>
        <p class="import-original">No extrato: {{ row.original_description }}</p>
        <div class="import-fields">
          <div><label :for="`import-name-${row.index}`">Nome no Prumo</label><input :id="`import-name-${row.index}`" v-model="row.description" maxlength="255" :disabled="row.blocked || row.duplicate || saving" @input="rename(row)" /></div>
          <div><label :for="`import-type-${row.index}`">Entrada ou saída</label><select :id="`import-type-${row.index}`" v-model="row.type" :disabled="row.blocked || row.duplicate || saving || row.detectedType" @change="changeType(row)"><option value="" disabled>Defina o tipo</option><option value="DESPESA">Saída / despesa</option><option value="RECEITA">Entrada / receita</option></select></div>
          <div><label :for="`import-category-${row.index}`">Categoria</label><select :id="`import-category-${row.index}`" v-model="row.category_id" :disabled="row.blocked || row.duplicate || saving" @change="row.remember = true; reviewed = false"><option :value="null">Sem categoria</option><option v-for="category in availableCategories(row)" :key="category.id" :value="category.id">{{ category.name }}</option></select></div>
        </div>
        <p v-if="row.warning" class="import-warning">{{ row.warning }}</p>
        <label v-if="!row.blocked && !row.duplicate" class="import-check"><input v-model="row.remember" type="checkbox" :disabled="saving" /><span>Lembrar este nome e categoria para “{{ row.original_description }}” nas próximas importações deste espaço.</span></label>
      </article>
      <div class="import-confirm"><h3>{{ selected.length }} lançamentos selecionados</h3><p>Entradas: <strong>{{ formatBRL(totals.income / 100) }}</strong> · Saídas: <strong>{{ formatBRL(totals.expense / 100) }}</strong></p><p v-if="unresolved" class="import-warning">Defina entrada/saída e um nome para todos os lançamentos selecionados.</p><label v-if="statement?.requires_reconciliation" class="import-check"><input v-model="reconciliationReviewed" type="checkbox" :disabled="saving" /><span>Entendi que pagamentos, estornos e saldo anterior não serão lançados automaticamente. Vou conciliá-los em Faturas para que o saldo no Prumo reflita o banco.</span></label><label class="import-check"><input v-model="reviewed" type="checkbox" :disabled="saving" /><span>Conferi as datas, valores, nomes e duplicidades com o arquivo original.</span></label><button type="button" class="ui-button primary" :disabled="saving || !reviewed || unresolved || !selected.length || statement?.totals_match === false || (!!statement?.requires_reconciliation && !reconciliationReviewed)" @click="confirmImport">{{ saving ? 'Salvando…' : `Salvar ${selected.length} lançamentos conferidos` }}</button></div>
    </section>
    <details v-if="rules.length && !token" class="import-rules"><summary>Regras aprendidas neste espaço ({{ rules.length }})</summary><p>Você pode esquecer uma regra para voltar a usar o nome original nas próximas importações.</p><div v-for="rule in rules" :key="rule.id" class="import-rule"><span>{{ rule.merchant }} <ArrowRight :size="16" /> <strong>{{ rule.description }}</strong></span><button type="button" class="icon-button" :aria-label="`Esquecer regra ${rule.description}`" @click="removeRule(rule)"><Trash2 :size="18" /></button></div></details>
  </div>
</template>

<style scoped>
.import-page { display: grid; gap: 28px; max-width: 1200px; }.import-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .1em; color: var(--accent); margin-bottom: 10px; }.import-intro { color: var(--muted); margin-top: 12px; }
.import-source, .import-confirm { display: grid; gap: 20px; padding: 28px; background: white; border: 1px solid var(--line); border-radius: 18px; }
.import-fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 16px; }.import-fields > div { min-width: 0; }.import-fields label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 8px; }.import-fields input, .import-fields select { width: 100%; min-height: 48px; border: 1px solid var(--line); background: white; border-radius: 10px; padding: 10px; font-size: 16px; }
.import-upload { display: flex; align-items: center; gap: 18px; padding: 24px; border: 1px dashed var(--accent); border-radius: 14px; cursor: pointer; color: var(--accent); }.import-upload small { display: block; color: var(--muted); font-size: 13px; margin-top: 8px; }#import-file { max-width: 100%; font-size: 14px; }
.import-statement-summary { display: grid; gap: 16px; padding: 24px; border-radius: 16px; background: #e8f1ed; }.import-statement-summary dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }.import-statement-summary dt { font-size: 14px; color: var(--muted); }.import-statement-summary dd { font-size: 22px; font-weight: 700; margin-top: 6px; }.import-statement-summary p { font-size: 14px; line-height: 1.6; }
.import-review { display: grid; gap: 20px; }.import-review-heading { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 20px; }.import-review-heading p { color: var(--muted); margin-top: 10px; }
.import-caution { display: flex; align-items: flex-start; gap: 12px; padding: 20px; background: #fff4dd; border-radius: 14px; font-size: 14px; line-height: 1.6; }.import-caution svg { flex-shrink: 0; color: #80531b; }
.import-row { padding: 24px; border: 1px solid var(--line); border-radius: 16px; background: white; display: grid; gap: 18px; }.import-row.excluded { background: var(--canvas); }.import-row-top { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }.import-row-top > strong { margin-left: auto; font-size: 20px; }.import-row-top > span { font-size: 13px; font-weight: 600; }.import-original { font-size: 14px; color: var(--muted); overflow-wrap: anywhere; }.import-check { display: flex; gap: 12px; align-items: flex-start; line-height: 1.5; font-size: 14px; }.import-check input { width: 22px; height: 22px; flex-shrink: 0; margin-top: 1px; accent-color: var(--accent); }.import-warning { color: #80531b; font-size: 14px; line-height: 1.6; }.import-learned { display: flex; align-items: center; gap: 5px; color: var(--accent); }
.import-success { display: flex; gap: 16px; background: #e8f1ed; padding: 24px; border-radius: 16px; }.import-success a { text-decoration: underline; font-weight: 600; }.import-success p { margin-top: 8px; }
.import-rules { border-top: 1px solid var(--line); padding-top: 20px; }.import-rules > p { color: var(--muted); margin: 16px 0; }.import-rule { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 12px 0; border-bottom: 1px solid var(--line); }.import-rule > span { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; overflow-wrap: anywhere; }summary { font-weight: 600; cursor: pointer; min-height: 44px; }details ul { margin: 12px 0; padding-left: 20px; }details li { margin: 8px 0; color: var(--muted); font-size: 14px; }
@media (max-width: 600px) { .import-source, .import-confirm, .import-row { padding: 20px; }.import-fields { grid-template-columns: 1fr; }.import-upload { padding: 18px; align-items: flex-start; }.import-source > .ui-button { width: 100%; } }
</style>
