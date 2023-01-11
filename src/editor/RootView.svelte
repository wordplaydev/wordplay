<svelte:options immutable={true} />

<script lang="ts">
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import type Node from '../nodes/Node';
    import type Token from '../nodes/Token';
    import Tree from '../nodes/Tree';
    import Spaces from '../parser/Spaces';
    import NodeView from './NodeView.svelte';
    import {
        RootSymbol,
        SpaceSymbol,
        type RootContext,
        type SpaceContext,
    } from './util/Contexts';

    export let node: Node;
    /** Optional space; if not provided, all nodes are rendered with preferred space. */
    export let spaces: Spaces | undefined = undefined;

    // Make a store for the root and set it as context.
    let root = writable<Tree>(new Tree(node));
    setContext<RootContext>(RootSymbol, root);

    // When the node changes, update the store
    $: root.set(new Tree(node));

    // When the spaces change, update the rendered spaces
    let renderedSpace: SpaceContext = writable(new Map());
    setContext(SpaceSymbol, renderedSpace);
    $: {
        // Reset the space.
        const newSpace = new Map();

        // Compute the space for every node
        for (const n of node.nodes()) {
            // Get the first leaf of this node.
            const firstLeaf = n.getFirstLeaf() as Token | undefined;
            if (firstLeaf === undefined) continue;
            const leafTree = $root.get(firstLeaf);
            if (leafTree === undefined) continue;
            // Determine if the first leaf is the leaf's space root.
            if (leafTree.getSpaceRoot() !== n) continue;
            // What's the given space?
            let space = spaces ? spaces.getSpace(firstLeaf) : '';
            // What is the leaf's preferred space?
            let preferred = Spaces.getPreferredPrecedingSpace(space, leafTree);
            // Compute the additional space for rendering.
            let additional = spaces
                ? spaces.getAdditionalSpace(firstLeaf, preferred)
                : preferred;
            // Save what we computed
            newSpace.set(n, { token: firstLeaf, space, additional });
        }

        renderedSpace.set(newSpace);
    }
</script>

<span class="root"><NodeView {node} /></span>

<style>
    .root {
        font-family: var(--wordplay-code-font);
        font-weight: 400;
    }
</style>
