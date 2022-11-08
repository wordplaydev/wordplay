<script lang="ts">
    import { getContext } from "svelte";
    import { LanguageSymbol, type LanguageContext } from "../editor/Contexts";
    import type Stream from "../runtime/Stream";

    export let value: Stream;

    $: languages = getContext<LanguageContext>(LanguageSymbol);

</script>

{ value.getTranslation($languages) }