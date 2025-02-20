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

<div class="concept-group">
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
</div>
{#if collapse}
    {#if expanded || concepts.length > 3}
        <Expander {expanded} {toggle}></Expander>
    {/if}
{/if}

<style>
    .concept-group {
        margin: var(--wordplay-spacing);
        margin-left: 0;
        display: flex;
        flex-wrap: wrap;
        gap: calc(2 * var(--wordplay-spacing));
        align-items: end;
        border-top: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        border-bottom: var(--wordplay-border-color) dotted
            var(--wordplay-border-width);
        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
    }
</style>
