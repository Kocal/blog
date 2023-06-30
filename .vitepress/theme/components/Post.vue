<script setup lang="ts">
import {Post} from "../posts.data";
import {toRefs} from "vue";
import VPLink from "vitepress/dist/client/theme-default/components/VPLink.vue"
import PostMeta from "./PostMeta.vue";
import PostSummary from "./PostSummary.vue";

const props = defineProps<{ post: Post }>();
const {post} = toRefs(props);
</script>

<template>
    <article itemscope itemtype="https://schema.org/BlogPosting" :itemid="post.url" class="px-2">
        <header>
            <h2>
                <VPLink itemprop="name" :href="post.url" class="text-lg md:text-2xl tracking-tight font-bold">
                    {{ post.title }}
                </VPLink>
            </h2>
        </header>

        <PostSummary :summary="post.summary" />

        <footer>
            <PostMeta :date="post.date.iso" :tags="post.tags" :lang="post.lang"/>
        </footer>
    </article>
</template>
