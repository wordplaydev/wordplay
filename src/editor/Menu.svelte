<script lang="ts">
    import Node from "../nodes/Node";
    import nodeToView from "./nodeToView";
    import type Transform from "../nodes/Transform";
    import UnknownNodeView from "./UnknownNodeView.svelte";

    export let items: Transform[];
    export let selection: number;
    export let action: "replace" | "insert";
    export let select: (item: Transform) => void;

    const WINDOW = 2;

    function handleItemClick(item: Transform, event: MouseEvent) {
        select(item);
        event.stopPropagation();
    }

    let actionLabel = action === "insert" ? "Insert " : "Replace with ";

    // Compute the visible window of items based on the selection.
    let minItem = selection;
    let maxItem = selection;
    $: {
        minItem = (selection < WINDOW ? 0 : selection - WINDOW) - Math.max(0, selection + WINDOW - (items.length - 1));
        maxItem = selection + WINDOW + Math.max(0, WINDOW - selection);
    }

</script>

<table class="menu">
    <tr class="item header">
        <td colspan=2>{actionLabel}…</td>
    </tr>
    {#each items.map(item => {     
        return { 
            node: item instanceof Node ? item : Array.isArray(item) ? item : item.getNode("eng"), 
            // TODO item[1] is kludgey. It assumes the first node is an uninteresting placeholder, which may not always be true.
            description: item instanceof Node ? item.getDescriptions().eng : Array.isArray(item) ? item[1].getDescriptions().eng : item.definition.getDescriptions().eng }
        }) 
        as item, index
    }
        {#if index >= minItem && index <= maxItem }
            <tr class={`item option ${index === selection ? "selected" : ""}`} on:mousedown={event => handleItemClick(item.node, event)}>
                <td class="col">
                    {#each Array.isArray(item.node) ? item.node : [ item.node ] as node}
                        <svelte:component this={nodeToView.get(node.constructor) ?? UnknownNodeView} node={node} />
                    {/each}
                <td class="col"><em>{item.description}</em></td>
            </tr>
        {:else if (index === minItem - 1 && minItem > 0) || (index === maxItem + 1 && maxItem < items.length - 1) }
            <tr class="item"><td colspan=2>…</td></tr>
        {/if}
    {:else}
        <!-- Feedback if there are no items. -->
        Nothing to {actionLabel.toLocaleLowerCase()}
    {/each}

</table>

<style>
    .menu {
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius) var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);
        max-width: 40em;
        overflow-x: hidden;
        z-index: 3;
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

    .item.option:hover, .selected {
        cursor: pointer;
        background-color: var(--wordplay-highlight);
    }

    .col:first-child {
        margin-right: calc(2 * var(--wordplay-spacing));
    }

</style>