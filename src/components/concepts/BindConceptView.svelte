<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { config } from '../../db/Creator';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    export let concept: BindConcept;
</script>

<Speech
    glyph={concept.getGlyphs($config.getLocales())}
    bind={concept.bind}
    below={true}
>
    {#each $config.getLocales() as trans}
        {@const markup = concept.getDocs(trans)}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {trans.ui.labels.nodoc}
        {/if}
    {/each}
</Speech>
