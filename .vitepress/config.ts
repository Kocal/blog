import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'
import {getJSONLD} from "./theme/json-ld.js";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Hugo Alliaume",
  description: "My Personal Blog",
  themeConfig: {
    nav: [
      { text: 'Tags', link: '/tags' },
    ],
    outline: 'deep',
    socialLinks: [
      { icon: 'github', link: 'https://github.com/Kocal' },
      { icon: 'twitter', link: 'https://twitter.com/HugoAlliaume' },
      { icon: 'mastodon', link: 'https://mastodon.social/@Kocal' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2021-present Hugo Alliaume',
    },
    editLink: {
        text: 'Edit this page on GitHub',
        pattern: 'https://github.com/kocal/blog/tree/main/:path',
    }
  },
  async transformPageData(pageData, context) {
    return {
      frontmatter: {
        ...pageData.frontmatter,
        head: [
          ["script", {type: "application/ld+json"}, JSON.stringify(await getJSONLD(pageData, context))],
        ],
      },
    };
  },
  markdown: {
    anchor: {
      level: [2, 3, 4, 5, 6],
    }
  },
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
    resolve: {
      alias: [
        {
          find: /^.*\/VPHome\.vue$/,
          replacement: fileURLToPath(
              new URL('./theme/layouts/Home.vue', import.meta.url)
          )
        }
      ]
    }
  }
})
