<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MarkupHTMLView from './MarkupHTMLView.svelte';
    import Speech from '../lore/Speech.svelte';
    import { config } from '../../db/Creator';
    import type Type from '../../nodes/Type';
    import concretize from '../../locale/concretize';

    export let concept: Concept;
    export let type: Type | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
    $: locale = $config.getLocale();
</script>

<div
    class="concept"
    transition:slide|local={{ duration: $config.getAnimationDuration() }}
>
    {#if header}
        <CodeView {concept} {type} {node} describe={false} />
    {/if}

    <Speech glyph={concept.getGlyphs($config.getLocales())} below={header}>
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
