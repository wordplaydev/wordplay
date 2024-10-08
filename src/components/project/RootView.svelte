<svelte:options immutable={true} />

<script lang="ts">
    import { setContext } from 'svelte';
    import { writable } from 'svelte/store';
    import Docs from '@nodes/Docs';
    import Names from '@nodes/Names';
    import type Node from '@nodes/Node';
    import Spaces from '@parser/Spaces';
    import NodeView from '@components/editor/NodeView.svelte';
    import {
        HiddenSymbol,
        RootSymbol,
        SpaceSymbol,
        type SpaceContext,
        CaretSymbol,
        LocalizeSymbol,
        ShowLinesSymbol,
        BlocksSymbol,
    } from './Contexts';
    import Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import Program from '@nodes/Program';
    import { locales } from '../../db/Database';
    import TextLiteral from '../../nodes/TextLiteral';
    import FormattedLiteral from '../../nodes/FormattedLiteral';
    import type Caret from '@edit/Caret';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import type { LocalizedValue } from '@db/LocalizedSetting';

    export let node: Node;
    /** Optional space. To enable preferred space, set flag below. */
    export let spaces: Spaces | undefined = undefined;
    /** Whether to render as blocks */
    export let blocks: boolean;
    /** Whether to be read only */
    export let inert = false;
    /** Whether to render inline */
    export let inline = false;
    /** If inline, and true, this will be a maximum width */
    export let elide = false;
    /** If true, hides names and docs not in a selected locale */
    export let localized: LocalizedValue = 'symbolic';
    export let caret: Caret | undefined = undefined;
    /** Whether to show line numbers */
    export let lines: boolean = false;

    /** Get the root, or make one if it's not a source. */
    $: root = node instanceof Source ? node.root : new Root(node);

    // Expose the root in a store context for quick access to it.
    let rootStore = writable(root);
    $: rootStore.set(root);
    setContext(RootSymbol, rootStore);

    // When the spaces change, update the rendered spaces
    let renderedSpace: SpaceContext = writable(
        spaces ?? getPreferredSpaces(node),
    );
    setContext(SpaceSymbol, renderedSpace);
    $: renderedSpace.set(spaces ?? getPreferredSpaces(node));

    $: if (inert) setContext(CaretSymbol, undefined);

    // A set of hidden nodes, such as hidden translations.
    let hidden = writable<Set<Node>>(new Set());
    setContext(HiddenSymbol, hidden);

    let localize = writable<LocalizedValue>(localized ?? 'symbolic');
    setContext(LocalizeSymbol, localize);
    $: localize.set(localized ?? 'symbolic');

    let showLines = writable<boolean>(lines);
    setContext(ShowLinesSymbol, showLines);
    $: showLines.set(lines);

    let isBlocks = writable<boolean>(blocks);
    setContext(BlocksSymbol, isBlocks);
    $: isBlocks.set(blocks);

    // Update what's hidden when locales or localized changes.
    $: {
        $locales;
        const newHidden = new Set<Node>();

        if ($localize !== 'actual') {
            // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't one of the selected tags.
            // Also hide any name separators if the first visible name has one.
            for (const tagged of node
                .nodes()
                .filter(
                    (n): n is Names | Docs | TextLiteral | FormattedLiteral =>
                        n instanceof Names ||
                        n instanceof Docs ||
                        n instanceof TextLiteral ||
                        n instanceof FormattedLiteral,
                )) {
                // Get the language tags on the nodes.
                const tags = tagged.getTagged();

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
                                tags.some((l) => l.getLanguage() === lang),
                            )
                    ) {
                        // Keep track of if there's a node that's visible so we know when to hide separators.
                        let priorVisible = false;
                        // Go through each language tagged node to see if we should hide it.
                        for (const nameDocOrText of tags) {
                            const language = nameDocOrText.getLanguage();
                            const selectedLocale =
                                language !== undefined &&
                                $locales.hasLanguage(language);
                            // Not a selected locale? Hide the whole name or doc.
                            if (!selectedLocale) {
                                newHidden.add(nameDocOrText);
                            }
                            // Is the selected language? Hide just the locale tag and any preceding separator.
                            else {
                                if (nameDocOrText.language)
                                    newHidden.add(nameDocOrText.language);
                                // Hide the separator, if there is one.
                                if (!priorVisible && nameDocOrText.separator)
                                    newHidden.add(nameDocOrText.separator);
                                priorVisible = true;
                            }
                        }
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
                        !Array.from(newHidden).some((n) => n.contains(token)),
                )
                .slice(5))
                newHidden.add(token);

        // Update hidden nodes.
        hidden.set(newHidden);
    }

    $: lineDigits = spaces?.getLastLineNumber().toString().length ?? 3;
</script>

{#if inline}
    <span
        class="root"
        style="--line-count: {lineDigits}"
        class:inert
        class:elide><NodeView {node} /></span
    >
{:else}
    <code
        class="root"
        style="--line-count: {lineDigits}"
        class:inert
        class:elide><NodeView {node} direction="column" /></code
    >
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
