<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type FunctionConcept from "../concepts/FunctionConcept";
    import ConceptView from "./ConceptView.svelte";
    import BindConceptView from "./BindConceptView.svelte";
    import Note from "./Note.svelte";
    import { getContext } from "svelte";
    import type Context from "../nodes/Context";

    export let concept: FunctionConcept;

    $: context = getContext<Context>("context");

</script>

<ConceptView {concept}>

    <CodeView {concept} node={concept.definition.getType(concept.context ?? context)} />

    <h2>inputs</h2>
    {#each concept.inputs as input}
        <BindConceptView concept={input} />
    {:else}
        <Note>No inputs.</Note>
    {/each}

    <h2>output</h2>
    <CodeView {concept} node={concept.definition.getOutputType(concept.context ?? context)} />

</ConceptView>