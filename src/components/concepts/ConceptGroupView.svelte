<script lang="ts">
    import ConceptPreview from '@components/concepts/ConceptPreview.svelte';
    import Expander from '@components/widgets/Expander.svelte';
    import Note from '@components/widgets/Note.svelte';
    import type Concept from '@concepts/Concept';
    import { animationDuration, locales } from '@db/Database';
    import { slide } from 'svelte/transition';

    interface Props {
        concepts: Concept[];
        /** Allow the list to be collapsible */
        collapse?: boolean;
        /** Lay out in an inline row */
        row?: boolean;
        /** Include a concept link for each code view */
        describe?: boolean;
    }

    let {
        concepts,
        collapse = true,
        row = true,
        describe = true,
    }: Props = $props();

    let expanded = $state(false);

    function toggle() {
        expanded = !expanded;
    }
</script>

<div class="concepts" class:row>
    {#each concepts as concept, index}
        {#if !collapse || expanded || index < 3}
            <span
                transition:slide|local={{
                    duration: $animationDuration,
                }}
            >
                <ConceptPreview
                    {concept}
                    {describe}
                    node={concept.getRepresentation($locales)}
                />
            </span>
        {/if}
    {:else}
        <Note>&mdash;</Note>
    {/each}
    {#if collapse && (expanded || concepts.length > 3)}
        <Expander
            {expanded}
            {toggle}
            label={(l) => l.ui.docs.button.toggle}
            icons={['–', '+' + (concepts.length - 3)]}
        ></Expander>
    {/if}
</div>

<style>
    .concepts {
        margin: 0;
        display: flex;
        flex-direction: column;
        align-items: start;
        width: 100%;
        gap: calc(3 * var(--wordplay-spacing));
        border-top: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        border-bottom: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }

    .concepts.row {
        flex-direction: row;
        flex-wrap: wrap;
        /* Top-align wrapped previews so each row reads as a clean line of names,
           rather than bottom-aligned with tops at varying heights. */
        align-items: start;
        justify-items: center;
    }
</style>
