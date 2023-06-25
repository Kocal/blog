import {useData} from 'vitepress'
import Home from "./Home";
import NotFound from "./NotFound";
import Post from "./Post";
import Tags from "./Tags";
import {defineComponent} from "vue";

// https://vitepress.dev/reference/runtime-api#usedata

export default defineComponent({
    setup() {
        const {site, page, frontmatter} = useData();

        return () => (
            <>
                <header role={"banner"}>
                    <a href="/">Hugo Alliaume</a>
                </header>

                <main>
                    {frontmatter.value.layout === 'home'
                        ? <Home/>
                        : frontmatter.value.layout === 'tags'
                            ? <Tags/>
                            : page.value.isNotFound
                                ? <NotFound/>
                                : <Post/>
                    }
                </main>

                <footer>
                    The footer
                </footer>
            </>
        )
    }
});