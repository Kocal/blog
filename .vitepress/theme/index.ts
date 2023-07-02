// https://vitepress.dev/guide/custom-theme
import './style.css';
import { Theme as TypeTheme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import PostSummary from './components/PostSummary.vue';
import PostMeta from './components/PostMeta.vue';
import LayoutTags from './layouts/Tags.vue';
import Layout from './layouts/Layout.vue';

export default {
  ...DefaultTheme,
  Layout: Layout,
  enhanceApp({ app, router, siteData }) {
    DefaultTheme.enhanceApp({ app, router, siteData });

    app.component('LayoutTags', LayoutTags);
    app.component('PostSummary', PostSummary);
    app.component('PostMeta', PostMeta);
  },
} as TypeTheme;
