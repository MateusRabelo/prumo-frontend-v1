<script setup lang="ts">
defineProps<{ light?: boolean; compact?: boolean }>();
</script>
<template>
  <span class="prumo-logo" :class="{ light, compact }" aria-label="Prumo">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect x="16" y="6" width="11" height="42" rx="5.5" fill="currentColor" />
      <circle
        cx="36"
        cy="22"
        r="11.5"
        fill="none"
        stroke="currentColor"
        stroke-width="10"
      />
      <circle cx="21.5" cy="57" r="5" fill="#E9A23B" />
    </svg>
    <img
      v-if="!compact"
      src="/prumo-wordmark.svg"
      class="prumo-wordmark"
      alt=""
      aria-hidden="true"
    />
  </span>
</template>
