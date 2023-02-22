<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '@translation/translations';
    import MissingTranslationsView from './MissingTranslationsView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';
    import type StructureConcept from '@concepts/StructureConcept';
    import Speech from '../lore/Speech.svelte';

    export let concept: Concept;
    export let types: StructureConcept[] | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
</script>

<div class="concept" transition:slide={{ duration: 250 }}>
    {#if header}
        <h1
            ><CodeView {concept} {types} {node} describe={false} />
            <!-- {#each $preferredTranslations as translation, index}
                {#if index > 0}/{/if}
                <DescriptionView description={concept.getName(translation)} />
            {/each} -->
        </h1>
    {/if}

    <Speech glyph={concept.getGlyphs($preferredLanguages)} below={header}>
        <MissingTranslationsView />
        {#each $preferredTranslations as trans}
            {@const doc = concept.getDocs(trans)}
            {#if doc}
                <DocHTMLView {doc} spaces={concept.context.source.spaces} />
            {:else}
                {trans.ui.labels.nodoc}
            {/if}
        {:else}
            {#each $preferredTranslations as trans}
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
        gap: var(--wordplay-spacing);
    }
</style>
