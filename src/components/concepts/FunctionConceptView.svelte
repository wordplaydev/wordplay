<script lang="ts">
    import type FunctionConcept from '@concepts/FunctionConcept';
    import { onMount } from 'svelte';
    import type BindConcept from '../../concepts/BindConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';

    interface Props {
        concept: FunctionConcept;
        subconcept?: BindConcept | undefined;
    }

    let { concept, subconcept = undefined }: Props = $props();

    let type = $derived(concept.definition.getOutputType(concept.context));

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

<ConceptView {concept} {type}>
    {#each concept.inputs as input, index}
        <div id="subconcept-{index}">
            <BindConceptView concept={input} />
        </div>
    {/each}
</ConceptView>
