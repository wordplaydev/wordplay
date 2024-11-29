<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import BindConceptView from './BindConceptView.svelte';
    import { onMount } from 'svelte';
    import type BindConcept from '../../concepts/BindConcept';

    interface Props {
        concept: StreamConcept;
        subconcept?: BindConcept | undefined;
    }

    let { concept, subconcept = undefined }: Props = $props();

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

<ConceptView {concept} type={concept.definition.output}>
    {#each concept.inputs as input, index}
        <div id="subconcept-{index}">
            <BindConceptView concept={input} />
        </div>
    {/each}
</ConceptView>
