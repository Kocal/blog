import {useData} from 'vitepress'
import Home from "./Home";
import NotFound from "./NotFound";
import Post from "./Post";
import {defineComponent} from "vue";

// https://vitepress.dev/reference/runtime-api#usedata

export default defineComponent({
    setup() {
        const {site, page, frontmatter} = useData();

        return () => (
            <>
                <header>
                    The header
                </header>

                <main>
                    {frontmatter.value.layout === 'home' ? <Home/> : page.value.isNotFound ? <NotFound/> : <Post/>}
                </main>

                <footer>
                    The footer
                </footer>
            </>
        )
    }
});