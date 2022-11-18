<script lang="ts">
    import type Docs from "../nodes/Docs";
    import LanguageTaggedNodeSequence from "./LanguageTaggedNodeSequence.svelte";

    export let node: Docs;

</script>

<LanguageTaggedNodeSequence {node} list={node.docs} />