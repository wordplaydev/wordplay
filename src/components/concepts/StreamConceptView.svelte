<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import { getConceptIndex } from '../project/Contexts';

    export let concept: StreamConcept;

    let index = getConceptIndex();
    $: streamTypeConcept = $index ? concept.getTypeConcept($index) : undefined;
</script>

<ConceptView {concept} types={streamTypeConcept ? [streamTypeConcept] : []} />
