<script setup>
import DefaultTheme from 'vitepress/theme';
import { default as Giscus } from '@giscus/vue';
import { useData } from 'vitepress';

const { frontmatter } = useData();
const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template v-if="frontmatter.$layout !== 'tag'" #doc-after>
      <Giscus
        repo="Kocal/blog"
        repo-id="MDEwOlJlcG9zaXRvcnkyMzEyNTQzNjM="
        category="Comments"
        category-id="DIC_kwDODcipW84CYDWr"
        mapping="pathname"
        strict="0"
        reactions-enabled="1"
        emit-metadata="0"
        input-position="top"
        theme="preferred_color_scheme"
        lang="fr"
        loading="lazy"
      />
    </template>
  </Layout>
</template>
