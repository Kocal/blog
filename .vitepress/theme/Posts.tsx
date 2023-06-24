import {defineComponent} from "vue";
import {Post} from "./posts.data";
import {toRefs} from "@vueuse/core";

export default defineComponent({
    setup() {
        const props = defineProps<{
            posts: Array<Post>,
        }>();
        const { posts } = toRefs(props);

        return () => (
            <>
                {posts.value.map((post) => (
                    <article>
                        <header>
                            <a href={post.url}>
                                {post.title}
                            </a>
                        </header>
                        <section>
                            <p>{post.summary}</p>
                        </section>
                        <footer>
                            {post.date}
                            {post.tags.map((tag) => (
                                <a href={`/tag/${tag}`}>{tag}</a>
                            ))}
                        </footer>
                    </article>
                ))}

            </>
        );
    }
});