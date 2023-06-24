import {defineComponent} from "vue";
import {data as posts} from '../posts.data';

export default defineComponent({
    setup() {
        console.log(posts);
        return () => (
            <>
                {posts.map((post) => (
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
        )
    }
});