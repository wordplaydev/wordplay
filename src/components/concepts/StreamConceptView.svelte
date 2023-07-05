<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import { getConceptIndex } from '../project/Contexts';
    import BindConceptView from './BindConceptView.svelte';
    import { onMount } from 'svelte';
    import type BindConcept from '../../concepts/BindConcept';

    export let concept: StreamConcept;
    export let subconcept: BindConcept | undefined = undefined;

    let index = getConceptIndex();
    $: streamTypeConcept = $index ? concept.getTypeConcept($index) : undefined;

    onMount(() => {
        if (subconcept) {
            const index = concept.inputs.indexOf(subconcept);
            if (index >= 0)
                document
                    .getElementById(`subconcept-${index}`)
                    ?.scrollIntoView();
        }
    });
</script>

<ConceptView {concept} types={streamTypeConcept ? [streamTypeConcept] : []}>
    {#each concept.inputs as input, index}
        <div id="subconcept-{index}">
            <BindConceptView concept={input} />
        </div>
    {/each}
</ConceptView>
