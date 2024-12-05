<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { blocks, locales } from '@db/Database';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import RootView from '../project/RootView.svelte';

    interface Props {
        concept: BindConcept;
    }

    let { concept }: Props = $props();
</script>

<Speech glyph={concept.getGlyphs($locales)} below={true}>
    {#snippet content()}    
            {@const markup = concept.getDocs($locales)}
            {#if markup}
                <MarkupHTMLView {markup} />
            {:else}
                {$locales.get((l) => l.ui.docs.nodoc)}
            {/if}
    {/snippet}
    {#snippet aside()}
        {#if concept.bind.type}•<RootView
            node={concept.bind.type}
            inline
            localized="symbolic"
            blocks={$blocks}
        />{/if}{#if concept.bind.value}: <RootView
                node={concept.bind.value}
                inline
                localized="symbolic"
                blocks={$blocks}
            />{/if}
    {/snippet}
</Speech>
