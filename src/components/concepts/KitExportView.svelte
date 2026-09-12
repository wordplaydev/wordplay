<!-- One of a kit's `↑` exports, as its own named and bounded section (#8).

     The guide shows one concept at a time, so the concept views head their own inner
     sections ("Names", "Inputs") and never had to say where one export stops. Stacked on
     a kit's page, four exports gave eight sibling `h2`s and nothing naming the exports at
     all, so a reader met `hueFor(input)` directly under the previous export's inputs with
     no way to tell a new one had started.

     Its own component so it can set the heading level for what it contains: a context
     covers the component that sets it, and the kit's own name is a level above. -->
<script lang="ts">
    import { setHeadingLevel } from '@components/app/headingLevel.js';
    import BindConceptView from '@components/concepts/BindConceptView.svelte';
    import ConceptView from '@components/concepts/ConceptView.svelte';
    import FunctionConceptView from '@components/concepts/FunctionConceptView.svelte';
    import StructureConceptView from '@components/concepts/StructureConceptView.svelte';
    import BindConcept from '@concepts/BindConcept';
    import type Concept from '@concepts/Concept';
    import FunctionConcept from '@concepts/FunctionConcept';
    import StructureConcept from '@concepts/StructureConcept';
    import { locales } from '@db/Database';

    interface Props {
        concept: Concept;
    }

    let { concept }: Props = $props();

    // The kit's name is the page's `h2` and this section's name is the `h3` below, so
    // every section a concept view heads inside it is an `h4`.
    setHeadingLevel(4);
</script>

<section class="export">
    <h3>{concept.getName($locales, false)}</h3>
    {#if concept instanceof StructureConcept}
        <StructureConceptView {concept} />
    {:else if concept instanceof FunctionConcept}
        <FunctionConceptView {concept} />
    {:else if concept instanceof BindConcept}
        <BindConceptView {concept} />
    {:else}
        <ConceptView {concept} />
    {/if}
</section>

<style>
    /* A rule and real space between exports: the boundary has to be visible before it is
       structural, since each export is itself a stack of headed sections. */
    .export {
        padding-block-start: calc(2 * var(--wordplay-spacing));
        border-block-start: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
    }

    /* The app's default `h3` is a quiet italic note, which is right inline and wrong for
       a section title: it would sit lighter than the bold "Names"/"Inputs" headings
       inside it. Upright and bold, so an export reads as the strongest thing in its own
       section. */
    h3 {
        font-size: min(7vw, 20pt);
        font-style: normal;
        font-weight: bold;
        margin-block-start: 0;
        margin-block-end: var(--wordplay-spacing);
    }
</style>
