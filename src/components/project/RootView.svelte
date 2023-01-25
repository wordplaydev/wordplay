<svelte:options immutable={true} />

<script lang="ts">
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import Docs from '@nodes/Docs';
    import Names from '@nodes/Names';
    import type Node from '@nodes/Node';
    import type Token from '@nodes/Token';
    import Tree from '@nodes/Tree';
    import Spaces from '../../parser/Spaces';
    import { preferredLanguages } from '@translation/translations';
    import NodeView from '@components/editor/NodeView.svelte';
    import {
        getCaret,
        HiddenSymbol,
        RootSymbol,
        SpaceSymbol,
        type RootContext,
        type SpaceContext,
    } from './Contexts';

    export let node: Node;
    /** Optional space; if not provided, all nodes are rendered with preferred space. */
    export let spaces: Spaces | undefined = undefined;
    export let inert: boolean = false;

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

    let caret = getCaret();

    // A set of hidden nodes, such as hidden translations.
    let hidden = writable<Set<Node>>(new Set());
    setContext(HiddenSymbol, hidden);

    // When the caret changes, the update what's hidden.
    $: {
        const newHidden = new Set<Node>();

        // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't one of the selected tags.
        for (const tag of node.nodes(
            (n) => n instanceof Docs || n instanceof Names
        ) as (Docs | Names)[]) {
            // Get all the names or docs
            const nameOrDocs = tag instanceof Docs ? tag.docs : tag.names;
            // If at least one is visible, hide all those not in a preferred language.
            if (
                $preferredLanguages.some((lang) =>
                    nameOrDocs.some((l) => l.getLanguage() === lang)
                )
            ) {
                for (const nameOrDoc of nameOrDocs) {
                    if (
                        !$preferredLanguages.some(
                            (t) => t === nameOrDoc.getLanguage()
                        ) &&
                        !$caret?.isIn(nameOrDoc)
                    )
                        newHidden.add(nameOrDoc);
                }
            }
            // Otherwise, hide all but the first.
            else {
                for (const nameOrDoc of nameOrDocs.slice(1))
                    newHidden.add(nameOrDoc);
            }
        }

        // Update hidden nodes.
        hidden.set(newHidden);
    }
</script>

<span class="root" class:inert><NodeView {node} /></span>

<style>
    .root {
        font-family: var(--wordplay-code-font);
        font-weight: 400;
    }
</style>
