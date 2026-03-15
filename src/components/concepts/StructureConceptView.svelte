<script lang="ts">
    import HeaderAndExplanation from '@components/app/HeaderAndExplanation.svelte';
    import type BindConcept from '@concepts/BindConcept';
    import type StructureConcept from '@concepts/StructureConcept';
    import { locales } from '@db/Database';
    import { onMount } from 'svelte';
    import BindConceptView from './BindConceptView.svelte';
    import CodeView from './CodeView.svelte';
    import ConceptView from './ConceptView.svelte';
    import Names from './NamesView.svelte';

    interface Props {
        concept: StructureConcept;
        subconcept?: BindConcept | undefined;
    }

    let { concept, subconcept = undefined }: Props = $props();

    function showSubconcept(sub: BindConcept | undefined) {
        if (sub) {
            const inputIndex = concept.inputs.indexOf(sub);
            const propertyIndex = concept.properties.indexOf(sub);
            const [kind, index] =
                inputIndex >= 0
                    ? ['input', inputIndex]
                    : propertyIndex >= 0
                      ? ['property', propertyIndex]
                      : [undefined, undefined];
            if (kind) {
                // We have to wait for a bit of animation.
                setTimeout(() =>
                    document
                        .getElementById(`${kind}-${index}`)
                        ?.scrollIntoView({ block: 'center' }),
                );
            }
        }
    }

    // Any time the subconcept changes, scroll to it.
    $effect(() => {
        if (subconcept) showSubconcept(subconcept);
    });

    // When we load, scroll to it.
    onMount(() => showSubconcept(subconcept));
</script>

<ConceptView {concept} variables={concept.definition.types}>
    <!-- {#if concept.definition.types}
        <h2>typevariables</h2>
        {#each concept.definition.types.variables as type}{/each}
    {/if} -->

    <Names names={concept.getNames($locales, false)} />

    {#if concept.inter.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.interfaces} sub />
        {#each concept.inter as inter}
            <CodeView concept={inter} node={inter.getRepresentation()} />
        {/each}
    {/if}

    {#if concept.inputs.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.inputs} sub />
        {#each concept.inputs as bind, index}
            <div id="input-{index}" class:selected={bind === subconcept}>
                <BindConceptView concept={bind} />
            </div>
        {/each}
    {/if}

    {#if concept.properties.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.properties} sub />
        {#each concept.properties as bind, index}
            <div
                id="property-{index + concept.inputs.length}"
                class:selected={bind === subconcept}
            >
                <BindConceptView concept={bind} />
            </div>
        {/each}
    {/if}

    {#if concept.functions.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.functions} sub />
        {#each concept.functions as fun}
            <CodeView node={fun.getRepresentation()} concept={fun} />
        {/each}
    {/if}

    {#if concept.conversions.length > 0}
        <HeaderAndExplanation text={(l) => l.ui.docs.header.conversions} sub />
        {#each concept.conversions as conversion}
            <CodeView
                node={conversion.getRepresentation()}
                concept={conversion}
            />
        {/each}
    {/if}
</ConceptView>

<style>
    .selected {
        background: var(--wordplay-hover);
        border-radius: var(--wordplay-border-radius);
    }
</style>
