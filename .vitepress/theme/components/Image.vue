<script setup lang="ts">
import { withBase } from 'vitepress';
import { toRefs } from 'vue';

const props = defineProps({
  src: {
    type: String,
    required: true,
  },
  alt: {
    type: String,
    required: true,
  },
  loading: {
    type: String,
    default: 'lazy',
  },
});

const { src, alt, loading } = toRefs(props);
</script>

<template>
  <img decoding="async" v-bind="$attrs" :src="withBase(src)" :alt="alt" :loading="loading" />
</template>
