<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import type Type from '../../nodes/Type';

    export let concept: Concept;
    export let type: Type | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
</script>

<div
    class="concept"
    transition:slide|local={{ duration: $creator.getAnimationDuration() }}
>
    {#if header}
        <CodeView {concept} {type} {node} describe={false} />
    {/if}

    <Speech glyph={concept.getGlyphs($creator.getLanguages())} below={header}>
        <MissingLocalesView />
        {#each $creator.getLocales() as locale}
            {@const markup = concept.getDocs(locale)}
            {#if markup}
                <MarkupHTMLView {markup} />
            {:else}
                {locale.ui.labels.nodoc}
            {/if}
        {:else}
            {#each $creator.getLocales() as trans}
                <p>
                    {trans.ui.labels.nodoc}
                </p>
            {/each}
        {/each}
    </Speech>

    <slot />
</div>

<style>
    .concept {
        display: flex;
        flex-direction: column;
        gap: calc(2 * var(--wordplay-spacing));
    }
</style>
