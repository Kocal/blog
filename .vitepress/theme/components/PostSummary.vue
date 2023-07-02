<script setup lang="ts">
import { toRefs } from 'vue';

const props = defineProps<{ summary: string }>();
const { summary } = toRefs(props);
</script>

<template>
  <section class="prose prose-sm dark:prose-invert max-w-none my-3">
    <p>{{ summary }}</p>
  </section>
</template>
