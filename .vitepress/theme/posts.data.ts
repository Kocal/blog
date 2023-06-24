import { createContentLoader } from 'vitepress'

interface Post {
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
export { data }

export default createContentLoader('posts/*.md', {
    excerpt: true,
    transform(raw): Post[] {
        return raw
            .map(({ url, frontmatter, excerpt }) => ({
                title: frontmatter.title,
                url,
                summary: frontmatter.summary,
                date: formatDate(frontmatter.date, frontmatter.locale),
                tags: frontmatter.tags,
            }))
            .sort((a, b) => b.date.time - a.date.time)
    }
})

function formatDate(raw: string, locale: string | undefined): Post['date'] {
    const date = new Date(raw)
    date.setUTCHours(12)
    return {
        time: +date,
        string: date.toLocaleDateString(locale || 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    }
}