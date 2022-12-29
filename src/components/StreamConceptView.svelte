<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import ConceptView from "./ConceptView.svelte";
    import type StreamConcept from "../concepts/StreamConcept";
    import { getContext } from "svelte";
    import type Context from "../nodes/Context";

    export let concept: StreamConcept;

    $: context = getContext<Context>("context");

</script>

<ConceptView {concept}>

    <h2>value</h2>
    {#if concept.type}
        <CodeView concept={concept.type} node={concept.type.getRepresentation()} selectable />
    {:else}
        <CodeView {concept} node={concept.stream.getType(concept.context ?? context)} selectable />
    {/if}

</ConceptView>