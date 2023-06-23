import { defineConfig } from 'vitepress'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Hugo Alliaume",
  description: "My Personal Blog",
  head: [
    ['link', { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" }],
    ['link', { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" }],
    ['link', { rel: "manifest", href: "/site.webmanifest" }],
    ['link', { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: '#000000' }],
    ['meta', { name: "msapplication-TileColor", content: "#000000" }],
    ['meta', { name: "theme-color", content: "#000000" }],
    ['script', {
      async: "true",
      src: 'https://www.googletagmanager.com/gtag/js?id=G-Z8KN175TJZ',
    }],
    ['script', {}, `
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-Z8KN175TJZ');`,
    ],
  ],
  vite: {
    plugins: [vueJsx()],
  }
})
