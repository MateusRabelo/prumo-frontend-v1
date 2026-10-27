<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Landmark } from 'lucide-vue-next';
import { bankLogo } from '@/utils/banks';
const props = defineProps<{ name?: string | null; size?: number }>();
const failed = ref(false);
const src = computed(() => bankLogo(props.name || ''));
watch(src, () => { failed.value = false; });
</script>
<template><span class="bank-logo" :style="{ width: `${size || 44}px`, height: `${size || 44}px` }"><img v-if="src && !failed" :src="src" :alt="name || 'Banco'" @error="failed = true" /><Landmark v-else :size="24" aria-hidden="true" /></span></template>
<style scoped>.bank-logo { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; padding: 5px; border-radius: 12px; background: white; color: var(--accent); border: 1px solid var(--line); }.bank-logo img { width: 100%; height: 100%; object-fit: contain; }</style>
