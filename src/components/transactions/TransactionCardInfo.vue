<script setup lang="ts">
import { computed } from 'vue';
import BankLogo from '@/components/ui/BankLogo.vue';
import type { Transaction } from '@/types';
const props = defineProps<{ transaction: Transaction }>();
const invoiceLink = computed(() => props.transaction.card_id && (props.transaction.is_invoice_payment || props.transaction.payment_mode === 'CREDIT') ? {
  path: '/invoices', query: { card: props.transaction.card_id, ...(props.transaction.invoice_year && props.transaction.invoice_month ? { year: String(props.transaction.invoice_year), month: String(props.transaction.invoice_month) } : {}) },
} : null);
const mode = computed(() => props.transaction.is_invoice_payment ? 'Pagamento de fatura' : props.transaction.payment_mode === 'CREDIT' ? 'Crédito' : props.transaction.payment_mode === 'DEBIT' ? 'Débito' : 'Cartão');
</script>
<template>
  <div v-if="transaction.card_id" class="transaction-card-info">
    <BankLogo :name="transaction.card_bank_name || transaction.card_name || transaction.account_bank_name" :size="28"/>
    <div><RouterLink v-if="invoiceLink" :to="invoiceLink" class="card-link">{{ transaction.card_name || 'Cartão vinculado' }}<span v-if="transaction.card_last_digits"> · final {{ transaction.card_last_digits }}</span></RouterLink><strong v-else>{{ transaction.card_name || 'Cartão vinculado' }}<span v-if="transaction.card_last_digits"> · final {{ transaction.card_last_digits }}</span></strong><small>{{ mode }}<span v-if="transaction.invoice_label"> · {{ transaction.invoice_label }}</span></small><RouterLink v-if="transaction.recurrence_id" to="/subscriptions" class="card-link">Assinatura / recorrente</RouterLink></div>
  </div>
  <p v-else-if="transaction.type === 'DESPESA'" class="no-card">Pela conta · Sem cartão vinculado</p>
</template>
<style scoped>
.transaction-card-info { display:flex; gap:8px; align-items:flex-start; margin-top:8px; color:var(--accent); white-space:normal; min-width:160px; font-size:14px; line-height:1.5; }.transaction-card-info svg {flex-shrink:0; margin-top:2px;}.transaction-card-info strong,.card-link {font-weight:600;}.card-link {text-decoration:underline;text-underline-offset:3px;}.transaction-card-info small {display:block;font-size:13px;color:var(--muted);}.no-card {font-size:13px;color:var(--muted);margin-top:6px;white-space:normal;}
</style>
