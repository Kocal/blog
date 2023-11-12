import { createContentLoader } from 'vitepress';

export interface Post {
  title: string;
  url: string;
  date: {
    time: number;
    string: string;
    iso: string;
  };
  description: string;
  tags: Array<string>;
  lang: string | undefined;
  dependencies: Array<string>;
  proficiencyLevel: string | undefined;
}

declare const data: Post[];
export { data };

export default createContentLoader('posts/*.md', {
  excerpt: true,
  transform(raw): Post[] {
    return raw
      .map(({ url, frontmatter, excerpt }) => ({
        url,
        title: frontmatter.title,
        description: frontmatter.description,
        date: formatDate(frontmatter.date, frontmatter.lang),
        tags: frontmatter.tags,
        lang: frontmatter.lang,
        dependencies: frontmatter.dependencies || [],
        proficiencyLevel: frontmatter.proficiencyLevel,
      }))
      .sort((a, b) => b.date.time - a.date.time);
  },
});

function formatDate(raw: string, lang: string | undefined): Post['date'] {
  const date = new Date(raw);

  return {
    time: +date,
    iso: date.toISOString(),
    string: date.toLocaleDateString(lang || 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}
