<script lang="ts">
    import NodeView from '@components/editor/NodeView.svelte';
    import type Caret from '@edit/Caret';
    import type Locale from '@locale/Locale';
    import Docs from '@nodes/Docs';
    import type { LanguageTagged } from '@nodes/LanguageTagged';
    import Name from '@nodes/Name';
    import Names from '@nodes/Names';
    import type Node from '@nodes/Node';
    import Program from '@nodes/Program';
    import Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import Spaces from '@parser/Spaces';
    import { EMOJI_SYMBOL } from '@parser/Symbols';
    import { writable } from 'svelte/store';
    import FormattedLiteral from '../../nodes/FormattedLiteral';
    import TextLiteral from '../../nodes/TextLiteral';
    import {
        setCaret,
        setHidden,
        setIsBlocks,
        setLocalize,
        setRoot,
        setShowLines,
        setSpaces,
    } from './Contexts';

    interface Props {
        node: Node;
        /** Optional space. To enable preferred space, set flag below. */
        spaces?: Spaces | undefined;
        /** Whether to render as blocks */
        blocks: boolean;
        /** Whether to be read only */
        inert?: boolean;
        /** Whether to render inline */
        inline?: boolean;
        /** If inline, and true, this will be a maximum width */
        elide?: boolean;
        /** If true, hides names and docs not in a selected locale */
        locale?: Locale | null | 'symbolic';
        caret?: Caret | undefined;
        /** Whether to show line numbers */
        lines?: boolean;
    }

    let {
        node,
        spaces = undefined,
        blocks,
        inert = false,
        inline = false,
        elide = false,
        locale = null,
        caret = undefined,
        lines = false,
    }: Props = $props();

    /** Get the root, or make one if it's not a source. */
    let root = $derived(node instanceof Source ? node.root : new Root(node));

    // Expose the root in a store context for quick access to it.
    let rootContext = $state<{ root: Root | undefined }>({ root: undefined });
    setRoot(rootContext);

    $effect(() => {
        rootContext.root = root;
    });

    // When the spaces change, update the rendered spaces
    // svelte-ignore state_referenced_locally
    let renderedSpace = writable(spaces ?? getPreferredSpaces(node));
    setSpaces(renderedSpace);

    $effect(() => {
        renderedSpace.set(spaces ?? getPreferredSpaces(node));
    });

    $effect(() => {
        if (inert) setCaret(undefined);
    });

    // A set of hidden nodes, such as hidden translations.
    let hidden = writable<Set<Node>>(new Set());
    setHidden(hidden);

    function possiblySymbolicToLocale(
        localized: Locale | null | 'symbolic',
    ): Locale | null {
        return localized === 'symbolic'
            ? { language: EMOJI_SYMBOL, regions: [] }
            : localized;
    }

    // svelte-ignore state_referenced_locally
    let localize = writable<Locale | null>(possiblySymbolicToLocale(locale));
    setLocalize(localize);
    $effect(() => {
        localize.set(possiblySymbolicToLocale(locale));
    });

    // svelte-ignore state_referenced_locally
    let showLines = writable<boolean>(lines);
    setShowLines(showLines);
    $effect(() => {
        showLines.set(lines);
    });

    // svelte-ignore state_referenced_locally
    let isBlocks = writable<boolean>(blocks);
    setIsBlocks(isBlocks);
    $effect(() => {
        isBlocks.set(blocks);
    });

    // Update what's hidden when locales or localized changes.
    $effect(() => {
        const newHidden = new Set<Node>();

        // If the locale is not null, hide non-preferred locales
        if ($localize !== null) {
            // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't the selected locale.
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
                    // Keep track of visible
                    let visible: LanguageTagged[] = [];
                    const hasMatchingLanguage = tags.some(
                        (l) => l.getLanguage() === $localize.language,
                    );
                    const hasUntagged = tags.some(
                        (l) => l.getLanguage() === undefined,
                    );
                    const hasSymbolic =
                        $localize.language === EMOJI_SYMBOL &&
                        tagged instanceof Names &&
                        tagged.names.some((l) => l.isSymbolic());
                    // If one of the tags is the preferred locale, or none are and one has no language, hide all those that are not preferred or tagged.
                    if (
                        // One of the languages matches?
                        hasMatchingLanguage ||
                        // One of the elements is untagged
                        hasUntagged ||
                        // One of the elements is a symbolic name and we want symbolic?
                        hasSymbolic
                    ) {
                        // Keep track of if there's a node that's visible so we know when to hide separators.
                        let priorVisible = false;
                        // Go through each language tagged node to see if we should hide it.
                        for (const nameDocOrText of tags) {
                            const language = nameDocOrText.getLanguage();
                            const isSelected =
                                $localize.language === language ||
                                (language === undefined &&
                                    !hasMatchingLanguage) ||
                                ($localize.language === EMOJI_SYMBOL &&
                                    nameDocOrText instanceof Name &&
                                    nameDocOrText.isSymbolic());
                            // Not a selected locale? Hide the whole name or doc.
                            if (!isSelected) {
                                newHidden.add(nameDocOrText);
                            }
                            // Is the selected language? Hide just the locale tag and any preceding separator.
                            else {
                                visible.push(nameDocOrText);
                                if (nameDocOrText.language)
                                    newHidden.add(nameDocOrText.language);
                                // Hide the separator, if there is one.
                                if (!priorVisible && nameDocOrText.separator)
                                    newHidden.add(nameDocOrText.separator);
                                priorVisible = true;
                            }
                        }
                    }
                    // Not hiding? Add them all as visible.
                    else {
                        for (const tag of tags) visible.push(tag);
                    }
                    // If there's only one visible, hide its language, as its redundant.
                    if (visible.length === 1 && visible[0].language)
                        newHidden.add(visible[0].language);
                }

                // If this is a doc and we're not in a program, hide it unconditionally.
                if (tagged instanceof Docs && !(root.root instanceof Program))
                    newHidden.add(tagged);
            }
        }

        // If elided, hide all the tokens after the first five that aren't already hidden by parents
        if (elide && inline)
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
    });

    let lineDigits = $derived(
        spaces?.getLastLineNumber().toString().length ?? 3,
    );
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
