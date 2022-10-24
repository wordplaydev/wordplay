<script lang="ts">
    import { getContext } from "svelte";
    import type { Writable } from "svelte/store";
    import type LanguageCode from "../nodes/LanguageCode";
    import type Stream from "../runtime/Stream";

    export let value: Stream;

    $: languages = getContext<Writable<LanguageCode[]>>("languages");

</script>

{ value.getTranslations()[$languages[0]] }