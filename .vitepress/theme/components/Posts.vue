<script setup lang="ts">
import {toRefs} from "vue";
import type {Post as TypePost} from "../posts.data";
import Post from "./Post.vue";

const props = defineProps<{ posts: Array<TypePost> }>()
const {posts} = toRefs(props);
</script>

<template>
    <div class="space-y-10 md:space-y-12">
        <Post v-for="post in posts" :key="post.url" :post="post"/>
    </div>
</template>