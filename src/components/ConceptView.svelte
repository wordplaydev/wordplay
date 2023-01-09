<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '../concepts/Concept';
    import CodeView from './CodeView.svelte';
    import { preferredTranslations } from '../translations/translations';
    import DescriptionView from './DescriptionView.svelte';
    import MissingTranslationsView from './MissingTranslationsView.svelte';

    export let concept: Concept;

    $: node = concept.getRepresentation();
</script>

<div transition:slide={{ duration: 250 }}>
    <h1
        >{#each $preferredTranslations as translation, index}
            {#if index > 0}/{/if}
            <DescriptionView
                description={concept.getDescription(translation)}
            />
        {/each}
    </h1>

    <CodeView {concept} {node} describe={false} />

    <h2>purpose</h2>
    <MissingTranslationsView />
    {#each $preferredTranslations.map((trans) => concept.getDocs(trans)) as doc}
        <p>
            {#if doc}
                <DescriptionView description={doc} />
            {/if}
        </p>
    {/each}

    <slot />
</div>
