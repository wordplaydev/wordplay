<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { config } from '../../db/Database';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import RootView from '../project/RootView.svelte';

    export let concept: BindConcept;
</script>

<Speech glyph={concept.getGlyphs($config.getLocales())} below={true}>
    <svelte:fragment slot="content">
        {#each $config.getLocales() as trans}
            {@const markup = concept.getDocs(trans)}
            {#if markup}
                <MarkupHTMLView {markup} />
            {:else}
                {trans.ui.labels.nodoc}
            {/if}
        {/each}
    </svelte:fragment>
    <svelte:fragment slot="aside"
        >{#if concept.bind.type}• <RootView
                node={concept.bind.type}
                inline
                localized
            />{#if concept.bind.value}: <RootView
                    node={concept.bind.value}
                    inline
                    localized
                />{/if}{/if}
    </svelte:fragment>
</Speech>
