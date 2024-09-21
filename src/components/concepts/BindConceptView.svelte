<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { blocks, locales } from '@db/Database';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import RootView from '../project/RootView.svelte';

    export let concept: BindConcept;
</script>

<Speech glyph={concept.getGlyphs($locales)} below={true}>
    <svelte:fragment slot="content">
        {@const markup = concept.getDocs($locales)}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {$locales.get((l) => l.ui.docs.nodoc)}
        {/if}
    </svelte:fragment><svelte:fragment slot="aside"
        >{#if concept.bind.type}•<RootView
                node={concept.bind.type}
                inline
                localized="symbolic"
                blocks={$blocks}
            />{#if concept.bind.value}: <RootView
                    node={concept.bind.value}
                    inline
                    localized="symbolic"
                    blocks={$blocks}
                />{/if}{/if}
    </svelte:fragment>
</Speech>
