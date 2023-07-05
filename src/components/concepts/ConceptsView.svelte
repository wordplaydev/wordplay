<script lang="ts">
    import type Concept from '@concepts/Concept';
    import type StructureDefinition from '@nodes/StructureDefinition';
    import ConceptGroupView from './ConceptGroupView.svelte';
    import { creator } from '../../db/Creator';

    export let category: string;
    export let concepts: Concept[];
    export let selectable: boolean = true;

    // Split the concepts by type.
    $: typeless = concepts.filter((c) => c.getAffiliation() === undefined);

    // Get all the typed concepts and find the set of distinct types.
    $: types = new Set(
        concepts
            .map((c) => c.getAffiliation())
            .filter((c): c is StructureDefinition => c !== undefined)
    );
</script>

<h1>{category}</h1>
<ConceptGroupView concepts={typeless} {selectable} />

{#each Array.from(types) as typeCategory}
    <h2>{typeCategory.names.getLocaleText($creator.getLanguages(), false)}</h2>
    <ConceptGroupView
        concepts={concepts.filter((c) => c.getAffiliation() === typeCategory)}
        {selectable}
    />
{/each}
