<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '../concepts/Concept';
    import CodeView from './CodeView.svelte';
    import { preferredTranslations } from '../translation/translations';
    import DescriptionView from './DescriptionView.svelte';
    import MissingTranslationsView from './MissingTranslationsView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';

    export let concept: Concept;

    $: node = concept.getRepresentation();
</script>

<div transition:slide={{ duration: 250 }}>
    <h1
        >{#each $preferredTranslations as translation, index}
            {#if index > 0}/{/if}
            <DescriptionView description={concept.getName(translation)} />
        {/each}
    </h1>

    <CodeView {concept} {node} describe={false} />

    <MissingTranslationsView />
    {#each $preferredTranslations.map((trans) => concept.getDocs(trans)) as doc}
        {#if doc}
            <DocHTMLView {doc} spaces={concept.context.source.spaces} />
        {/if}
    {/each}

    <slot />
</div>
