import {PageData, TransformContext, TransformPageContext} from "vitepress";
import type {Post} from "./posts.data.js";

type JSONLD = Record<string, unknown>;

let _posts: Array<Post> = [];
async function loadPosts() {
    if (_posts.length === 0) {
        const {default: {load}} = await import('./posts.data');
        _posts = await load();
    }

    return _posts;
}

export async function  getJSONLD(pageData: PageData, context: TransformPageContext): Promise<JSONLD> {
    let jsonLd = {
        "@context": "https://schema.org",
        "@type": "Blog",
        "url": "https://hugo.alliau.me/" + pageData.relativePath.replace(/\.md$/, '.html'),
        "name": context.siteConfig.site.title,
        "description": context.siteConfig.site.description,
        "publisher": getPublisher(),
    };

    if (pageData?.frontmatter?.layout === 'home') {
        jsonLd = {
            ...jsonLd,
            ...await getForHomepage(pageData),
        }
    } else if (pageData.relativePath.startsWith('posts/')) {
        const post = (await loadPosts()).find(p => p.title === pageData.frontmatter.title && p.summary === pageData.frontmatter.summary);
        if (post) {
            jsonLd = {
                ...jsonLd,
                ...getForPost(post),
            }
        }
    }

    return jsonLd
}

export function getPublisher() {
    return {
        "@type": "Person",
        "name": "Hugo Alliaume",
        "url": "https://hugo.alliau.me",
        "jobTitle": "Lead developer full-stack",
        "email": "hugo@alliau.me"
    };
}

export async function getForHomepage(pageData: PageData): Promise<JSONLD> {
    return {
        "url": "https://hugo.alliau.me",
        "blogPosts": (await loadPosts()).map(post => getForPost(post)),
    }
}

export function getForPost(post: Post): JSONLD {
    return {
        "@type": "TechArticle",
        "mainEntityOfPage": post.url,
        "headline": post.title,
        "abstract": post.summary,
        "datePublished": post.date.iso,
        "author": getPublisher(),
        "publisher": getPublisher(),
        "keywords": post.tags,
        "inLanguage": post.lang || "en",
        ...post.dependencies && post.dependencies.length > 0 ? {dependencies: post.dependencies} : {},
        ...post.proficiencyLevel ? {proficiencyLevel: post.proficiencyLevel} : {},
    }
}