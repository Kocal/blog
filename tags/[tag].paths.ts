import FastGlob from 'fast-glob';
import matter from 'gray-matter';

export default {
    async paths() {
        const postsFiles = (await FastGlob('posts/*.md', {
            ignore: ["**/node_modules/**", "**/dist/**"]
        })).sort()

        const tags = new Set<string>();
        const posts = postsFiles.map((file) => {
            const {data} = matter.read(file);
            const tagsInPost = data.tags as Array<string>;
            tagsInPost.forEach(tag => tags.add(tag));
        });


        return Array.from(tags).map(tag => ({
            params: {
                tag,
            }
        }));
    }
}