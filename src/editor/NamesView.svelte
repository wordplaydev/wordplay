<script lang="ts">
    import type Names from "../nodes/Names";
    import LanguageTaggedNodeSequence from "./LanguageTaggedNodeSequence.svelte";

    export let node: Names;

</script>

<LanguageTaggedNodeSequence {node} list={node.names} />