<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';
    import TypeView from './TypeView.svelte';
    import RootView from '../project/RootView.svelte';

    export let concept: BindConcept;
</script>

<Speech glyph={concept.getGlyphs($creator.getLanguages())} below={true}>
    <TypeView type={concept.getType()} context={concept.context} />
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
