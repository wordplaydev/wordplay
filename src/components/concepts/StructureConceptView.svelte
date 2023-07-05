<script lang="ts">
    import CodeView from './CodeView.svelte';
    import Note from '../widgets/Note.svelte';
    import type StructureConcept from '@concepts/StructureConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';
    import type BindConcept from '../../concepts/BindConcept';
    import { onMount } from 'svelte';

    export let concept: StructureConcept;
    export let subconcept: BindConcept | undefined = undefined;

    onMount(() => {
        if (subconcept) {
            const inputIndex = concept.inputs.indexOf(subconcept);
            const propertyIndex = concept.properties.indexOf(subconcept);
            const [kind, index] =
                inputIndex >= 0
                    ? ['input', inputIndex]
                    : propertyIndex >= 0
                    ? ['property', propertyIndex]
                    : [undefined, undefined];
            if (kind)
                document.getElementById(`${kind}-${index}`)?.scrollIntoView();
        }
    });
</script>

<ConceptView {concept}>
    <!-- {#if concept.definition.types}
        <h2>{$preferredLocales[0].nodes.TypeVariable.description}</h2>
        {#each concept.definition.types.variables as type}
        {/each}
    {/if} -->

    {#if concept.examples.length > 0}
        <h2>examples</h2>
        {#each concept.examples as creator}
            <CodeView {concept} node={creator} />
        {/each}
    {/if}

    {#if concept.inter.length > 0}
        <h2>interfaces</h2>
        {#each concept.inter as inter}
            <CodeView
                concept={inter}
                node={inter.getRepresentation()}
                selectable
            />
        {/each}
    {/if}

    <h2>inputs</h2>
    {#each concept.inputs as bind, index}
        <div id="input-{index}">
            <BindConceptView concept={bind} />
        </div>
    {:else}
        <Note>&mdash;</Note>
    {/each}

    <h2>properties</h2>
    {#each concept.properties as bind, index}
        <div id="property-{index + concept.inputs.length}">
            <BindConceptView concept={bind} />
        </div>
    {:else}
        <Note>&mdash;</Note>
    {/each}

    <h2>functions</h2>
    {#each concept.functions as fun}
        <CodeView node={fun.getRepresentation()} concept={fun} selectable />
    {:else}
        <Note>&mdash;</Note>
    {/each}

    <h2>conversions</h2>
    {#each concept.conversions as conversion}
        <CodeView
            node={conversion.getRepresentation()}
            concept={conversion}
            selectable
        />
    {:else}
        <Note>&mdash;</Note>
    {/each}
</ConceptView>
