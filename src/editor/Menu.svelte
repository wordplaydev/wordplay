<script lang="ts">
    import Node from "../nodes/Node";
    import nodeToView from "./nodeToView";
    import type Transform from "../nodes/Transform";
    import UnknownNodeView from "./UnknownNodeView.svelte";

    export let items: Transform[];
    export let index: number;
    export let action: "replace" | "insert";
    export let select: (item: Transform) => void;

    function handleItemClick(item: Transform, event: MouseEvent) {
        select(item);
        event.stopPropagation();
    }

    let actionLabel = action === "insert" ? "Insert " : "Replace with ";

</script>

<section class="menu">
    <div class="item header">
        <em>{actionLabel}…</em>
    </div>
    {#each items.map(item => { 
        return { 
            node: item instanceof Node ? item : Array.isArray(item) ? item : item.getNode("eng"), 
            // TODO item[1] is kludgey. It assumes the first node is an uninteresting placeholder, which may not always be true.
            description: item instanceof Node ? item.getDescriptions().eng : Array.isArray(item) ? item[1].getDescriptions().eng : item.definition.getDescriptions().eng }
        }) as item, i}
        <div class={`item ${i === index ? "selected" : ""}`} on:mousedown={event => handleItemClick(item.node, event)}>
            <div class="col"><svelte:component this={nodeToView.get((Array.isArray(item.node) ? item.node[0] : item.node).constructor) ?? UnknownNodeView} node={Array.isArray(item.node) ? item.node[0] : item.node} />{#if Array.isArray(item.node) }<svelte:component this={nodeToView.get(item.node[1].constructor) ?? UnknownNodeView} node={item.node[1]} />{/if}</div>
            <div class="col"><em>{item.description}</em></div>
        </div>
    {:else}
        Nothing to {actionLabel.toLocaleLowerCase()}
    {/each}

</section>

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
    }

    .item.header {
        background-color: var(--wordplay-disabled-color);
    }

    .menu .item {

        display: flex;
        flex-direction: row;
        align-content: flex-start;

        padding: var(--wordplay-spacing);
        white-space: nowrap;

    }

    .item:hover, .selected {
        cursor: pointer;
        background-color: var(--wordplay-highlight);
    }

    .col:first-child {
        margin-right: calc(2 * var(--wordplay-spacing));
    }

</style>