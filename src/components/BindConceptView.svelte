<script lang="ts">
    import CodeView from './CodeView.svelte';
    import type BindConcept from '../concepts/BindConcept';
    import { translations } from '../translations/translations';
    import { getPaletteIndex } from '../editor/util/Contexts';
    import DescriptionView from './DescriptionView.svelte';

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
        {#each $translations as translation}
            <p>
                <DescriptionView
                    description={concept.getDescription(translation)}
                />
            </p>
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
