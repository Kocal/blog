<script setup lang="ts">
import {data as posts} from '../posts.data';
import Posts from "../components/Posts.vue";
</script>

<template>
    <div class="container max-w-3xl">
        <Posts :posts="posts"/>
    </div>
</template>
