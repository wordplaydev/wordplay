<script lang="ts">
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import type { Format } from '@components/editor/nodes/NodeView.svelte';
    import BooleanTokenEditor from '@components/editor/tokens/BooleanTokenEditor.svelte';
    import TextOrPlaceholder from '@components/editor/tokens/TextOrPlaceholder.svelte';
    import TokenCategories from '@components/editor/tokens/TokenCategories';
    import {
        getCaret,
        getHidden,
        getLocalize,
        getProject,
        getRoot,
    } from '@components/project/Contexts';
    import { locales, words } from '@db/Database';
    import { getOperatorKeyword, getRenderableKeyword } from '@parser/Keywords';
    import { getCanonicalGlyph } from '@parser/canonicalizeKeywords';
    import Caret from '@edit/caret/Caret';
    import BooleanType from '@nodes/BooleanType';
    import Convert from '@nodes/Convert';
    import Dimension from '@nodes/Dimension';
    import Evaluate from '@nodes/Evaluate';
    import Input from '@nodes/Input';
    import Language from '@nodes/Language';
    import Reference from '@nodes/Reference';
    import Source from '@nodes/Source';
    import { Sym } from '@nodes/Sym';
    import Token from '@nodes/Token';
    import Unit from '@nodes/Unit';
    import { withColorEmoji } from '@unicode/emoji';

    interface TokenProps {
        node: Token;
        format: Format;
    }

    let { node, format }: TokenProps = $props();

    let caret = getCaret();
    let project = getProject();

    const rootContext = getRoot();
    let root = $derived(rootContext?.root);

    let localize = getLocalize();
    let hidden = getHidden();

    let hide = $derived(node ? $hidden?.has(node) : false);
    let editable = $derived($caret !== undefined && format.editable);

    let context = $derived(
        root === undefined
            ? undefined
            : $project !== undefined
              ? $project.getNodeContext(root.root)
              : undefined,
    );

    // See if this is a placeholder that should be rendered differently.
    let placeholder = $derived(
        $project && root && context
            ? node.getPlaceholder(root, context, $locales)
            : undefined,
    );

    let isInCaret = $derived(
        $caret !== undefined &&
            node.getTextLength() > 0 &&
            ($caret.getTokenExcludingSpace() === node ||
                ($caret.tokenPrior === node &&
                    $caret.atBeginningOfTokenSpace())),
    );

    // True if the caret is "on" this token.
    let active = $derived(
        $caret &&
            node.getTextLength() > 0 &&
            ($caret.getTokenExcludingSpace() === node ||
                ($caret.tokenPrior === node &&
                    $caret.atBeginningOfTokenSpace() &&
                    $caret.tokenIncludingSpace &&
                    $caret.tokenAtHasPrecedingSpace())),
    );

    // True if this is the recently added token.
    let added = $derived($caret?.addition?.contains(node) ?? false);

    // Structural bracket pairs that should "pop" in blocks mode. Excludes
    // separators, language tags, and markup tags — they share the delimiter
    // category but aren't structural brackets.
    let isBracket = $derived(
        node.isSymbol(Sym.EvalOpen) ||
            node.isSymbol(Sym.EvalClose) ||
            node.isSymbol(Sym.SetOpen) ||
            node.isSymbol(Sym.SetClose) ||
            node.isSymbol(Sym.ListOpen) ||
            node.isSymbol(Sym.ListClose) ||
            node.isSymbol(Sym.TableOpen) ||
            node.isSymbol(Sym.TableClose) ||
            node.isSymbol(Sym.TypeOpen) ||
            node.isSymbol(Sym.TypeClose),
    );

    // Nesting depth of this bracket (matching pairs share a depth, counted per
    // delimiter type), cycled across 4 palette colors so nesting is
    // distinguishable. Reuses `context` (already derived above for
    // placeholders/localization) to get the Source, so this adds no extra
    // getSourceOf work; the depth map itself is memoized on the Source and
    // built at most once per edit.
    let bracketDepth = $derived.by(() => {
        if (!isBracket) return undefined;
        const source =
            context?.source ??
            (root?.root instanceof Source ? root.root : undefined);
        return source?.getDelimiterDepths().get(node);
    });
    let bracketDepthClass = $derived(
        bracketDepth === undefined ? '' : `bracket-depth-${bracketDepth % 6}`,
    );

    // In words mode, render a built-in keyword token as its localized word (render-only; the stored
    // source stays the canonical symbol). Skipped while the caret is in the token so editing shows
    // the literal source, and when the locale has no word (falls back to the symbol). See LANGUAGE.md.
    let keywordWord = $derived.by(() => {
        if (!$words || isInCaret) return undefined;
        // Construct keywords resolve by their (unambiguous) Sym type and glyph.
        let id = getRenderableKeyword(node);
        // The `?` glyph is dual-typed (BooleanType + Conditional). Pick the word by the token's role:
        // a `?` under a BooleanType parent is the type ("truth"); otherwise it's the conditional ("then").
        if (
            root &&
            node.isSymbol(Sym.BooleanType) &&
            node.isSymbol(Sym.Conditional)
        )
            id =
                root.getParent(node) instanceof BooleanType
                    ? 'booleantype'
                    : 'conditional';
        // Operators (& | ~) share Sym types with type unions and markup, so only word them when
        // used as an operator — i.e. the token is the name of a Reference inside a Binary/UnaryEvaluate.
        if (
            id === undefined &&
            root &&
            node.isSymbol(Sym.Operator) &&
            root.getParent(node) instanceof Reference
        )
            id = getOperatorKeyword(node.getText());
        if (id === undefined) return undefined;
        const word = $locales.getUnannotatedText((l) => l.keyword[id]);
        return word.length > 0 ? word : undefined;
    });

    // In symbols mode, render a word-TYPED keyword construct as its canonical glyph (the mirror of
    // keywordWord), so the two display modes are interchangeable regardless of how the source was
    // typed. Role-aware (a shadow-name like `número` keeps its word). No-op for glyph-typed tokens
    // (the glyph isn't a keyword word) and when no keyword index is active.
    let keywordGlyph = $derived.by(() => {
        if ($words || isInCaret || root === undefined) return undefined;
        const index = $project?.getKeywordIndex();
        return index === undefined
            ? undefined
            : getCanonicalGlyph(node, root, index);
    });

    // If requesed, localize the token's text.
    // Don't localize the name if the caret is in the name.
    let text = $derived(
        keywordWord ??
            keywordGlyph ??
            (context && root && localize && $localize
                ? node.localized(
                      isInCaret,
                      node.isSymbol(Sym.Operator),
                      $localize,
                      root,
                      context,
                  )
                : node.getText()),
    );

    // Prepare the text for rendering by replacing spaces with non-breaking spaces
    // and adding variation selectors after emoji to guarantee the correct emoji font is chosen.
    let renderedText = $derived(
        node.isSymbol(Sym.Name) ||
            node.isSymbol(Sym.Text) ||
            node.isSymbol(Sym.Words)
            ? withColorEmoji(text.replaceAll(' ', '\xa0'))
            : text.replaceAll(' ', '\xa0'),
    );
</script>

{#if format.block && root}
    {@const parent = root.getParent(node)}
    {@const grandparent = parent ? root.getParent(parent) : undefined}
    <div
        class="token-view blocks token-category-{TokenCategories.get(
            Array.isArray(node.types)
                ? (node.types[0] ?? 'default')
                : node.types,
        )} {format.definition?.getDescriptor() || ''} {bracketDepthClass}"
        class:hide
        class:active
        class:editable
        class:placeholder={placeholder !== undefined}
        class:blockText={format.editable &&
            Caret.isTokenTextBlockEditable(node, parent)}
        class:added
        class:bracket={isBracket}
        data-id={node.id}
    >
        {#if editable && $project && node.isSymbol(Sym.Boolean)}<BooleanTokenEditor
                {node}
                project={$project}
            />{:else}<TextOrPlaceholder
                {placeholder}
                {text}
                rendered={renderedText}
                {format}
            />{/if}
    </div>{#if format.editable && parent instanceof Reference && !(grandparent instanceof Evaluate && grandparent.fun === parent)}<MenuTrigger
            anchor={parent}

        ></MenuTrigger>{:else if format.editable && parent instanceof Input && parent.name === node}<MenuTrigger
            anchor={node}

        ></MenuTrigger>{:else if format.editable && parent instanceof Language && parent.slash === node}<MenuTrigger
            anchor={node}

        ></MenuTrigger>{:else if format.editable && parent instanceof Dimension && parent.name === node}<MenuTrigger
            anchor={node}

        ></MenuTrigger>{:else if format.editable && parent instanceof Unit && parent.slash === node}<MenuTrigger
            anchor={node}

        ></MenuTrigger>{:else if format.editable && parent instanceof Convert && parent.convert === node}<MenuTrigger
            anchor={node}
        ></MenuTrigger>{/if}
{:else}
    <span
        class="token-view text token-category-{TokenCategories.get(
            Array.isArray(node.types)
                ? (node.types[0] ?? 'default')
                : node.types,
        )} {bracketDepthClass}"
        class:hide
        class:active
        class:editable
        class:placeholder={placeholder !== undefined}
        class:added
        class:bracket={isBracket}
        class:synthesized={keywordWord !== undefined}
        data-id={node.id}
        role="presentation"
    >
        <TextOrPlaceholder
            {placeholder}
            {text}
            rendered={renderedText}
            {format}
        />
    </span>
{/if}

<style>
    .token-view {
        display: inline-block;
        position: relative;
        font-family: var(--wordplay-code-font);

        /** This allows us to style things up the the tree. */
        text-decoration: inherit;
    }

    /* In words mode, a built-in keyword rendered as a word (text mode) is shown as a subtle chip.
       The chip discloses that the word is a synthesized rendering — the stored source is the symbol —
       and, because symbols carry no required surrounding space, it also keeps adjacent words from
       running together (e.g. count•# would otherwise read as "counttypenumber"). Horizontal padding
       plus a thin margin give each word a visible boundary without injecting whitespace into the
       text flow; the small margin avoids doubling space when a skinned keyword already had one.
       Blocks mode is excluded — it already separates tokens with a flex gap. */
    .token-view.text.synthesized {
        background: var(--wordplay-alternating-color);
        border-radius: var(--wordplay-border-radius);
        padding: 0 0.2em;
        margin: 0 0.05em;
    }

    .hide {
        width: 0;
        height: 0;
        overflow: hidden;
    }

    .token-view.added {
        animation: ybounce;
        animation-duration: calc(var(--animation-factor) * 500ms);
        animation-delay: 100ms;
    }

    :global(.hide) .token-view {
        width: 0;
        height: 0;
    }

    .token-view.editable {
        cursor: text;
    }

    .token-view.editable.blocks {
        cursor: grab;
        display: flex;
        flex-direction: row;
        gap: var(--wordplay-spacing-half);
    }

    :global(.dragging) .token-view.editable {
        cursor: grabbing;
    }

    /* Give all tokens in side a .Doc the doc color except those inside an .Example */
    :global(.Doc) .token-view {
        color: var(--wordplay-doc-color);
    }

    /* Language tags are a kind of type annotation — color all their tokens
       (slash, language code, dash, region) with the type color for parity. */
    :global(.Language) .token-view {
        color: var(--wordplay-type-color);
    }

    .token-category-docs {
        font-size: small;
        color: var(--wordplay-doc-color);
    }

    .token-category-delimiter,
    :global(.Example) .token-category-delimiter {
        color: var(--color-dark-grey);
    }

    /* Structural brackets get a fixed size bump in blocks mode so group
       boundaries are obvious. Fixed (not em) so deep nesting doesn't compound
       to ever-larger brackets. Weight, style, and tone come from the depth
       classes below. */
    .token-view.blocks.bracket {
        font-size: calc(var(--wordplay-font-size) * 1.2);
    }

    /* Nesting depth is conveyed by cycling four palette colors (counted per
       delimiter type), so a delimiter's color tells you its nesting level.
       Applies in text and blocks mode. */
    .token-view.bracket.bracket-depth-0 {
        color: var(--color-black);
        transform: scale(1.3);
    }
    .token-view.bracket.bracket-depth-1 {
        color: var(--color-orange);
        transform: scale(1.15);
    }
    .token-view.bracket.bracket-depth-2 {
        color: var(--color-black);
        transform: scale(1);
    }
    .token-view.bracket.bracket-depth-3 {
        color: var(--color-orange);
        transform: scale(0.85);
    }
    .token-view.bracket.bracket-depth-4 {
        color: var(--color-black);
        transform: scale(0.6);
    }
    .token-view.bracket.bracket-depth-5 {
        color: var(--color-orange);
        transform: scale(0.45);
    }

    .token-category-relation,
    :global(.Example) .token-category-relation {
        color: var(--wordplay-relation-color);
    }
    .token-category-share,
    :global(.Example) .token-category-share {
        color: var(--color-orange);
    }
    .token-category-eval,
    :global(.Example) .token-category-eval {
        color: var(--color-blue);
    }

    .token-category-name,
    :global(.Example) .token-category-name {
        color: var(--wordplay-foreground);
    }

    .token-category-type,
    :global(.Example) .token-category-type {
        color: var(--wordplay-type-color);
    }
    .token-category-operator,
    :global(.Example) .token-category-operator {
        color: var(--wordplay-operator-color);
    }
    .token-category-unknown,
    :global(.Example) .token-category-unknown {
        color: var(--color-pink);
    }
    .token-category-placeholder,
    :global(.Example) .token-category-placeholder {
        color: var(--wordplay-inactive-color);
    }

    .token-category-literal,
    :global(.Example) .token-category-literal {
        color: var(--color-blue);
    }

    :global(.Token):has(.token-category-docs):first-child {
        margin-inline-end: var(--wordplay-spacing);
    }

    :global(.Token):has(.token-category-docs):last-child {
        margin-inline-start: var(--wordplay-spacing);
    }

    .token-view.newline {
        display: block;
    }

    /* Hovering an editable token uses the same subtle 1px border in both text and blocks mode, so it
       reads as "you can edit this text" — not as a drop target. (Previously the blocks-mode hover used a
       loud --wordplay-hover outline + lifted shadow that looked like a drag/drop highlight.) */
    .text.editable:hover,
    .active,
    .token-view.editable.blocks.blockText:hover {
        outline: 1px solid var(--wordplay-border-color);
    }

    .token-view.editable.blocks.blockText {
        border-bottom: solid var(--wordplay-focus-width)
            var(--wordplay-border-color);
    }

    .token-view.editable.blocks.blockText:hover {
        cursor: text;
    }

    .StructureDefinition,
    .StreamDefinition {
        font-style: italic;
    }

    .StreamDefinition {
        text-decoration: underline dotted;
    }
</style>
