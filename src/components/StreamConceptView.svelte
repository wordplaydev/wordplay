<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import ConceptView from "./ConceptView.svelte";
    import type StreamConcept from "../concepts/StreamConcept";

    export let concept: StreamConcept;

</script>

<ConceptView {concept}>

    <h2>value</h2>
    {#if concept.type}
        <CodeView concept={concept.type} node={concept.type.getRepresentation()} selectable />
    {:else}
        <CodeView {concept} node={concept.stream.getType(concept.context)} selectable />
    {/if}

</ConceptView>