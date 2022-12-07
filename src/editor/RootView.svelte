<svelte:options immutable={true}/>
<script lang="ts">
    import { setContext } from "svelte";
    import { writable } from "svelte/store";
    import type Node from "../nodes/Node";
    import Tree from "../nodes/Tree";
    import NodeView from "./NodeView.svelte";
    import { RootSymbol, type RootContext } from "./util/Contexts";

    export let node: Node;

    // Make a store for the root.
    let root = writable<Tree>(new Tree(node));

    // When the node changes, update the store.
    $: {
        root.set(new Tree(node));
        setContext<RootContext>(RootSymbol, root);
    }

</script>

<div class="root"><NodeView {node}/></div>

<style>
    .root {
        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
        font-weight: 400;
    }
</style>