<script lang="ts">
    import type Revision from '@edit/Revision';
    import RootView from '../project/RootView.svelte';
    import Block from '@nodes/Block';
    import type Menu from './util/Menu';
    import Node from '@nodes/Node';
    import { getConceptIndex } from '../project/Contexts';
    import Speech from '../lore/Speech.svelte';
    import { creator } from '../../db/Creator';
    import MarkupHTMLView from '../concepts/MarkupHTMLView.svelte';

    export let menu: Menu;
    export let position: { left: number; top: number };

    let width: number;
    let height: number;

    const WINDOW = 2;

    function handleItemClick(item: Revision) {
        menu.doEdit($creator.getLanguages(), item);
    }

    let index = getConceptIndex();
    $: node =
        menu.caret.position instanceof Node ? menu.caret.position : undefined;
    $: concept = node ? $index?.getNodeConcept(node) : undefined;

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

<div
    class="menu"
    bind:clientWidth={width}
    bind:clientHeight={height}
    style:left="{position.left -
        Math.max(0, position.left + (width ?? 0) - window.innerWidth)}px"
    style:top="{position.top -
        Math.max(0, position.top + (height ?? 0) - window.innerHeight)}px"
>
    <table>
        {#if node && concept}
            <td colspan="2"
                ><Speech glyph={concept}
                    >{$creator.getLocale().ui.header.editing}</Speech
                ></td
            >
        {/if}
        {#each menu.transforms as transform, index}
            {@const [newNode, newParent] = transform.getEditedNode(
                $creator.getLanguages()
            )}
            {#if index >= minItem && index <= maxItem}
                <!-- Prevent default is to ensure focus isn't lost on editor -->
                <tr
                    class={`item option ${
                        index === menu.selection ? 'selected' : ''
                    }`}
                    on:pointerdown|preventDefault|stopPropagation={() =>
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
                                localized
                            />
                        {:else}
                            <em>Remove</em>
                        {/if}
                    </td><td class="col"
                        ><em
                            ><MarkupHTMLView
                                markup={transform.getDescription(
                                    $creator.getLocale()
                                )}
                            /></em
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
        background-color: var(--wordplay-chrome);
    }

    .item.option:hover,
    .selected {
        cursor: pointer;
        background-color: var(--wordplay-highlight);
    }

    .item.option:hover :global(.token-view),
    .selected :global(.token-view) {
        color: var(--wordplay-background);
    }

    .item.option:hover td,
    .selected td {
        color: var(--wordplay-background);
    }

    .col:first-child {
        margin-right: calc(2 * var(--wordplay-spacing));
    }
</style>
