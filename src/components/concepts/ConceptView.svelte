<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import type Type from '../../nodes/Type';
    import concretize from '../../locale/concretize';

    export let concept: Concept;
    export let type: Type | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
    $: locale = $creator.getLocale();
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
        {@const markup = concept.getDocs(locale)}
        {#if markup}
            <MarkupHTMLView {markup} />
        {:else}
            {concretize(locale, locale.ui.labels.nodoc)}
        {/if}
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
