<script lang="ts">
    import { getConceptIndex, getConceptPath } from '../project/Contexts';
    import ConceptLink from '@nodes/ConceptLink';
    import Concept from '@concepts/Concept';
    import { creator } from '../../db/Creator';

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
        >{#if label}{label}{:else}{concept.getName($creator.getLocale())}{/if}
    </span>
{:else if link instanceof ConceptLink}
    <span>{link.concept.getText()}?</span>
{/if}

<style>
    .salient {
        font-weight: bold;
    }

    span.interactive {
        text-decoration: underline;
        text-decoration-color: var(--wordplay-highlight);
        text-decoration-thickness: var(--wordplay-border-width);
    }

    span.interactive:hover {
        text-decoration-thickness: var(--wordplay-focus-width);
        cursor: pointer;
    }
</style>
