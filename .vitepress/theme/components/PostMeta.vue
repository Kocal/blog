<script setup lang="ts">
import { toRefs } from 'vue';
import VPLink from 'vitepress/dist/client/theme-default/components/VPLink.vue';
import { ClockIcon, TagIcon } from '@heroicons/vue/24/outline/index.js';

const props = withDefaults(
  defineProps<{
    date: string | undefined;
    lang: string | undefined;
    tags: Array<string>;
  }>(),
  {
    lang: 'en',
  }
);
const { date, lang, tags } = toRefs(props);

const dateTimeFormatter = new Intl.DateTimeFormat(lang.value, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

function formatDate(date: string) {
  return dateTimeFormatter.format(new Date(date), {});
}
</script>

<template>
  <div v-if="date || tags.length > 0">
    <div v-if="date" class="flex md:inline-flex items-center mb-2 md:mb-0 mr-3">
      <ClockIcon class="h-5 mr-1" />
      <time :datetime="date" class="md:text-sm">{{ formatDate(date) }}</time>
    </div>
    <div v-if="tags.length > 0" class="flex md:inline-flex items-center flex-wrap">
      <TagIcon class="h-5 mr-1" />
      <VPLink v-for="tag in tags" :key="tag" class="md:text-sm inline py-2 mr-2" :href="`/tags/${tag}.html`">
        {{ tag }}
      </VPLink>
    </div>
  </div>
</template>
