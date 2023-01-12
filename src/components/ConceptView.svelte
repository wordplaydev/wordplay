<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '../concepts/Concept';
    import CodeView from './CodeView.svelte';
    import { preferredTranslations } from '../translation/translations';
    import DescriptionView from './DescriptionView.svelte';
    import MissingTranslationsView from './MissingTranslationsView.svelte';
    import DocHTMLView from './DocHTMLView.svelte';
    import type StructureConcept from '../concepts/StructureConcept';

    export let concept: Concept;
    export let type: StructureConcept | undefined = undefined;
    export let header: boolean = true;

    $: node = concept.getRepresentation();
</script>

<div transition:slide={{ duration: 250 }}>
    {#if header}
        <h1
            >{#each $preferredTranslations as translation, index}
                {#if index > 0}/{/if}
                <DescriptionView description={concept.getName(translation)} />
            {/each}
        </h1>
    {/if}

    <CodeView {concept} {type} {node} describe={false} />

    <MissingTranslationsView />
    {#each $preferredTranslations.map((trans) => concept.getDocs(trans)) as doc}
        {#if doc}
            <DocHTMLView {doc} spaces={concept.context.source.spaces} />
        {/if}
    {:else}
        {#each $preferredTranslations as trans}
            <p>
                {trans.ui.labels.nodoc}
            </p>
        {/each}
    {/each}

    <slot />
</div>
