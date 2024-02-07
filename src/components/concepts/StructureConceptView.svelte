<script lang="ts">
    import CodeView from './CodeView.svelte';
    import type StructureConcept from '@concepts/StructureConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';
    import type BindConcept from '@concepts/BindConcept';
    import { onMount } from 'svelte';
    import { locales } from '@db/Database';

    export let concept: StructureConcept;
    export let subconcept: BindConcept | undefined = undefined;

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
    $: if (subconcept) showSubconcept(subconcept);
    // When we load, scroll to it.
    onMount(() => showSubconcept(subconcept));
</script>

<ConceptView {concept} variables={concept.definition.types}>
    <!-- {#if concept.definition.types}
        <h2>typevariables</h2>
        {#each concept.definition.types.variables as type}{/each}
    {/if} -->

    {#if concept.inter.length > 0}
        <h2>{$locales.get((l) => l.ui.docs.header.interfaces)}</h2>
        {#each concept.inter as inter}
            <CodeView concept={inter} node={inter.getRepresentation()} />
        {/each}
    {/if}

    {#if concept.inputs.length > 0}
        <h2>{$locales.get((l) => l.ui.docs.header.inputs)}</h2>
        {#each concept.inputs as bind, index}
            <div id="input-{index}" class:selected={bind === subconcept}>
                <BindConceptView concept={bind} />
            </div>
        {/each}
    {/if}

    {#if concept.properties.length > 0}
        <h2>{$locales.get((l) => l.ui.docs.header.properties)}</h2>
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
        <h2>{$locales.get((l) => l.ui.docs.header.functions)}</h2>
        {#each concept.functions as fun}
            <CodeView node={fun.getRepresentation()} concept={fun} />
        {/each}
    {/if}

    {#if concept.conversions.length > 0}
        <h2>{$locales.get((l) => l.ui.docs.header.conversions)}</h2>
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
