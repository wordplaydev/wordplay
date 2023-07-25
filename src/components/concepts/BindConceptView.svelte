<script lang="ts">
    import type BindConcept from '@concepts/BindConcept';
    import Speech from '../lore/Speech.svelte';
    import { config } from '../../db/Creator';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';

    export let concept: BindConcept;
</script>

<Speech
    glyph={concept.getGlyphs($config.getLanguages())}
    bind={concept.bind}
    below={true}
>
    <MissingLocalesView />
    {#each $config.getLocales() as trans}
        {@const markup = concept.getDocs(trans)}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {trans.ui.labels.nodoc}
        {/if}
    {/each}
</Speech>
