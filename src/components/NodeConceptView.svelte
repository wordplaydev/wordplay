<script lang="ts">
    import ConceptView from './ConceptView.svelte';
    import type NodeConcept from '../concepts/NodeConcept';
    import { translations } from '../translations/translations';
    import DescriptionView from './DescriptionView.svelte';

    export let concept: NodeConcept;
</script>

<ConceptView {concept}>
    <h2>purpose</h2>
    {#each $translations as trans}
        <p>
            <DescriptionView
                description={concept.getRepresentation().getPurpose(trans)}
            />
        </p>
    {/each}
</ConceptView>
