<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import { getConceptIndex } from '../project/Contexts';
    import BindConceptView from './BindConceptView.svelte';

    export let concept: StreamConcept;

    let index = getConceptIndex();
    $: streamTypeConcept = $index ? concept.getTypeConcept($index) : undefined;
</script>

<ConceptView {concept} types={streamTypeConcept ? [streamTypeConcept] : []}>
    {#each concept.inputs as input}
        <BindConceptView concept={input} />
    {/each}
</ConceptView>
