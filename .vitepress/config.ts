import { defineConfig } from 'vitepress';
import { createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { getJSONLD } from './theme/json-ld.js';
import { imagetools } from 'vite-imagetools';
import { Feed } from 'feed';

const feed = new Feed({
  title: "Hugo Alliaume's Blog",
  description: 'My Personal Blog',
  id: 'https://hugo.alliau.me/',
  link: 'https://hugo.alliau.me/',
  language: 'en',
  copyright: 'Hugo Alliaume',
  author: {
    name: 'Hugo Alliaume',
    email: 'hugo@alliau.me',
  },
});

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'My Personal Blog',
  titleTemplate: ':title • Hugo Alliaume',
  description: 'My Personal Blog',
  lang: 'en',
  srcExclude: ['**/posts-assets', '**/README.md'],
  themeConfig: {
    siteTitle: "Hugo Alliaume's Blog",
    nav: [{ text: 'Tags', link: '/tags' }],
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
    ['link', { rel: 'sitemap', type: 'application/xml', href: '/sitemap.xml' }],
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#000000' }],
    ['meta', { name: 'msapplication-TileColor', content: '#000000' }],
    ['meta', { name: 'theme-color', content: '#000000' }],
    [
      'script',
      {
        async: 'true',
        src: 'https://www.googletagmanager.com/gtag/js?id=G-Z8KN175TJZ',
      },
    ],
    [
      'script',
      {},
      `
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-Z8KN175TJZ');`,
    ],
  ],
  transformHtml(html, id, { pageData }) {
    if (['index.md'].includes(pageData.relativePath) || /[\\/]404\.html$/.test(id)) {
      return;
    }

    if (/^posts/.test(pageData.relativePath)) {
      feed.addItem({
        link: pageData.relativePath.replace(/\/index\.md$/, '/').replace(/\.md$/, ''),
        title: pageData.title,
        description: pageData.description,
        date: new Date(pageData.frontmatter.date),
      });
    }
  },
  async transformPageData(pageData, context) {
    return {
      frontmatter: {
        ...pageData.frontmatter,
        head: [['script', { type: 'application/ld+json' }, JSON.stringify(await getJSONLD(pageData, context))]],
      },
    };
  },
  sitemap: {
    hostname: 'https://hugo.alliau.me',
    lastmodDateOnly: false,
  },
  async buildEnd({ outDir }) {
    console.log('Generating RSS feed...');
    feed.items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const writeStream = createWriteStream(resolve(outDir, 'rss.xml'));
    writeStream.write(feed.rss2());
    await new Promise((r) => writeStream.on('finish', r));
    console.log('Ok');
  },
  vue: {
    template: {
      transformAssetUrls: {
        Image: ['src'],
      },
    },
  },
  vite: {
    plugins: [
      imagetools({
        defaultDirectives: new URLSearchParams({
          format: 'webp',
        }),
      }),
    ],
    resolve: {
      alias: [
        {
          find: /^.*\/VPHome\.vue$/,
          replacement: fileURLToPath(new URL('./theme/layouts/VPHome.vue', import.meta.url)),
        },
      ],
    },
  },
});
