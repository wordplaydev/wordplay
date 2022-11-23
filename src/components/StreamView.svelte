<script lang="ts">
    import { getLanguages } from "../editor/util/Contexts";
    import type Stream from "../runtime/Stream";

    export let value: Stream;

    let languages = getLanguages();

</script>

{ value.getTranslation($languages) }