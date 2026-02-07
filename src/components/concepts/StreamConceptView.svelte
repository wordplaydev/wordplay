<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import type StreamConcept from '@concepts/StreamConcept';
    import { locales } from '@db/Database';
    import { onMount } from 'svelte';
    import type BindConcept from '../../concepts/BindConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';
    import Names from './NamesView.svelte';

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
    <Names names={concept.getNames($locales, false)} />

    {#if concept.inputs.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.inputs} sub />

        {#each concept.inputs as input, index}
            <div id="subconcept-{index}">
                <BindConceptView concept={input} />
            </div>
        {/each}
    {/if}
</ConceptView>
