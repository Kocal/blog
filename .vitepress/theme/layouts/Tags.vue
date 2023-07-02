<script setup lang="ts">
import {data as posts} from '../posts.data';
import Posts from "../components/Posts.vue";
import {useTitle} from "@vueuse/core";
import {computed} from 'vue';
import {useData} from "vitepress";

const {frontmatter, site, params} = useData();

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

const tag = computed(() => params.value?.tag);

const filteredPosts = computed(() => {
    if (tag.value) {
        return posts.filter(post => post.tags.includes(tag.value));
    }

    return posts;
});

if (tag.value) {
    useTitle(`Posts by tag "${tag.value}" | ${site.value.title}`)
}
</script>

<template>
    <div>
        <ul class="!list-none !p-0">
            <li v-for="(count, tag) in tags" :key="tag"
                class="inline-block rounded-full !m-0 !mr-2 !mb-2 cursor-pointer bg-accent-600">
                <a :href="`/tags/${tag}.html`"
                   class="block p-2 !no-underline !text-white/95">
                    {{ tag }} ({{ count }})
                </a>
            </li>
        </ul>

        <Posts :posts="filteredPosts"/>
    </div>
</template>
