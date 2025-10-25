<script lang="ts">
    import Expander from '@components/widgets/Expander.svelte';
    import type Concept from '@concepts/Concept';
    import { slide } from 'svelte/transition';
    import { animationDuration } from '../../db/Database';
    import Note from '../widgets/Note.svelte';
    import CodeView from './CodeView.svelte';

    interface Props {
        concepts: Concept[];
        collapse?: boolean;
    }

    let { concepts, collapse = true }: Props = $props();

    let expanded = $state(false);

    function toggle() {
        expanded = !expanded;
    }
</script>

<div class="concepts">
    {#each concepts as concept, index}
        {#if !collapse || expanded || index < 3}
            <span
                transition:slide|local={{
                    duration: $animationDuration,
                }}
            >
                <CodeView {concept} node={concept.getRepresentation()} />
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
        flex-wrap: wrap;
        width: 100%;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: center;
        border-top: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        border-bottom: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }
</style>
