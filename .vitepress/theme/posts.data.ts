import { createContentLoader } from 'vitepress'

export interface Post {
    title: string
    url: string
    date: {
        time: number
        string: string
    }
    summary: string,
    tags: Array<string>,
}

declare const data: Post[]
export { data };

export default createContentLoader('posts/*.md', {
    excerpt: true,
    transform(raw): Post[] {
        return raw
            .map(({ url, frontmatter, excerpt }) => ({
                title: frontmatter.title,
                url,
                summary: frontmatter.summary,
                date: formatDate(frontmatter.date, frontmatter.lang),
                tags: frontmatter.tags,
            }))
            .sort((a, b) => b.date.time - a.date.time)
    }
})

function formatDate(raw: string, lang: string | undefined): Post['date'] {
    const date = new Date(raw)

    return {
        time: +date,
        string: date.toLocaleDateString(lang || 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }
}