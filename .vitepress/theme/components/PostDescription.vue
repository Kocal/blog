<script setup lang="ts">
import { toRefs } from 'vue';

const props = defineProps<{ description: string }>();
const { description } = toRefs(props);
</script>

<template>
  <section class="prose prose-sm dark:prose-invert max-w-none my-3">
    <p>{{ description }}</p>
  </section>
</template>
