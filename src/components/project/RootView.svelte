<svelte:options immutable={true} />

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
        HiddenSymbol,
        RootSymbol,
        SpaceSymbol,
        type SpaceContext,
        CaretSymbol,
        LocalizeSymbol,
    } from './Contexts';
    import Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import Name from '@nodes/Name';
    import Program from '@nodes/Program';
    import { locales } from '../../db/Database';
    import TextLiteral from '../../nodes/TextLiteral';
    import FormattedLiteral from '../../nodes/FormattedLiteral';
    import type Caret from '@edit/Caret';

    export let node: Node;
    /** Optional space; if not provided, all nodes are rendered with preferred space. */
    export let spaces: Spaces | undefined = undefined;
    export let inert = false;
    export let inline = false;
    /** If inline, and true, this will be a maximum width */
    export let elide = false;
    /** If true, hides names and docs not in a selected locale */
    export let localized = false;
    export let caret: Caret | undefined = undefined;

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

    // A set of hidden nodes, such as hidden translations.
    let hidden = writable<Set<Node>>(new Set());
    setContext(HiddenSymbol, hidden);

    let localize = writable<boolean>(localized);
    setContext(LocalizeSymbol, localize);
    $: localize.set(localized);

    // Update what's hidden.
    $: {
        const newHidden = new Set<Node>();

        if ($localize) {
            // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't one of the selected tags.
            // Also hide any name separators if the first visible name has one.
            for (const tagged of node
                .nodes()
                .filter(
                    (n): n is Names | Docs | TextLiteral | FormattedLiteral =>
                        n instanceof Names ||
                        n instanceof Docs ||
                        n instanceof TextLiteral ||
                        n instanceof FormattedLiteral
                )) {
                // Get the language tags on the nodes.
                const tags = tagged.getTags();

                // Is this caret inside this node?
                const inside =
                    caret === undefined ? false : caret.isIn(tagged, true);

                // If the caret is not inside the node, decide whether to hide.
                if (!inside) {
                    // If at least one is visible, hide all those not in a preferred language.
                    if (
                        $locales
                            .getLanguages()
                            .some((lang) =>
                                tags.some((l) => l.getLanguage() === lang)
                            )
                    ) {
                        let first = false;
                        for (const nameOrDoc of tags) {
                            const selectedLocale = $locales
                                .getLanguages()
                                .some((t) => t === nameOrDoc.getLanguage());
                            // Not a selected language and not in the node and has a language? Hide it.
                            if (!selectedLocale && nameOrDoc.language)
                                newHidden.add(nameOrDoc);
                            // Is the selected language and inert? Hide the language tag.
                            else if (selectedLocale && nameOrDoc.language)
                                newHidden.add(nameOrDoc.language);
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
                    // Otherwise, hide all but the first name
                    else {
                        for (const nameOrDoc of tags.slice(1))
                            newHidden.add(nameOrDoc);
                    }
                }

                // If this is a doc and we're not in a program, hide it unconditionally.
                if (tagged instanceof Docs && !(root.root instanceof Program))
                    newHidden.add(tagged);
            }
        }

        // If elided, hide all the tokens after the first five that aren't already hidden by parents
        if (elide)
            for (const token of node
                .leaves()
                .filter(
                    (token) =>
                        !Array.from(newHidden).some((n) => n.contains(token))
                )
                .slice(5))
                newHidden.add(token);

        // Update hidden nodes.
        hidden.set(newHidden);
    }
</script>

{#if inline}
    <span class="root" class:inert class:elide><NodeView {node} /></span>
{:else}
    <code class="root" class:inert><NodeView {node} /></code>
{/if}

<style>
    .root {
        font-family: var(--wordplay-code-font);
        font-weight: 400;

        /** This allows us to style things up the the tree. */
        text-decoration: inherit;
    }

    :global(.dragging) .root {
        cursor: grabbing;
    }

    .elide {
        display: inline-block;
        white-space: nowrap;
        vertical-align: text-top;
    }
</style>
