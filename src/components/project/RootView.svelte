<script lang="ts">
    import NodeView from '@components/editor/nodes/NodeView.svelte';
    import type Caret from '@edit/caret/Caret';
    import type Locale from '@locale/Locale';
    import Docs from '@nodes/Docs';
    import type { LanguageTagged } from '@nodes/LanguageTagged';
    import Name from '@nodes/Name';
    import Names from '@nodes/Names';
    import type Node from '@nodes/Node';
    import Root from '@nodes/Root';
    import Source from '@nodes/Source';
    import getPreferredSpaces from '@parser/getPreferredSpaces';
    import Spaces from '@parser/Spaces';
    import { EMOJI_SYMBOL } from '@parser/Symbols';
    import { SvelteSet } from 'svelte/reactivity';
    import { writable } from 'svelte/store';
    import FormattedLiteral from '@nodes/FormattedLiteral';
    import TextLiteral from '@nodes/TextLiteral';
    import {
        setCaret,
        setHidden,
        setLocalize,
        setRoot,
        setShowLines,
        setSpaces,
    } from '@components/project/Contexts';

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
        /** The current caret, if there is one. */
        caret?: Caret | undefined;
        /** Whether this view is editable. Affects appearance. */
        editable?: boolean;
        /** Show inline stepping values even when not editable (e.g. read-only
         *  code examples in docs). */
        values?: boolean;
        /** Whether to show line numbers */
        lines?: boolean;
        /** Whether any particular nodes should be rendered as removed */
        removed?: Node[];
        /** Nodes that should render as "…" instead of their full subtree. */
        elided?: Node[];
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
        editable = false,
        values = false,
        lines = false,
        removed = [],
        elided = [],
    }: Props = $props();

    /** Get the root, or make one if it's not a source. */
    let root = $derived(node instanceof Source ? node.root : new Root(node));

    // Expose the root in a store context for quick access to it.
    let rootContext = $state<{
        root: Root | undefined;
        removed: SvelteSet<Node>;
        elided: SvelteSet<Node>;
    }>({
        root: undefined,
        removed: new SvelteSet<Node>(),
        elided: new SvelteSet<Node>(),
    });
    setRoot(rootContext);

    $effect(() => {
        rootContext.root = root;
        rootContext.removed.clear();
        for (const node of removed) rootContext.removed.add(node);
        rootContext.elided.clear();
        for (const node of elided) rootContext.elided.add(node);
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

    // Cache the language-tagged-nodes list per AST root. The hidden-locales
    // effect below needs this list to decide which Names/Docs/TextLiteral/
    // FormattedLiteral nodes to hide; without this cache it would call
    // node.nodes(...) every time the effect runs (every caret move while
    // typing in a localized region), which is an O(N) tree walk. Node trees
    // are immutable, so the filter is stable per `node`; the WeakMap
    // auto-evicts when the AST is replaced.
    type TaggedNode = Names | Docs | TextLiteral | FormattedLiteral;
    const taggedCache = new WeakMap<Node, TaggedNode[]>();
    function getTaggedNodes(n: Node): TaggedNode[] {
        let list = taggedCache.get(n);
        if (list === undefined) {
            list = n.nodes(
                (m): m is TaggedNode =>
                    m instanceof Names ||
                    m instanceof Docs ||
                    m instanceof TextLiteral ||
                    m instanceof FormattedLiteral,
            );
            taggedCache.set(n, list);
        }
        return list;
    }

    // Cache key for the hidden-nodes effect. The effect's only caret-derived
    // input is "which tagged node contains the caret"; most caret moves stay
    // within the same tagged node (or none at all), so the answer is the
    // same as last time. When the key matches, we skip rebuilding the hidden
    // Set — which would otherwise run an O(tagged) caret.isIn() pass and
    // fire hidden.set() to every NodeView subscriber.
    let prevHiddenKey:
        | {
              node: Node;
              localize: Locale | null;
              elide: boolean;
              inline: boolean;
              taggedAtCaret: TaggedNode | undefined;
          }
        | undefined;

    // Update what's hidden when locales or localized changes.
    $effect(() => {
        // Compute the (only) caret-derived input we care about: which tagged
        // node contains the caret, if any. Stable across in-token caret moves.
        const taggedList = getTaggedNodes(node);
        const taggedAtCaret =
            caret === undefined
                ? undefined
                : taggedList.find((t) => caret.isIn(t, true));

        if (
            prevHiddenKey !== undefined &&
            prevHiddenKey.node === node &&
            prevHiddenKey.localize === $localize &&
            prevHiddenKey.elide === elide &&
            prevHiddenKey.inline === inline &&
            prevHiddenKey.taggedAtCaret === taggedAtCaret
        )
            return;

        prevHiddenKey = {
            node,
            localize: $localize,
            elide,
            inline,
            taggedAtCaret,
        };

        const newHidden = new Set<Node>();

        // If the locale is not null, hide non-preferred locales
        if ($localize !== null) {
            // Hide any language tagged nodes that 1) the caret isn't in, and 2) either have no language tag or aren't the selected locale.
            // Also hide any separators if the first visible name has one.
            for (const tagged of taggedList) {
                // Get the language tags on the nodes.
                const tags = tagged.getTagged();

                // Is this caret inside this node?
                const inside =
                    caret === undefined ? false : caret.isIn(tagged, true);

                // If the caret is not inside the node, decide whether to hide.
                if (!inside) {
                    // Keep track of visible
                    let visible: LanguageTagged[] = [];
                    // A tag matches the user's preferred language if ANY of its
                    // languages does — `/en_es` belongs to both the `en` bucket
                    // and the `es` bucket.
                    const hasMatchingLanguage = tags.some((l) =>
                        l.getLanguages().includes($localize.language),
                    );
                    const hasUntagged = tags.some(
                        (l) => l.getLanguages().length === 0,
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
                            const languages = nameDocOrText.getLanguages();
                            const isSelected =
                                languages.includes($localize.language) ||
                                (languages.length === 0 &&
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
                                // Hide the tag for monolingual matches only —
                                // multilingual tags (e.g. /es_en) stay visible
                                // because the multilingualism itself is
                                // information the reader needs.
                                if (
                                    nameDocOrText.language &&
                                    !nameDocOrText.language.isMultilingual()
                                )
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
                    // If there's only one visible, hide its language, as its
                    // redundant — but keep multilingual tags visible.
                    if (
                        visible.length === 1 &&
                        visible[0].language &&
                        !visible[0].language.isMultilingual()
                    )
                        newHidden.add(visible[0].language);
                }
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
        class="root inline"
        style="--line-count: {lineDigits}"
        class:inert
        class:elide
        ><NodeView
            {node}
            format={{ block: blocks, spaces, root, editable, values }}
        /></span
    >
{:else}
    <code
        class="root"
        style="--line-count: {lineDigits}"
        class:inert
        class:elide
        ><NodeView
            {node}
            format={{ block: blocks, spaces, root, editable, values }}
        /></code
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

    /* In blocks mode the outermost node-view is `.block` (display: flex), a
       block-level box that can't sit on a paragraph's text line. When the root is
       inline (an example embedded in prose), make it inline-level so the short
       block flows with the surrounding text. Nested blocks are flex items, where
       inline-flex and flex are equivalent, so only the outer box's flow changes. */
    .root.inline :global(.node-view.block) {
        display: inline-flex;
    }

    .elide {
        display: inline-block;
        white-space: nowrap;
        vertical-align: text-top;
    }
</style>
