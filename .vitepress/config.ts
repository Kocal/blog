import { defineConfig } from 'vitepress'
import { createWriteStream } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import {getJSONLD} from "./theme/json-ld.js";
import {SitemapStream} from "sitemap";

const sitemapLinks = [];

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "My Personal Blog",
  titleTemplate: ":title • Hugo Alliaume",
  description: "My Personal Blog",
  lang: "en",
  srcExclude: [
      '**/posts-assets',
      '**/README.md'
  ],
  themeConfig: {
    siteTitle: "Hugo Alliaume's Blog",
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
    },
    externalLinkIcon: true,
  },
  markdown: {
    theme: {
      light: 'solarized-light',
      dark: 'solarized-dark',
    },
    lineNumbers: true,
    anchor: {
      level: [2, 3, 4, 5, 6],
    },
  },
  lastUpdated: true,
  head: [
    ['link', { rel: "sitemap", type: "application/xml", href: "/sitemap.xml" }],
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
  transformHtml(html, id, { pageData }) {
    if (['index.md'].includes(pageData.relativePath) || /[\\/]404\.html$/.test(id) || id.includes('/posts-assets/')) {
      return;
    }

    sitemapLinks.push({
      url: pageData.relativePath
          .replace(/\/index\.md$/, '/')
          .replace(/\.md$/, ''),
      lastmod: pageData.lastUpdated
    })
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
  async buildEnd({outDir}) {
    const sitemap = new SitemapStream({
      hostname: 'https://hugo.alliau.me'
    })
    const writeStream = createWriteStream(resolve(outDir, 'sitemap.xml'))
    sitemap.pipe(writeStream)
    sitemapLinks.forEach((link) => sitemap.write(link))
    sitemap.end()
    await new Promise((r) => writeStream.on('finish', r))
  },
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
