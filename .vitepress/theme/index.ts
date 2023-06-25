// https://vitepress.dev/guide/custom-theme
import './style.css'
import {Theme as TypeTheme} from "vitepress";
import Theme from 'vitepress/theme'

export default {
    extends: Theme,
    Layout: Theme.Layout,
    enhanceApp({app, router, siteData}) {
        // ...
    }
} as TypeTheme;

