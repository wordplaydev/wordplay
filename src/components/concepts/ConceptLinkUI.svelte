<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import type ConceptLink from '@nodes/ConceptLink';
    import { preferredLocales } from '@locale/locales';
    import Concept from '@concepts/Concept';

    export let link: ConceptLink | Concept;
    export let salient: boolean = true;
    export let label: string | undefined = undefined;

    // Resolve the concept
    let index = getConceptIndex();
    let path = getConceptPath();

    let concept: Concept | undefined;
    $: {
        if (link instanceof Concept) concept = link;
        else {
            const id = link.concept.getText().slice(1);
            concept =
                id === undefined ? undefined : $index?.getConceptByName(id);
        }
    }

    function navigate() {
        if (concept && $path[$path.length - 1] !== concept)
            path.set([...$path, concept]);
    }
</script>

{#if concept}
    <span
        class="interactive"
        class:salient
        on:pointerdown={navigate}
        on:keydown={(event) =>
            event.key == ' ' || event.key === 'Enter' ? navigate() : undefined}
        >{#if label}{label}{:else}{concept.getName($preferredLocales[0])}{/if}
    </span>
{:else}
    <span>&mdash;</span>
{/if}

<style>
    .salient {
        font-weight: bold;
    }

    span.interactive:hover {
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight);
        text-decoration-thickness: var(--wordplay-focus-width);
        cursor: pointer;
    }
</style>
