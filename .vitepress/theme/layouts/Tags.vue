<script setup lang="ts">
import {data as posts} from '../posts.data';
import Posts from "../components/Posts.vue";
import {useTitle, useUrlSearchParams} from "@vueuse/core";
import {computed, watch} from 'vue';
import {useData} from "vitepress";

const {frontmatter, site} = useData();

const tags = posts.reduce((acc, post) => {
    post.tags.forEach(tag => {
        if (acc[tag]) {
            acc[tag] += 1;
        } else {
            acc[tag] = 1;
        }
    })

    return acc;
}, {} as Record<string, number>);

const urlSearchParams = useUrlSearchParams<{ t: string | undefined }>('history');
const filteredPosts = computed(() => {
    if (urlSearchParams.t) {
        return posts.filter(post => post.tags.includes(urlSearchParams.t));
    }

    return posts;
});

watch(() => urlSearchParams, () => {
    if (urlSearchParams.t) {
        useTitle(`${frontmatter.value.title} (${urlSearchParams.t}) | ${site.value.title}`);
    } else {
        useTitle(`${frontmatter.value.title} | ${site.value.title}`);
    }
}, {
    deep: true,
    immediate: true,
});
</script>

<template>
    <div>
        <ul class="!list-none !p-0">
            <li v-for="(count, tag) in tags" :key="tag"
                class="inline-block rounded-full !m-0 !mr-2 !mb-2 cursor-pointer bg-accent-500">
                <a :href="`/tags?t=${tag}`" @click.prevent="urlSearchParams.t = tag"
                   class="block p-2 !no-underline !text-white/95">
                    {{ tag }} ({{ count }})
                </a>
            </li>
        </ul>

        <Posts :posts="filteredPosts"/>
    </div>
</template>
