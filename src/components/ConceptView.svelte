<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '../concepts/Concept';
    import CodeView from './CodeView.svelte';
    import { translations } from '../translations/translations';
    import DescriptionView from './DescriptionView.svelte';

    export let concept: Concept;

    $: node = concept.getRepresentation();
</script>

<div transition:slide={{ duration: 250 }}>
    <h1><CodeView {concept} {node} describe={false} /></h1>

    {#each $translations as translation}
        <p>
            <DescriptionView
                description={concept.getDescription(translation)}
            />
        </p>
    {/each}

    <slot />
</div>
