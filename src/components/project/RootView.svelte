<script lang="ts">
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import Docs from '@nodes/Docs';
    import Names from '@nodes/Names';
    import type Node from '@nodes/Node';
    import type Token from '@nodes/Token';
    import Spaces from '@parser/Spaces';
    import NodeView from '@components/editor/NodeView.svelte';
    import {
        getCaret,
        HiddenSymbol,
        RootSymbol,
        SpaceSymbol,
        type SpaceContext,
        CaretSymbol,
    } from './Contexts';
    import Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import Name from '@nodes/Name';
    import Program from '@nodes/Program';
    import { creator } from '../../db/Creator';

    export let node: Node;
    /** Optional space; if not provided, all nodes are rendered with preferred space. */
    export let spaces: Spaces | undefined = undefined;
    export let inert: boolean = false;
    export let inline: boolean = false;
    /** If true, hides names and docs not in a selected locale */
    export let localized: boolean = false;

    /** Get the root, or make one if it's not a source. */
    $: root = node instanceof Source ? node.root : new Root(node);

    // Expose the root in a store context for quick access to it.
    let rootStore = writable(root);
    $: rootStore.set(root);
    setContext(RootSymbol, rootStore);

    // When the spaces change, update the rendered spaces
    let renderedSpace: SpaceContext = writable(new Map());
    setContext(SpaceSymbol, renderedSpace);

    $: if (inert) setContext(CaretSymbol, undefined);

    $: {
        // Reset the space.
        const newSpace = new Map();

        // Compute the space for every node
        for (const n of node.nodes()) {
            // Get the first leaf of this node.
            const firstLeaf = n.getFirstLeaf() as Token | undefined;
            if (firstLeaf === undefined) continue;
            // Determine if the first leaf is the leaf's space root.
            if (root.getSpaceRoot(firstLeaf) !== n) continue;
            // What's the given space?
            let space = spaces ? spaces.getSpace(firstLeaf) : '';
            // What is the leaf's preferred space?
            let preferred = Spaces.getPreferredPrecedingSpace(
                root,
                space,
                firstLeaf
            );
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

        if (localized) {
            // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't one of the selected tags.
            // Also hide any name separators if the first visible name has one.
            for (const tag of node.nodes(
                (n) => n instanceof Docs || n instanceof Names
            ) as (Docs | Names)[]) {
                // Get all the names or docs
                const nameOrDocs = tag instanceof Docs ? tag.docs : tag.names;
                // If at least one is visible, hide all those not in a preferred language.
                if (
                    $creator
                        .getLanguages()
                        .some((lang) =>
                            nameOrDocs.some((l) => l.getLanguage() === lang)
                        )
                ) {
                    let first = false;
                    for (const nameOrDoc of nameOrDocs) {
                        const caretIn = $caret?.isIn(nameOrDoc, true);
                        const selectedLocale = $creator
                            .getLanguages()
                            .some((t) => t === nameOrDoc.getLanguage());
                        // Not a selected language and not in the node? Hide it.
                        if (!selectedLocale && !caretIn)
                            newHidden.add(nameOrDoc);
                        // Is the selected language and inert? Hide the language tag.
                        else if (selectedLocale && nameOrDoc.lang && !caretIn)
                            newHidden.add(nameOrDoc.lang);
                        // Not first? Hide the separator.
                        if (!first) {
                            first = true;
                            if (
                                nameOrDoc instanceof Name &&
                                nameOrDoc.separator
                            )
                                newHidden.add(nameOrDoc.separator);
                        }
                    }
                }
                // Otherwise, hide all but the first.
                else {
                    for (const nameOrDoc of nameOrDocs.slice(1))
                        newHidden.add(nameOrDoc);
                }

                // If this is a doc and we're not in a program, hide it.
                if (tag instanceof Docs && !(root.root instanceof Program))
                    newHidden.add(tag);
            }
        }

        // Update hidden nodes.
        hidden.set(newHidden);
    }
</script>

<span class="root" class:inert class:inline><NodeView {node} /></span>

<style>
    .root {
        display: block;
        font-family: var(--wordplay-code-font);
        font-weight: 400;
    }

    .inline {
        display: inline;
    }
</style>
