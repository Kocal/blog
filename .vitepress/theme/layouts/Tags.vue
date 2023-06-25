<script setup lang="ts">
import {data as posts} from '../posts.data';
import Posts from "../Posts.vue";
import {useUrlSearchParams} from "@vueuse/core";
import {computed} from 'vue';

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
</script>

<template>
    <div class="Tags">
        <ul>
            <li v-for="(count, tag) in tags" :key="tag">
                <a :href="`/tags?t=${tag}`" @click.prevent="urlSearchParams.t = 'tag'">
                    {{ tag }} ({count})
                </a>
            </li>
        </ul>

        <Posts :posts="filteredPosts"/>
    </div>
</template>
