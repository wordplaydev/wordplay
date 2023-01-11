<script lang="ts">
    import { getPaletteIndex, getPalettePath } from '../editor/util/Contexts';
    import type ConceptLink from '../nodes/ConceptLink';
    import { preferredTranslations } from '../translations/translations';

    export let link: ConceptLink;

    // Resolve the concept
    let index = getPaletteIndex();
    let path = getPalettePath();

    $: id = link.concept.getText().slice(1);
    $: concept = id === undefined ? undefined : $index.getConceptByName(id);

    function navigate() {
        if (concept) path.set([...$path, concept]);
    }
</script>

{#if concept}
    <span
        class="interactive"
        on:click={navigate}
        on:keydown={(event) =>
            event.key == ' ' || event.key === 'Enter' ? navigate() : undefined}
        >{concept.getDescription($preferredTranslations[0])}</span
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
        text-decoration-thickness: var(--wordplay-border-width);
        cursor: pointer;
    }
</style>
