<script setup lang="ts">
import { computed,ref,watch } from 'vue';
import { Landmark,Repeat2 } from 'lucide-vue-next';
const props=defineProps<{src?:string;label?:string;size?:number;kind?:'bank'|'subscription';background?:string}>();
const failed=ref(false),pixels=computed(()=>Math.min(72,Math.max(24,props.size||44)));
watch(()=>props.src,()=>{failed.value=false;});
</script>
<template><span class="brand-mark" :style="{width:`${pixels}px`,height:`${pixels}px`,background:background || '#fff'}"><img v-if="src && !failed" :src="src" :alt="label || 'Marca'" decoding="async" @error="failed=true"/><Repeat2 v-else-if="kind==='subscription'" :size="Math.round(pixels*.55)" :aria-label="label || 'Assinatura'"/><Landmark v-else :size="Math.round(pixels*.55)" :aria-label="label || 'Banco'"/></span></template>
<style scoped>.brand-mark{display:inline-flex;flex-shrink:0;align-items:center;justify-content:center;aspect-ratio:1;padding:5px;border-radius:12px;background:#fff;color:var(--accent);border:1px solid var(--line);overflow:hidden;vertical-align:middle;}.brand-mark img{display:block;width:100%;height:100%;object-fit:contain;}.brand-mark:has(img){color:inherit;}</style>
