<script lang="ts">
    import type Transform from '../transforms/Transform';
    import {
        preferredLanguages,
        preferredTranslations,
    } from '../translation/translations';
    import RootView from './RootView.svelte';
    import Block from '../nodes/Block';
    import type Menu from './util/Menu';

    export let menu: Menu;
    export let position: { left: number; top: number };

    const WINDOW = 2;

    function handleItemClick(item: Transform) {
        menu.doEdit($preferredLanguages, item);
    }

    // Compute the visible window of items based on the selection.
    let minItem = menu.selection;
    let maxItem = menu.selection;
    $: {
        minItem =
            (menu.selection < WINDOW ? 0 : menu.selection - WINDOW) -
            Math.max(0, menu.selection + WINDOW - (menu.transforms.length - 1));
        maxItem =
            menu.selection + WINDOW + Math.max(0, WINDOW - menu.selection);
    }
</script>

<div class="menu" style:left="{position.left}px" style:top="{position.top}px">
    <table>
        <tr class="item header">
            <td colspan="2">Edit…</td>
        </tr>
        {#each menu.transforms as transform, index}
            {@const [newNode, newParent] =
                transform.getEditedNode($preferredLanguages)}
            {#if index >= minItem && index <= maxItem}
                <!-- Prevent default is to ensure focus isn't lost on editor -->
                <tr
                    class={`item option ${
                        index === menu.selection ? 'selected' : ''
                    }`}
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
            {:else if (index === minItem - 1 && minItem > 0) || (index === maxItem + 1 && maxItem < menu.transforms.length - 1)}
                <tr class="item"><td colspan="2">…</td></tr>
            {/if}
        {:else}
            <!-- Feedback if there are no items.-->
            <tr><td colspan="2"><center>&mdash;</center></td></tr>
        {/each}
    </table>
</div>

<style>
    .menu {
        position: absolute;
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius)
            var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);
        max-width: 30em;
        overflow-x: hidden;
        border-spacing: 0;
    }

    table {
        border-collapse: collapse;
    }

    td {
        text-align: left;
        width: 50%;
    }

    td {
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
