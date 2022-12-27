<svelte:options immutable={true}/>
<script lang="ts">
    import { setContext } from "svelte";
    import { writable } from "svelte/store";
    import type Node from "../nodes/Node";
    import Tree from "../nodes/Tree";
    import NodeView from "./NodeView.svelte";
    import { RootSymbol, type RootContext } from "./util/Contexts";

    export let node: Node;

    // Make a store for the root and set it as context.
    let root = writable<Tree>(new Tree(node));
    setContext<RootContext>(RootSymbol, root);
 
    // When the node changes, update the store.
    $: root.set(new Tree(node));

</script>

<div class="root"><NodeView {node}/></div>

<style>
    .root {
        font-family: var(--wordplay-code-font);
        font-size: var(--wordplay-font-size);
        font-weight: 400;
    }
</style>