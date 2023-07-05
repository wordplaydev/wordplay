<script lang="ts">
    import type FunctionConcept from '@concepts/FunctionConcept';
    import ConceptView from './ConceptView.svelte';
    import BindConceptView from './BindConceptView.svelte';
    import { getConceptIndex } from '../project/Contexts';
    import type BindConcept from '../../concepts/BindConcept';
    import { onMount } from 'svelte';

    export let concept: FunctionConcept;
    export let subconcept: BindConcept | undefined = undefined;

    let index = getConceptIndex();
    $: type = concept.definition.getOutputType(concept.context);
    $: outputs = $index
        ? $index.getConceptsOfTypes(type.getTypeSet(concept.context))
        : [];

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

<ConceptView {concept} types={outputs}>
    {#each concept.inputs as input, index}
        <div id="subconcept-{index}">
            <BindConceptView concept={input} />
        </div>
    {/each}
</ConceptView>
