<script lang="ts">
    import type FunctionConcept from '@concepts/FunctionConcept';
    import ConceptView from './ConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import Note from '../widgets/Note.svelte';
    import { getConceptIndex } from '../project/Contexts';

    export let concept: FunctionConcept;

    let index = getConceptIndex();
    $: type = concept.definition.getOutputType(concept.context);
    $: outputs = $index
        ? $index.getConceptsOfTypes(type.getTypeSet(concept.context))
        : [];
</script>

<ConceptView {concept} types={outputs}>
    {#each concept.inputs as input}
        <BindConceptView concept={input} />
    {:else}
        <Note>&mdash;</Note>
    {/each}
</ConceptView>
