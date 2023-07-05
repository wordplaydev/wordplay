<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import MissingLocalesView from './MissingLocalesView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';
    import type StructureConcept from '@concepts/StructureConcept';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';

    export let concept: Concept;
    export let types: StructureConcept[] | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
</script>

<div
    class="concept"
    transition:slide|local={{ duration: $creator.getAnimationDuration() }}
>
    {#if header}
        <h1
            ><CodeView {concept} {types} {node} describe={false} />
            <!-- {#each $preferredLocales as translation, index}
                {#if index > 0}/{/if}
                <DescriptionView description={concept.getName(translation)} />
            {/each} -->
        </h1>
    {/if}

    <Speech glyph={concept.getGlyphs($creator.getLanguages())} below={header}>
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
