<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/services/api';
import { formatBRL, formatDateBR } from '@/utils/formatters';
import type { CreditCard, FinancialAccount, CardInvoiceResponse } from '@/types';
import { cardCycle } from '@/utils/cardCycle';
import BankLogo from "@/components/ui/BankLogo.vue";
import CardInvoiceModal from '@/components/cards/CardInvoiceModal.vue';
import AppDialog from '@/components/ui/AppDialog.vue';
import { Receipt, Plus, X, ArrowUpRight, Wallet, AlertCircle } from 'lucide-vue-next';
interface Overview {
  bank_balance: number; available_for_payment: number; total_amount: number;
  paid_amount: number; remaining_amount: number; shortfall: number; balance_after_payment: number;
  invoices: { card_name: string; invoice: CardInvoiceResponse }[];
}
const now = new Date();
const period = ref(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
const selectedPeriod = computed(() => ({ year: Number(period.value.split('-')[0]), month: Number(period.value.split('-')[1]) }));
const data = ref<Overview | null>(null);
const accounts = ref<FinancialAccount[]>([]);
const cards = ref<CreditCard[]>([]);
const loading = ref(true);
const error = ref('');
const selectedCard = ref<CreditCard | null>(null);
const showCreate = ref(false);
const creating = ref(false);
const createError = ref('');
const createCardId = ref('');
const createMonth = ref(period.value);
const openedPeriod = ref(selectedPeriod.value);
let requestSequence = 0;
const creditCards = computed(() => cards.value.filter(c => ['CREDIT', 'MULTIPLE'].includes(c.card_type)));
const openCycles = computed(() => [...new Map(creditCards.value.map(card => { const cycle = cardCycle(card, `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`); return [`${cycle.year}-${String(cycle.month).padStart(2,'0')}`, cycle] as const; })).entries()].filter(([key]) => key !== period.value));
function selectCycle(key: string) { period.value = key; load(); }
const coverage = computed(() => data.value && Number(data.value.remaining_amount) > 0
  ? Math.min(100, Math.max(0, Number(data.value.available_for_payment) / Number(data.value.remaining_amount) * 100)) : 100);
async function load() {
  const sequence = ++requestSequence;
  loading.value = true;
  error.value = '';
  try {
    const [overview, bank, card] = await Promise.all([
      api.get('/cards/invoices/overview', { params: selectedPeriod.value }),
      api.get('/settings/accounts'), api.get('/cards'),
    ]);
    if (sequence !== requestSequence) return;
    data.value = overview.data; accounts.value = bank.data; cards.value = card.data;
  } catch (err: any) {
    if (sequence === requestSequence) error.value = err.response?.data?.detail || 'Não foi possível carregar as faturas. Tente novamente.';
  } finally { if (sequence === requestSequence) loading.value = false; }
}
function openInvoice(invoice: CardInvoiceResponse) {
  const card = cards.value.find(c => c.id === invoice.card_id);
  if (card) { openedPeriod.value = { year: invoice.year, month: invoice.month }; selectedCard.value = card; }
}
function startCreate() {
  createCardId.value = creditCards.value[0]?.id || '';
  createMonth.value = period.value;
  createError.value = '';
  showCreate.value = true;
}
async function createInvoice() {
  if (creating.value) return;
  const [year, month] = createMonth.value.split('-').map(Number);
  if (!createCardId.value || !year || !month) return;
  creating.value = true;
  createError.value = '';
  try {
    const res = await api.post(`/cards/${createCardId.value}/invoices/${year}/${month}`);
    period.value = createMonth.value;
    await load();
    showCreate.value = false;
    openInvoice(res.data);
  } catch (err: any) { createError.value = err.response?.data?.detail || 'Não foi possível cadastrar a fatura.'; }
  finally { creating.value = false; }
}
onMounted(load);
</script>

<template>
  <div class="invoice-page">
    <header class="page-heading">
      <div><p class="eyebrow">DIA A DIA</p><h1>Faturas</h1><p>Do que você compra no crédito ao dinheiro que precisa para quitar o mês.</p></div>
      <button type="button" class="ui-button primary" @click="startCreate"><Plus :size="20" />Cadastrar fatura</button>
    </header>
    <div class="invoice-period"><label for="invoice-month">Mês de vencimento</label><input id="invoice-month" v-model="period" type="month" min="2000-01" max="2100-12" required @change="period && load()" /></div>
    <div v-if="openCycles.length" class="flex flex-wrap items-center gap-3"><span class="field-help">O mês acima é o de vencimento. Compras de hoje, após o fechamento, entram em:</span><button v-for="[key, cycle] in openCycles" :key="key" type="button" class="ui-button" @click="selectCycle(key)">{{ cycle.label }} →</button></div>
    <div v-if="error" role="alert" class="form-error">{{ error }} <button type="button" class="ui-button" @click="load">Tentar novamente</button></div>
    <p v-else-if="loading" role="status">Conferindo suas faturas e contas…</p>
    <template v-else-if="data">
      <section class="invoice-funding" aria-labelledby="invoice-funding-title">
        <div class="invoice-funding-main">
          <p class="eyebrow">SEU PLANO DE PAGAMENTO</p>
          <h2 id="invoice-funding-title">{{ Number(data.remaining_amount) === 0 ? 'Nenhum valor pendente neste mês.' : Number(data.shortfall) > 0 ? 'Vamos completar o valor das faturas.' : 'O saldo cobre as faturas deste mês.' }}</h2>
          <p v-if="Number(data.shortfall) > 0">Faltam <strong>{{ formatBRL(data.shortfall) }}</strong> para quitar as faturas deste mês com o saldo disponível hoje.</p>
          <p v-else-if="Number(data.remaining_amount) > 0">Após quitar este mês, o saldo somado das contas será de <strong>{{ formatBRL(data.balance_after_payment) }}</strong>.</p>
          <progress :value="coverage" max="100" aria-label="Cobertura das faturas com o saldo disponível" />
          <p class="field-help">{{ Math.round(coverage) }}% do valor pendente coberto. O saldo é compartilhado entre todas as faturas, sem contá-lo duas vezes.</p>
        </div>
        <dl class="invoice-numbers">
          <div><dt>Nas contas hoje</dt><dd>{{ formatBRL(data.bank_balance) }}</dd></div>
          <div><dt>Faturas do mês</dt><dd>{{ formatBRL(data.total_amount) }}</dd></div>
          <div><dt>Já pago</dt><dd>{{ formatBRL(data.paid_amount) }}</dd></div>
          <div><dt>Ainda falta pagar</dt><dd>{{ formatBRL(data.remaining_amount) }}</dd></div>
        </dl>
      </section>
      <p class="invoice-explanation"><AlertCircle :size="20" aria-hidden="true" /><span>Usamos os saldos registrados nas contas correntes, poupanças e carteiras deste espaço. Investimentos, receitas previstas, outras despesas e faturas de outros meses não entram nesta comparação. Mantenha seus saldos atualizados.</span></p>
      <section aria-labelledby="invoice-list-title">
        <h2 id="invoice-list-title">Faturas com vencimento neste mês</h2>
        <div v-if="!data.invoices.length" class="invoice-empty"><Receipt :size="36" /><h3>Comece pela sua primeira fatura</h3><p>Escolha o cartão e o mês. Depois adicione suas compras, uma a uma, dentro da fatura.</p><button type="button" class="ui-button primary" @click="startCreate">Cadastrar fatura</button></div>
        <div v-else class="invoice-list">
          <article v-for="row in data.invoices" :key="row.invoice.card_id" class="invoice-row">
            <div class="invoice-row-title"><BankLogo :name="cards.find(c => c.id === row.invoice.card_id)?.bank_name || row.card_name" /><div><h3>{{ row.card_name }}</h3><p>Vence {{ formatDateBR(row.invoice.due_date) }} · {{ row.invoice.items_count }} compras</p><p>Compras de {{ formatDateBR(row.invoice.cycle_start_date) }} a {{ formatDateBR(row.invoice.closing_date) }}</p><p v-if="row.invoice.external_settled">Pagamento confirmado fora do Prumo</p></div></div>
            <div><span class="invoice-state" :class="{ paid: row.invoice.status === 'PAGA' }">{{ ({ PAGA: 'Paga', ABERTA: 'Aberta', FECHADA: 'Fechada', VENCIDA: 'Vencida' })[row.invoice.status] }}</span><p>Total {{ formatBRL(row.invoice.total_amount) }} · Pago {{ formatBRL(row.invoice.paid_amount) }}</p></div>
            <div class="invoice-row-amount"><small>Falta pagar</small><strong>{{ formatBRL(row.invoice.remaining_amount) }}</strong></div>
            <button type="button" class="ui-button" :aria-label="`Abrir fatura ${row.card_name}`" @click="openInvoice(row.invoice)">Ver compras e pagar<ArrowUpRight :size="18" /></button>
          </article>
        </div>
      </section>
      <aside class="invoice-how"><Wallet :size="24" /><div><h3>Compra no cartão, pagamento no banco.</h3><p>Adicionar uma compra aumenta a fatura, sem tirar dinheiro da sua conta. Ao pagar, escolha a conta de débito. O Prumo reduz o saldo bancário e o valor pendente sem duplicar a despesa. Você também pode pagar parcialmente com contas diferentes.</p></div></aside>
    </template>
    <AppDialog v-if="showCreate" @close="showCreate = false">
      <form class="dialog-content invoice-create" @submit.prevent="createInvoice">
        <div class="flex justify-between gap-4"><div><h2>Cadastrar fatura</h2><p>Uma fatura por cartão e mês de vencimento.</p></div><button type="button" aria-label="Fechar cadastro de fatura" @click="showCreate = false"><X :size="24" /></button></div>
        <p v-if="createError" role="alert" class="form-error">{{ createError }}</p>
        <template v-if="creditCards.length">
          <label for="invoice-card">Cartão de crédito</label><select id="invoice-card" v-model="createCardId" required><option v-for="card in creditCards" :key="card.id" :value="card.id">{{ card.name }}</option></select>
          <label for="invoice-create-month">Mês de vencimento</label><input id="invoice-create-month" v-model="createMonth" type="month" min="2000-01" max="2100-12" required />
          <p class="field-help">Se a fatura já existir, vamos abri-la. Depois você pode adicionar as compras e acompanhar o total.</p>
          <button type="submit" class="ui-button primary" :disabled="creating">{{ creating ? 'Abrindo…' : 'Abrir fatura e adicionar compras' }}</button>
        </template>
        <p v-else>Cadastre um cartão de crédito em <RouterLink to="/accounts-cards" class="underline font-bold" @click="showCreate = false">Contas e cartões</RouterLink> para começar.</p>
      </form>
    </AppDialog>
    <CardInvoiceModal v-if="selectedCard" :card="selectedCard" :accounts="accounts" :initial-period="openedPeriod" @close="selectedCard = null" @invoice-paid="load" />
  </div>
</template>

<style scoped>
.invoice-page { display: grid; gap: 28px; }
.page-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; flex-wrap: wrap; }
.page-heading p:not(.eyebrow) { color: var(--muted); margin-top: 12px; max-width: 64ch; }
.eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .12em; color: var(--accent); margin-bottom: 10px; }
.invoice-period { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; font-weight: 600; }
.invoice-period input { border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; background: white; min-height: 48px; }
.invoice-funding { display: grid; grid-template-columns: 1.3fr 1fr; gap: 40px; padding: 32px; background: #e8f1ed; border-radius: 20px; }
.invoice-funding h2 { font-size: 28px; margin-bottom: 16px; }
.invoice-funding p { line-height: 1.6; }
.invoice-funding progress { display: block; width: 100%; height: 10px; margin: 24px 0 10px; border: 0; border-radius: 10px; overflow: hidden; accent-color: var(--accent); }
progress::-webkit-progress-bar { background: #c9ddd3; } progress::-webkit-progress-value { background: var(--accent); } progress::-moz-progress-bar { background: var(--accent); }
.invoice-numbers { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-content: center; }
.invoice-numbers dt { font-size: 14px; color: var(--muted); margin-bottom: 6px; }
.invoice-numbers dd { font-size: 26px; font-family: var(--fonte-titulo); font-weight: 700; overflow-wrap: anywhere; }
.invoice-explanation { display: flex; align-items: flex-start; gap: 12px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.invoice-explanation svg { flex-shrink: 0; margin-top: 2px; }
.invoice-list { display: grid; gap: 12px; margin-top: 20px; }
.invoice-row { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding: 24px; border: 1px solid var(--line); border-radius: 16px; background: white; flex-wrap: wrap; }
.invoice-row-title { display: flex; align-items: center; gap: 14px; }
.invoice-row-title svg { color: var(--accent); flex-shrink: 0; }
.invoice-row h3 { font-size: 20px; }
.invoice-row p { color: var(--muted); font-size: 14px; margin-top: 6px; }
.invoice-state { color: #8a4c11; font-size: 13px; font-weight: 700; }.invoice-state.paid { color: var(--accent); }
.invoice-row-amount { display: grid; gap: 4px; }.invoice-row-amount small { color: var(--muted); }.invoice-row-amount strong { font-size: 22px; }
.invoice-empty { display: grid; justify-items: center; text-align: center; gap: 16px; padding: 48px 24px; margin-top: 20px; background: white; border: 1px dashed var(--line); border-radius: 16px; }.invoice-empty p { max-width: 50ch; color: var(--muted); }
.invoice-how { display: flex; gap: 18px; padding-top: 12px; }.invoice-how svg { flex-shrink: 0; color: var(--accent); }.invoice-how p { max-width: 85ch; margin-top: 10px; color: var(--muted); line-height: 1.6; }
.invoice-create { display: grid; gap: 16px; }.invoice-create input, .invoice-create select { width: 100%; min-height: 48px; border-radius: 12px; border: 1px solid var(--line); padding: 10px 12px; }
@media (max-width: 800px) { .invoice-funding { grid-template-columns: 1fr; padding: 24px; gap: 28px; }.invoice-row { gap: 18px; }.invoice-row > .ui-button { width: 100%; }.invoice-row-title { width: 100%; }.invoice-numbers dd { font-size: 24px; } }
</style>
