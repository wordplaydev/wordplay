<script lang="ts">
    import CodeView from './CodeView.svelte';
    import type BindConcept from '../concepts/BindConcept';
    import { preferredTranslations } from '../translations/translations';
    import { getPaletteIndex } from '../editor/util/Contexts';
    import DocHTMLView from './DocHTMLView.svelte';
    import MissingTranslationsView from './MissingTranslationsView.svelte';

    export let concept: BindConcept;

    $: bind = concept.bind;

    let index = getPaletteIndex();
    $: type = $index.getConceptOfType(bind.getType(concept.context));
</script>

<section>
    <p class="bind">
        <CodeView {concept} node={concept.reference} describe={false} /> • <CodeView
            concept={type ?? concept}
            node={type?.getRepresentation() ?? bind.getType(concept.context)}
        />
    </p>
    {#if bind.docs}
        <MissingTranslationsView />
        {#each $preferredTranslations.map( (trans) => concept.getDocs(trans) ) as stuff}
            {#if stuff}
                <DocHTMLView doc={stuff[0]} spaces={stuff[1]} />
            {/if}
        {/each}
    {/if}
</section>

<style>
    .bind {
        white-space: nowrap;
    }

    section {
        margin-top: var(--wordplay-spacing);
    }
</style>
