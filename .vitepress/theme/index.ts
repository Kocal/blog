// https://vitepress.dev/guide/custom-theme
import './style.css'
import {Theme as TypeTheme} from "vitepress";
import Theme from 'vitepress/theme'
import PostSummary from "./components/PostSummary.vue";
import PostMeta from "./components/PostMeta.vue";

export default {
    extends: Theme,
    Layout: Theme.Layout,
    enhanceApp({app, router, siteData}) {
        app.component('PostSummary', PostSummary);
        app.component('PostMeta', PostMeta);
    }
} as TypeTheme;

