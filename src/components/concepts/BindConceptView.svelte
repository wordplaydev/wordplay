<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import { getConceptIndex } from '../project/Contexts';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';
    import TypeView from './TypeView.svelte';
    import RootView from '../project/RootView.svelte';

    export let concept: BindConcept;

    let index = getConceptIndex();
    $: types = $index?.getConceptsOfTypes(
        concept.getType().getTypeSet(concept.context) ?? []
    );
</script>

<Speech glyph={concept.getGlyphs($creator.getLanguages())} below={true}>
    {#if types}<TypeView {types} />{/if}
    {#if concept.bind.value !== undefined}: <RootView
            node={concept.bind.value}
            inline
        />{/if}
    <MissingLocalesView />
    {#each $creator.getLocales() as trans}
        {@const [doc, spaces] = concept.getDocs(trans) ?? [
            undefined,
            undefined,
        ]}
        {#if doc && spaces}
            <DocHTMLView {doc} {spaces} />
        {:else}
            {trans.ui.labels.nodoc}
        {/if}
    {/each}
</Speech>
