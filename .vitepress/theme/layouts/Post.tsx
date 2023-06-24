import {defineComponent} from "vue";
import {Content} from "vitepress";

export default defineComponent({
  setup() {
    return () => (
        <>
            <Content/>
        </>
    )
  }
});