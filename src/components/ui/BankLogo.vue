<script setup lang="ts">
import { computed } from 'vue';
import BrandMark from './BrandMark.vue';
import { bankLogo } from '@/utils/banks';
const props=defineProps<{name?:string|null;size?:number}>();
const src=computed(()=>bankLogo(props.name||''));
</script>
<template><BrandMark :src="src" :label="name || 'Banco'" :size="size" kind="bank"/></template>
