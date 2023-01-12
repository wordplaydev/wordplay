<script lang="ts">
    import CodeView from './CodeView.svelte';
    import Note from './Note.svelte';
    import type StructureConcept from '../concepts/StructureConcept';
    import BindConceptView from './BindConceptView.svelte';
    import ConceptView from './ConceptView.svelte';

    export let concept: StructureConcept;
</script>

<ConceptView {concept}>
    <!-- {#if concept.definition.types}
        <h2>{$preferredTranslations[0].nodes.TypeVariable.description}</h2>
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
    {#each concept.inputs as bind}
        <BindConceptView concept={bind} header={false} />
    {:else}
        <Note>&mdash;</Note>
    {/each}

    <h2>properties</h2>
    {#each concept.properties as bind}
        <BindConceptView concept={bind} header={false} />
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
