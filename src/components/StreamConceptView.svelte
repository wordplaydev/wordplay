<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import ConceptView from "./ConceptView.svelte";
    import type StreamConcept from "../concepts/StreamConcept";
    import { getPaletteIndex } from "../editor/util/Contexts";

    export let concept: StreamConcept;

    let index = getPaletteIndex();
    $: type = concept.getTypeConcept($index);

</script>

<ConceptView {concept}>

    <h2>value</h2>
    {#if type}
        <CodeView concept={type} node={type.getRepresentation()} selectable />
    {/if}

</ConceptView>