<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type FunctionConcept from "../concepts/FunctionConcept";
    import ConceptView from "./ConceptView.svelte";
    import BindConceptView from "./BindConceptView.svelte";
    import Note from "./Note.svelte";

    export let concept: FunctionConcept;

</script>

<ConceptView {concept}>

    <h2>inputs</h2>
    {#each concept.inputs as input}
        <BindConceptView concept={input} />
    {:else}
        <Note>None</Note>
    {/each}

    <h2>output</h2>
    <CodeView {concept} node={concept.definition.getOutputType(concept.context)} />

</ConceptView>