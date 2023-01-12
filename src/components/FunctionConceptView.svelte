<script lang="ts">
    import type FunctionConcept from '../concepts/FunctionConcept';
    import ConceptView from './ConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import Note from './Note.svelte';
    import { getPaletteIndex } from '../editor/util/Contexts';

    export let concept: FunctionConcept;

    let index = getPaletteIndex();
    $: type = concept.definition.getOutputType(concept.context);
    $: output = $index.getConceptOfType(type);
</script>

<ConceptView {concept} type={output}>
    <h2>inputs</h2>
    {#each concept.inputs as input}
        <BindConceptView concept={input} header={false} />
    {:else}
        <Note>&mdash;</Note>
    {/each}
</ConceptView>
