<script lang="ts">
    import { slide } from 'svelte/transition';
    import type Concept from '@concepts/Concept';
    import CodeView from './CodeView.svelte';
    import Note from '../widgets/Note.svelte';
    import NodeConcept from '../../concepts/NodeConcept';

    export let concepts: Concept[];
    export let selectable: boolean;

    let expanded: boolean = false;

    function toggle() {
        expanded = !expanded;
    }
</script>

<div class="group">
    {#each concepts as concept, index}
        {#if expanded || index < 3}
            <span transition:slide={{ duration: 200 }}>
                <CodeView
                    {concept}
                    node={concept.getRepresentation()}
                    {selectable}
                    docs={!(concept instanceof NodeConcept)}
                />
            </span>
        {/if}
    {:else}
        <Note>&mdash;</Note>
    {/each}
</div>
{#if expanded || concepts.length > 3}
    <div
        class="expander"
        class:expanded
        tabIndex="0"
        on:click={toggle}
        on:keydown={(event) =>
            event.key === ' ' || event.key === 'Enter' ? toggle() : undefined}
        >{#if expanded}▲{:else}▼{/if}</div
    >
{/if}

<style>
    .group {
        margin: var(--wordplay-spacing);
        margin-left: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--wordplay-spacing);
    }

    .expander {
        text-align: center;
        cursor: pointer;
        transition: transform 0.25s ease-out;
        color: var(--wordplay-disabled-color);
    }

    .expander:focus {
        transform: scale(1.1);
        color: var(--wordplay-highlight);
        outline: none;
    }

    .expander:hover {
        transform: scale(1.1);
        color: var(--wordplay-highlight);
    }
</style>
