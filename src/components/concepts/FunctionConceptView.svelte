<script lang="ts">
    import type FunctionConcept from '@concepts/FunctionConcept';
    import ConceptView from './ConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import Note from '../widgets/Note.svelte';
    import { getPaletteIndex } from '../project/Contexts';

    export let concept: FunctionConcept;

    let index = getPaletteIndex();
    $: type = concept.definition.getOutputType(concept.context);
    $: outputs = $index.getConceptsOfTypes(type.getTypeSet(concept.context));
</script>

<ConceptView {concept} types={outputs}>
    <h2>inputs</h2>
    {#each concept.inputs as input}
        <BindConceptView concept={input} header={false} />
    {:else}
        <Note>&mdash;</Note>
    {/each}
</ConceptView>
