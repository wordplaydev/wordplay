<script lang="ts">
    import type StreamConcept from '@concepts/StreamConcept';
    import { onMount } from 'svelte';
    import type BindConcept from '../../concepts/BindConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';

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
