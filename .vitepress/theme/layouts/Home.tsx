import {defineComponent} from "vue";
import {data as posts} from '../posts.data';

export default defineComponent({
    setup() {
        console.log(posts);
        return () => (
            <>
                Homepage
            </>
        )
    }
});