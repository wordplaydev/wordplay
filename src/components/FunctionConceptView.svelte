<script lang="ts">
    import CodeView from "./CodeView.svelte";
    import type FunctionConcept from "../concepts/FunctionConcept";
    import ConceptView from "./ConceptView.svelte";
    import BindConceptView from "./BindConceptView.svelte";
    import Note from "./Note.svelte";
    import { getPaletteIndex } from "../editor/util/Contexts";

    export let concept: FunctionConcept;

    let index = getPaletteIndex();
    $: output = $index.getConceptOfType(concept.definition.getOutputType(concept.context));

</script>

<ConceptView {concept}>

    <h2>inputs</h2>
    {#each concept.inputs as input}
        <BindConceptView concept={input} />
    {:else}
        <Note>None</Note>
    {/each}

    <h2>output</h2>
    <CodeView concept={output ?? concept} node={output?.getRepresentation() ?? concept.definition.getOutputType(concept.context)} selectable={output !== undefined}/>

</ConceptView>