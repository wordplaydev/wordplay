<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import type ConceptLink from '@nodes/ConceptLink';
    import { preferredTranslations } from '@translation/translations';

    export let link: ConceptLink;

    // Resolve the concept
    let index = getConceptIndex();
    let path = getConceptPath();

    $: id = link.concept.getText().slice(1);
    $: concept = id === undefined ? undefined : $index?.getConceptByName(id);

    function navigate() {
        if (concept && $path[$path.length - 1] !== concept)
            path.set([...$path, concept]);
    }
</script>

{#if concept}
    <span
        class="interactive"
        on:click={navigate}
        on:keydown={(event) =>
            event.key == ' ' || event.key === 'Enter' ? navigate() : undefined}
        >{concept.getName($preferredTranslations[0])}</span
    >
{:else}
    <span>&mdash;</span>
{/if}

<style>
    span {
        color: var(--wordplay-highlight);
    }

    span.interactive:hover {
        text-decoration: underline;
        text-decoration-thickness: var(--wordplay-focus-width);
        cursor: pointer;
    }
</style>
