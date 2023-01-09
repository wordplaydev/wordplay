<script lang="ts">
    import type Transform from '../transforms/Transform';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '../translations/translations';
    import RootView from './RootView.svelte';
    import Block from '../nodes/Block';

    export let transforms: Transform[];
    export let selection: number;
    export let select: (item: Transform) => void;

    const WINDOW = 2;

    function handleItemClick(item: Transform) {
        select(item);
    }

    // Compute the visible window of items based on the selection.
    let minItem = selection;
    let maxItem = selection;
    $: {
        minItem =
            (selection < WINDOW ? 0 : selection - WINDOW) -
            Math.max(0, selection + WINDOW - (transforms.length - 1));
        maxItem = selection + WINDOW + Math.max(0, WINDOW - selection);
    }
</script>

<table class="menu">
    <tr class="item header">
        <td colspan="2">Edit…</td>
    </tr>
    {#each transforms as transform, index}
        {@const [newNode, newParent] =
            transform.getEditedNode($preferredLanguages)}
        {#if index >= minItem && index <= maxItem}
            <!-- Prevent default is to ensure focus isn't lost on editor -->
            <tr
                class={`item option ${index === selection ? 'selected' : ''}`}
                on:mousedown|preventDefault|stopPropagation={() =>
                    handleItemClick(transform)}
            >
                <td class="col">
                    {#if newNode !== undefined}
                        <!-- If the new parent is a block with more than one statement, show the new node only instead -->
                        <RootView
                            node={newParent instanceof Block &&
                            newParent.statements.length > 1
                                ? newNode
                                : newParent}
                        />
                    {:else}
                        <em>Remove</em>
                    {/if}
                </td><td class="col"
                    ><em
                        >{transform.getDescription(
                            $preferredTranslations[0]
                        )}</em
                    ></td
                >
            </tr>
        {:else if (index === minItem - 1 && minItem > 0) || (index === maxItem + 1 && maxItem < transforms.length - 1)}
            <tr class="item"><td colspan="2">…</td></tr>
        {/if}
    {:else}
        <!-- Feedback if there are no items.-->
        <tr><td colspan="2"><center>&mdash;</center></td></tr>
    {/each}
</table>

<style>
    .menu {
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius)
            var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);
        max-width: 40em;
        overflow-x: hidden;
        border-spacing: 0;
    }

    .menu td {
        text-align: left;
        width: 50%;
    }

    .menu td {
        padding: var(--wordplay-spacing);
        white-space: nowrap;
    }

    .item.header {
        background-color: var(--wordplay-disabled-color);
    }

    .item.option:hover,
    .selected {
        cursor: pointer;
        background-color: var(--wordplay-highlight);
    }

    .col:first-child {
        margin-right: calc(2 * var(--wordplay-spacing));
    }
</style>
