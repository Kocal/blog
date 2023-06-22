<script setup lang="ts">
import { useData } from 'vitepress'
import Home from "./Home.vue";
import NotFound from "./NotFound.vue";
import Post from "./Post.vue";

// https://vitepress.dev/reference/runtime-api#usedata
const { site, page, frontmatter } = useData()
</script>

<template>
  <header>
      The header
  </header>

  <main>
      <Home v-if="frontmatter.layout === 'home'" />
      <NotFound v-else-if="page.isNotFound" />
      <Post v-else />
  </main>

  <footer>
      The footer
  </footer>
</template>
