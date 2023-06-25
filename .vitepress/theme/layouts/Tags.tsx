import {defineComponent} from "vue";
import {data as posts} from '../posts.data';
import Posts from "../Posts";
import {useUrlSearchParams} from "@vueuse/core";
import { computed } from 'vue';

export default defineComponent({
    setup() {
        const tags = posts.reduce((acc, post) => {
            post.tags.forEach(tag => {
                if (acc[tag]) {
                    acc[tag] += 1;
                } else {
                    acc[tag] = 1;
                }
            })

            return acc;
        }, {} as Record<string, number>);

        const urlSearchParams = useUrlSearchParams<{ t: string | undefined }>('history');
        const filteredPosts = computed(() => {
            if (urlSearchParams.t) {
                return posts.filter(post => post.tags.includes(urlSearchParams.t));
            }

            return posts;
        });

        return () => (
            <>
                <ul>
                    {Object.entries(tags).map(([tag, count]) => (
                        <li>
                            <a href={`/tags?t=${tag}`} onClick={(e) => {
                                e.preventDefault();
                                urlSearchParams.t = tag;
                            }}>{tag}</a> ({count})
                        </li>
                    ))}
                </ul>
                <Posts posts={filteredPosts.value}/>
            </>
        )
    }
});