import {defineComponent, toRefs} from "vue";
import {Post} from "./posts.data";

export default defineComponent(
    (props: { posts: Array<Post> }) => {
        const { posts } = toRefs(props);

        return () => (
            <>
                {posts.value.map((post) => (
                    <article key={post.title}>
                        <header>
                            <a href={post.url}>
                                {post.title}
                            </a>
                        </header>
                        <section>
                            <p>{post.summary}</p>
                        </section>
                        <footer>
                            {post.date.string}
                            {post.tags.map((tag) => (
                                <a href={`/tags.html?t=${tag}`}>{tag}</a>
                            ))}
                        </footer>
                    </article>
                ))}
            </>
        );
    },
    {
        props: {
            posts: {
                type: Array,
                required: true,
            }
        },
    }
);