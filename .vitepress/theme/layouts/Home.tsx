import {defineComponent} from "vue";
import {data as posts} from '../posts.data';
import Posts from "../Posts";

export default defineComponent({
    setup() {
        return () => (
            <>
                <Posts posts={posts} />
            </>
        )
    }
});