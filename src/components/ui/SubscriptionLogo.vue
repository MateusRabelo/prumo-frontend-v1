<script setup lang="ts">
import { computed } from 'vue';
import BrandMark from './BrandMark.vue';
import { subscriptionBrand } from '@/utils/subscriptionBrands';
const props=defineProps<{name:string;size?:number}>();
const brand=computed(()=>subscriptionBrand(props.name));
</script>
<template><BrandMark :src="brand ? `/subscriptions/${brand.file}` : undefined" :label="brand?.name || name" :size="size" :background="brand?.background" kind="subscription"/></template>
