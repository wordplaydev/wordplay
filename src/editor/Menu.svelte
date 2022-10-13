<script lang="ts">
    import type Reference from "../nodes/Reference";
    import Node from "../nodes/Node";
    import nodeToView from "./nodeToView";
    import UnknownNodeView from "./UnknownNodeView.svelte";

    type Item = Node | Reference<Node>;

    export let items: Item[];
    export let index: number;
    export let select: (item: Item) => void;

    function handleItemClick(item: Item, event: MouseEvent) {
        select(item);
        event.stopPropagation();
    }

</script>

<section class="menu">
    {#each items.map(item => { 
        return { 
            node: item instanceof Node ? item : item.getNode("eng"), 
            description: item instanceof Node ? item.getDescriptions().eng : item.definition.getDescriptions().eng }
        }) as item, i}
        <div class={`item ${i === index ? "selected" : ""}`} on:mousedown={event => handleItemClick(item.node, event)}>
            <div class="col"><svelte:component this={nodeToView.get(item.node.constructor) ?? UnknownNodeView} node={item.node} /></div>
            <div class="col"><em>{item.description}</em></div>
        </div>
    {/each}
</section>

<style>
    .menu {
        background-color: var(--wordplay-background);
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        border-radius: var(--wordplay-border-radius);
        padding: var(--wordplay-spacing);
        font-size: var(--wordplay-font-size);
        box-shadow: var(--wordplay-border-radius) var(--wordplay-border-radius) var(--wordplay-border-radius) 0px var(--wordplay-lightgrey);
        max-width: 40em;
        overflow-x: hidden;
        z-index: 3;
    }

    .menu .item {

        display: flex;
        flex-direction: row;
        align-content: flex-start;

        padding-top: var(--wordplay-spacing);
        padding-bottom: var(--wordplay-spacing);
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