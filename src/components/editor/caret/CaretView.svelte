<script module lang="ts">
    /** Where the caret sits, in the logical basis: a point along the text and a
     *  band across the lines. This is what every branch of computePlacement
     *  produces; `axes` turns it into the physical box below. */
    type CaretPlacement = {
        /** Where the caret sits along the text. */
        inline: number;
        /** Where its band across the lines begins. */
        block: number;
        /** How far that band reaches — one line's thickness. */
        extent: number;
        /** Where UI placed after the caret begins. Usually block + extent, but a
         *  node selection's hidden scroll spot deliberately collapses it. */
        blockEnd: number;
    };

    /** The caret's rendered box, in container-relative CSS pixels. `extent` is
     *  the bar's length across the lines — its height when writing horizontally
     *  and its width when writing vertically — which is why it is named for
     *  neither. */
    export type CaretBounds = {
        top: number;
        left: number;
        right: number;
        bottom: number;
        extent: number;
        /** True when the bar runs down the screen, i.e. text reads across it. */
        horizontal: boolean;
    };

    /** A blocks-mode visual-row member: a blank line (carrying the source index
     *  it represents) or a token (carrying its source text range so the caret's
     *  logical position can be matched to it). `landable` marks the tokens a
     *  caret may come to rest on; the rest are members anyway, so that every
     *  rendered row exists and the caret's own row can always be found. */
    type BlockMember =
        | { kind: 'break'; position: number }
        | {
              kind: 'token';
              token: Token;
              el: HTMLElement;
              start: number;
              end: number;
              landable: boolean;
          };

    /** Carve blocks-mode rendered content into visual rows. Members are every
     *  rendered token-view plus blank lines' `.break` divs (resolved to the
     *  empty-line index they represent) — every token, not only the landable
     *  ones, so that a row exists wherever content is drawn and the caret's own
     *  row can always be found. Inline whitespace isn't rendered in blocks mode,
     *  so there are no space members. Token-views use getClientRects() so a
     *  wrapped token contributes one member per fragment; excludes
     *  folded/zero-height. */
    function gatherBlockRows(
        editor: HTMLElement,
        caret: Caret,
        getTokenViews: () => HTMLElement[],
        axes: Axes,
    ): Row<BlockMember>[] {
        const members: RowMember<BlockMember>[] = [];
        for (const el of getTokenViews()) {
            if (el.closest('.hide') !== null) continue;
            const node = el.dataset.id
                ? caret.source.getNodeByID(parseInt(el.dataset.id))
                : undefined;
            if (!(node instanceof Token)) continue;
            const start = caret.source.getTokenTextPosition(node);
            const end = caret.source.getTokenLastPosition(node);
            if (start === undefined || end === undefined) continue;
            // Delimiters and the program's end token are kept as members even
            // though the caret can't rest on them. Excluding them left every
            // position they span — most visibly the end of a program that ends
            // in `)` — belonging to no row at all, so a move from there could
            // find no row to leave.
            const landable = Caret.isTokenBlockEditable(node);
            for (const rect of elementRowRects(el))
                if (isRendered(rect))
                    members.push({
                        data: {
                            kind: 'token',
                            token: node,
                            el,
                            start,
                            end,
                            landable,
                        },
                        rect: axes.rect(rect),
                    });
        }
        for (const el of editor.querySelectorAll('.break[data-node-id]')) {
            if (!(el instanceof HTMLElement) || el.closest('.hide') !== null)
                continue;
            const position = breakElementPosition(caret.source, el);
            if (position === undefined) continue;
            const rect = el.getBoundingClientRect();
            if (isRendered(rect))
                members.push({
                    data: { kind: 'break', position },
                    rect: axes.rect(rect),
                });
        }
        return buildRows(members);
    }

    /** How thick the caret bar is across the text — a CSS length, since it's a
     *  chrome measurement rather than a measured one. */
    const CaretThickness = '2px';

    /** The row the caret is currently on, plus its horizontal x there — derived
     *  from the caret's LOGICAL position against the gathered members, NOT the
     *  rendered bar. In blocks mode the bar is unreliable as a row anchor: it
     *  draws a full-height placement spot at the program start/end (whose center
     *  sits on a middle row) and a scroll-placement spot for node selections, so
     *  trusting it misreads the current row. Returns index -1 when the position
     *  matches no member (e.g. an unrendered spot), so the caller can bail. */
    /** A row narrowed to the members the caret may rest on, or the row unchanged
     *  when it has none — a row of pure delimiters is still somewhere to go, and
     *  resolveBlockMember turns one into a selection of its node. */
    function landableRow(row: Row<BlockMember>): Row<BlockMember> {
        const members = row.members.filter(
            (member) => member.data.kind === 'break' || member.data.landable,
        );
        return members.length === 0 ? row : { ...row, members };
    }

    function findCurrentBlockRow(
        rows: Row<BlockMember>[],
        position: number,
    ): { index: number; inline: number } {
        for (let index = 0; index < rows.length; index++) {
            for (const member of rows[index].members) {
                const data = member.data;
                const { inlineStart, inlineEnd } = member.rect;
                if (data.kind === 'break') {
                    if (data.position === position)
                        return { index, inline: inlineStart };
                } else if (position >= data.start && position <= data.end) {
                    const length = data.end - data.start;
                    const inline =
                        length <= 0
                            ? inlineStart
                            : inlineStart +
                              ((position - data.start) / length) *
                                  (inlineEnd - inlineStart);
                    return { index, inline };
                }
            }
        }
        return { index: -1, inline: 0 };
    }

    /** The node Caret.getBlockPositions would select for `node`: an only-child
     *  or placeholder token maps to its parent, any other node maps to itself.
     *  Shared by member resolution and sibling navigation so keyboard, arrow, and
     *  click selection all agree. */
    export function blockPositionForNode(node: Node, caret: Caret): Node {
        if (!(node instanceof Token)) return node;
        const parent = caret.source.root.getParent(node);
        return (parent !== undefined && parent.hasOneLeaf()) ||
            parent instanceof ExpressionPlaceholder
            ? (parent ?? node)
            : node;
    }

    /** Resolve a chosen blocks-mode row member to a caret position at horizontal
     *  `x`: a blank line to its beginning, a text-editable token to the precise
     *  interior position, and any other block-editable token to a node selection
     *  (mapping only-children and placeholders to their parent, exactly as
     *  Caret.getBlockPositions does, so keyboard and arrow navigation agree). */
    function resolveBlockMember(
        member: RowMember<BlockMember>,
        inline: number,
        caret: Caret,
        axes: Axes,
    ): Node | number | undefined {
        const data = member.data;
        if (data.kind === 'break') return data.position;
        const { token, el } = data;
        const parent = caret.source.root.getParent(token);
        if (Caret.isTokenTextBlockEditable(token, parent))
            return getTokenPosition(
                el,
                axes.client({
                    inline,
                    block: (member.rect.blockStart + member.rect.blockEnd) / 2,
                }),
                caret,
                axes,
            );
        return blockPositionForNode(token, caret);
    }

    /** Move the caret one visual row up (-1) or down (1) in blocks mode. Carves
     *  the editor into a stack of rows (block-editable tokens and blank lines),
     *  finds the row the caret is on, steps exactly one row, and lands at the
     *  horizontally nearest navigable position. Fails (no move) only at a
     *  document edge. */
    /**
     * Move the caret one rendered row up or down in blocks mode, or undefined
     * when the rendered rows can't say where to go — the caller falls back to
     * {@link Caret.moveLineVertical}, which needs no measurements.
     */
    export function moveVisualVertical(
        direction: -1 | 1,
        editor: HTMLElement,
        caret: Caret,
        getTokenViews: () => HTMLElement[],
        axes: Axes,
    ): Caret | undefined {
        const rows = gatherBlockRows(editor, caret, getTokenViews, axes);

        let target:
            { member: RowMember<BlockMember>; inline: number } | undefined;
        let goalInline: number;
        if (caret.position instanceof Node) {
            const el = getNodeView(editor, caret.position);
            // Structural first: if the selected node is a direct element of a
            // vertically-laid-out list, select the sibling above/below. That's
            // predictable list navigation, unlike a pixel-nearest geometric step.
            const sibling =
                el !== null ? verticalListSibling(el, direction) : undefined;
            if (sibling?.dataset.id !== undefined) {
                const node = caret.source.getNodeByID(
                    parseInt(sibling.dataset.id),
                );
                // No goal column: a structural list move has no pixel goal-x.
                if (node !== undefined)
                    return caret.withPosition(
                        blockPositionForNode(node, caret),
                        undefined,
                        undefined,
                    );
            }
            // Fallback: no sibling, or not a vertical list. A selected node has no
            // usable bar (CaretView draws a scroll-placement spot, not the node's
            // location), so anchor on the node's own box and step to the row just
            // past its full vertical extent.
            const raw = el?.getBoundingClientRect();
            if (raw === undefined || !isRendered(raw)) return undefined;
            const box = axes.rect(raw);
            goalInline =
                caret.visualColumn ?? (box.inlineStart + box.inlineEnd) / 2;
            // Row bounds are unchanged by the narrowing, so the span still
            // picks the same rows; only where it may land is restricted.
            target = targetRowPositionFromSpan(
                rows.map(landableRow),
                box.blockStart,
                box.blockEnd,
                direction,
                goalInline,
            );
        } else {
            // A numeric position: find the row from the caret's logical position
            // (the member whose range/blank-line index it sits in), then step.
            const position = Array.isArray(caret.position)
                ? caret.position[1]
                : caret.position;
            const current = findCurrentBlockRow(rows, position);
            if (current.index < 0) return undefined;
            goalInline = caret.visualColumn ?? current.inline;
            const next = current.index + direction;
            target =
                next < 0 || next >= rows.length
                    ? undefined
                    : nearestInRow(landableRow(rows[next]), goalInline);
        }
        if (target === undefined) return undefined;
        const result = resolveBlockMember(
            target.member,
            target.inline,
            caret,
            axes,
        );
        // Carry the goal column forward so consecutive vertical moves keep the
        // same column; any non-vertical caret operation clears it.
        return result === undefined
            ? undefined
            : caret.withPosition(result, undefined, goalInline);
    }

    export function getTokenView(
        editor: HTMLElement,
        token: Token,
    ): HTMLElement | null {
        return editor.querySelector(`.token-view[data-id="${token.id}"]`);
    }

    export function getNodeView(
        editor: HTMLElement,
        token: Node,
    ): HTMLElement | null {
        return editor.querySelector(`.node-view[data-id="${token.id}"]`);
    }

    /** In blocks mode, the previous (-1) or next (1) sibling element of `el`
     *  within a vertically-laid-out list, or undefined if `el` isn't a direct
     *  member of such a list or has no sibling that way. Pure DOM: the list's
     *  `data-direction='block'` is the authoritative vertical-layout signal (some
     *  node views choose their own direction), and its direct `.node-view`/
     *  `.token-view` children are the members, so `.break` blank lines and
     *  insertion/append decorations are skipped. */
    export function verticalListSibling(
        el: HTMLElement,
        direction: -1 | 1,
    ): HTMLElement | undefined {
        const list = el.parentElement;
        if (
            list === null ||
            !list.classList.contains('node-list') ||
            list.dataset.direction !== 'block'
        )
            return undefined;
        const members = Array.from(
            list.querySelectorAll<HTMLElement>(
                ':scope > .node-view[data-id], :scope > .token-view[data-id]',
            ),
        );
        const index = members.indexOf(el);
        if (index < 0) return undefined;
        return members[index + direction];
    }
</script>

<script lang="ts">
    import {
        buildRows,
        nearestInRow,
        targetRowPositionFromSpan,
        type Row,
        type RowMember,
    } from '@components/editor/caret/rowModel';
    import { measureTokenSegment } from '@components/editor/highlights/measureTokenSegment';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import {
        breakElementPosition,
        elementRowRects,
        getTokenPosition,
        isRendered,
    } from '@components/editor/pointer/PointerUtilities';
    import {
        editorAxes,
        type Axes,
        type LogicalRect,
    } from '@components/editor/util/axes';
    import type { WritingLayout } from '@locale/Scripts';
    import {
        getEditor,
        getEffectiveFolded,
        getEvaluation,
        getWindowing,
    } from '@components/project/Contexts';
    import { animationDuration, locales } from '@db/Database';
    import Caret from '@edit/caret/Caret';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Node from '@nodes/Node';
    import Token from '@nodes/Token';
    import { TAB_TEXT } from '@parser/Spaces';
    import UnicodeString from '@unicode/UnicodeString';
    import { tick, untrack } from 'svelte';
    import { get } from 'svelte/store';

    interface Props {
        /** The current caret state to render */
        caret: Caret;
        /** Whether to blink the caret*/
        blink: boolean;
        /** Whether the last event was ignored and so the caret should wiggle */
        ignored: boolean;
        /** Whether the caret is in blocks mode */
        blocks: boolean;
        /** Whether the editor is editable; when false, the caret is rendered with higher contrast and width */
        editable: boolean;
        /** The current location of the caret */
        location: CaretBounds | undefined;
        /** A function for getting the editor's token views */
        getTokenViews: () => HTMLElement[];
        /** The editor view */
        viewport: HTMLElement | null;
        /** The writing layout the editor's code is laid out in, from the
         *  source's own glyphs rather than the interface setting. */
        writingLayout: WritingLayout;
        /** Current zoom of the editor */
        zoom: number;
        /** True if the caret was just placed by a pointer event; suppresses auto-scroll */
        placedByPointer: boolean;
    }

    let {
        caret,
        blink,
        ignored,
        blocks,
        editable,
        location = $bindable(undefined),
        getTokenViews,
        viewport,
        writingLayout,
        zoom,
        placedByPointer,
    }: Props = $props();

    /** The calculated padding of the editor. Determined from the DOM. */
    let editorPadding = $state<number | undefined>(undefined);

    /** The HTMLElement rendering this view. */
    let element = $state<HTMLElement | null>(null);
    let isElementInEditor: boolean = $derived(
        element ? element.closest('.editor-viewport') !== null : false,
    );

    /** Derive the current token we're on. */
    let token = $derived(caret?.getToken());

    // --- Off-window caret reachability (statement virtualization) ---
    // When the caret's token is scrolled off-window it has no element, so
    // computeLocation() returns undefined (caret hidden, no scroll). We then ask
    // the window to scroll it in; the location effect re-runs on windowRevision and
    // computeLocation succeeds. This also repairs Home/End/PageUp/PageDown and
    // search navigation, which rely on the caret's own scroll-into-view.
    const windowing = getWindowing();
    let windowRevision = $state(0);
    $effect(() => windowing?.revision.subscribe((n) => (windowRevision = n)));
    // The Caret from the previous effect run. We scroll an off-window caret in
    // ONLY when it CHANGES here (moves AND edits — undo/delete can keep the same
    // numeric position yet reflow the caret off-window) — never when the user
    // scrolls a stationary caret off-window (a windowRevision recompute reuses the
    // same Caret object, so that must scroll freely, not snap back).
    let lastCaretForScrollIn: Caret | undefined = undefined;

    // The grapheme offset from the start of the current token, if there is one.
    let tokenOffset: number | undefined = $derived.by(() => {
        {
            // Position depends on writing direction and layout and blocks mode
            if (
                token !== undefined &&
                caret !== undefined &&
                $locales.getDirection()
            ) {
                // Get some of the token's metadata
                let spaceIndex = caret.source.getTokenSpacePosition(token);
                let lastIndex = caret.source.getTokenLastPosition(token);
                let textIndex = caret.source.getTokenTextPosition(token);

                // Compute where the caret should be placed. Place it if...
                return (
                    // This token has to be in the source
                    spaceIndex !== undefined &&
                        lastIndex !== undefined &&
                        textIndex !== undefined &&
                        // Only show the caret if it's pointing to a number
                        typeof caret.position === 'number' &&
                        // The position can be anywhere after after the first character of the token, up to and including after the token's last character,
                        // or the end token of the program.
                        (caret.isEnd() ||
                            // It must be after the start OR at the start and not whitespace
                            ((caret.position >= spaceIndex ||
                                (caret.position === spaceIndex &&
                                    (spaceIndex === 0 ||
                                        !caret.isSpace(
                                            caret.source
                                                .getCode()
                                                .at(spaceIndex) ?? '',
                                        )))) &&
                                // ... and it must be before the end OR at the end and either the very end or at whitespace.
                                caret.position <= lastIndex))
                        ? // The offset at which to render the token is the caret in it's text.
                          // If the caret position is on a newline or tab, then it will be negative.
                          caret.position - textIndex
                        : undefined
                );
            } else return undefined;
        }
    });

    // Get evaluation context from parent
    const evaluation = getEvaluation();

    // Get the editor context from the parent
    const editor = getEditor();
    const folded = getEffectiveFolded();

    // Whenever the caret or blocks mode changes, wait for rendering, then update it's location.
    let animationDelayTimeout: NodeJS.Timeout | undefined = undefined;
    // The layout-affecting inputs from the last run, so we can tell a pure caret
    // move (only the position changed) from a change that reflows the DOM. Only
    // the latter needs the post-reflow rAF re-measure below.
    let prevLayout:
        | {
              source: typeof caret.source;
              blocks: boolean;
              zoom: number;
              folded: Set<Node> | undefined;
              evaluation: unknown;
          }
        | undefined = undefined;
    $effect(() => {
        caret;
        blocks;
        zoom;
        // Recompute after the virtualization window scrolls (an off-window caret's
        // token has no element until its statement renders).
        windowRevision;
        // Folding/unfolding collapses or expands code, moving the caret's token,
        // so recompute the caret location when the folded set changes.
        $folded;
        // Not playing? Depend on evaluation $evaluation. Otherwise, only update when caret changes.
        // We do this because when stepping, things hide and show and we need to update the caret
        // position when they do. But we don't want to do it when playing, otherwise the editor
        // scrolls to the caret whenever the evaluation steps, which can be a lot when playing!
        const paused = untrack(
            () => $evaluation !== undefined && !$evaluation.playing,
        );
        if (paused) $evaluation;

        // Did anything that reflows the DOM change (an edit changes source; folds/
        // blocks/zoom/stepping shift layout)? A pure caret move changes none of
        // these, so its tick() measurement is already final and the rAF correction
        // below is pure waste (a second forced reflow on a later frame).
        const evaluationSignal = paused ? $evaluation : undefined;
        const layoutChanged =
            prevLayout === undefined ||
            prevLayout.source !== caret.source ||
            prevLayout.blocks !== blocks ||
            prevLayout.zoom !== zoom ||
            prevLayout.folded !== $folded ||
            prevLayout.evaluation !== evaluationSignal;
        prevLayout = {
            source: caret.source,
            blocks,
            zoom,
            folded: $folded,
            evaluation: evaluationSignal,
        };

        // Snapshot the pointer gate now, at the moment the caret changed. The
        // deferred re-measures below run a frame (or `$animationDuration`, 200ms)
        // later, but `placedByPointer` is cleared 100ms after the pointer placed
        // the caret — so reading it at call time let a tap arm a scroll that fired
        // after the gate had closed, yanking the view back while the user was
        // already scrolling.
        const byPointer = placedByPointer;

        tick().then(() => {
            location = computeLocation();

            // If the caret just moved to an off-window position (its token isn't
            // rendered), ask the window to scroll it in; the effect re-runs on
            // windowRevision and computeLocation then succeeds. Gate on movement so
            // scrolling a stationary caret off-window doesn't snap the view back.
            const moved = caret !== lastCaretForScrollIn;
            lastCaretForScrollIn = caret;
            if (location === undefined && moved && windowing !== undefined) {
                const target =
                    caret.position instanceof Node ? caret.position : token;
                if (target) get(windowing.scrollToNode)?.(target);
            }

            // Scroll the (now on-window) caret into view once the just-computed
            // `location` has been committed to the DOM — a nested tick() lets
            // Svelte apply the caret element's new top/left before we measure it.
            // Doing this here, chained off the location update, rather than in a
            // separate effect that races it, is what makes the WHOLE caret land in
            // view instead of scrolling to its stale pre-move position.
            if (moved && location !== undefined)
                tick().then(() => scrollCaretIntoView(byPointer));

            // After a DOM-mutating edit, layout can be transient at
            // tick() time on WebKit (especially with complex programs
            // containing formatted docs): the prior token's measured rect
            // hasn't yet reflowed to its final position, so the caret is
            // published one line too high. Re-measure on the next
            // animation frame and adopt the settled position. Skip this for a
            // pure caret move — nothing reflowed, so the tick() measurement is
            // already correct and the extra reflow would just cost a frame.
            // computeLocation() clears `location` as its first step, so
            // capture before the call and fall back to it if the re-run
            // can't produce a value (e.g., editor being torn down).
            if (layoutChanged)
                requestAnimationFrame(() => {
                    const saved = location;
                    const corrected = computeLocation();
                    location = corrected ?? saved;
                    // The corrected position may differ by a line, so re-reveal it
                    // (after the DOM commits the corrected location).
                    if (moved)
                        tick().then(() => scrollCaretIntoView(byPointer));
                });

            if (animationDelayTimeout) clearTimeout(animationDelayTimeout);
            // Block-mode padding transitions over $animationDuration when the
            // selected block changes, so re-measure once the transition has
            // settled. In text mode, caret movement does not trigger any layout
            // transitions, so the delayed re-measure is pure waste.
            if (blocks) {
                animationDelayTimeout = setTimeout(() => {
                    location = computeLocation();
                    // Reveal the FINAL settled position: the block's padding has
                    // finished animating, so the selected node's box is now where
                    // it will stay. 'nearest' no-ops if it's already fully visible.
                    if (moved)
                        tick().then(() => scrollCaretIntoView(byPointer));
                }, $animationDuration);
            }
        });
    });

    // Suppress blinking briefly after any caret change (movement or edit) so the
    // caret reads as solid while the user is active, resuming its blink once idle.
    // Kept local (a timer) rather than routing through keyboardEditIdle, whose
    // store round-trip is an expensive per-move fan-out we deliberately avoid
    // (see Editor.handleEdit's navigation skip).
    let blinkSuppressed = $state(false);
    let blinkTimer: ReturnType<typeof setTimeout> | undefined = undefined;
    $effect(() => {
        caret; // re-arm on any caret change
        blinkSuppressed = true;
        if (blinkTimer) clearTimeout(blinkTimer);
        blinkTimer = setTimeout(() => (blinkSuppressed = false), 500);
        return () => {
            if (blinkTimer) clearTimeout(blinkTimer);
        };
    });

    // Code tokens have no measurable height until the editor's font loads, so
    // until then they measure as zero-height boxes flush with the editor's top.
    // Because the editor vertically centers its content within a fixed
    // min-height, the tokens (and the position-0 caret aligned to them) shift
    // down once the glyphs gain real height. An editable editor gets corrected
    // by the next focus/click/scroll, but a read-only embedded editor (e.g.
    // ExampleUI) never does — leaving the caret a few pixels too high. Recompute
    // once fonts are ready so the caret settles onto the laid-out token.
    $effect(() => {
        let cancelled = false;
        document.fonts.ready.then(() => {
            // Wait one frame so the font-driven reflow has been applied before
            // we measure, then adopt the settled position.
            requestAnimationFrame(() => {
                if (!cancelled) location = computeLocation();
            });
        });
        return () => {
            cancelled = true;
        };
    });

    // Recompute once an ancestor's CSS animation finishes. The guide renders
    // embedded examples (ExampleUI) inside markup blocks that "pop" in with a
    // scaleY(0)→scaleY(1) animation (MarkupHTMLView). While that transform runs,
    // getBoundingClientRect returns vertically-scaled geometry, so a caret
    // measured mid-animation (e.g. position 0, anchored to the first token's
    // top) lands a few pixels off and nothing re-measures it once the transform
    // settles — until the next caret change (a click). A CSS transform doesn't
    // change layout size, so ResizeObserver/clientHeight never fire; the
    // animation's end is the only reliable signal. animationend bubbles to the
    // document, so we listen there and re-measure when the finished animation
    // was on an ancestor of this caret (the scaled subtree we live in).
    $effect(() => {
        if (element === null) return;
        const caretElement = element;
        function onAnimationEnd(event: AnimationEvent) {
            // Note: `Node` is shadowed by the Wordplay AST Node import, so test
            // against the DOM `Element` to narrow event.target correctly.
            if (
                event.target instanceof Element &&
                event.target.contains(caretElement)
            )
                location = computeLocation();
        }
        document.addEventListener('animationend', onAnimationEnd);
        return () =>
            document.removeEventListener('animationend', onAnimationEnd);
    });

    // Scroll the caret — or, for a node selection, the selected node's real box —
    // fully into view. Called from the location effect AFTER `location` is
    // finalized and applied to the DOM (see the nested tick()s there), so
    // scrollIntoView measures the caret's FINAL position. Previously this lived in
    // a separate effect that read `location` and raced the location update, so it
    // scrolled to the stale pre-move box and left the new caret/selection only
    // partly visible. Callers gate on movement + editor membership.
    function scrollCaretIntoView(byPointer: boolean) {
        // Skip when placed by pointer (the user already sees where they clicked)
        // or outside a real editor tile (embedded examples own their own scroll).
        // `byPointer` is the caller's snapshot of `placedByPointer` taken when the
        // caret changed, not the live prop — the deferred callers below fire after
        // the prop has been cleared.
        if (byPointer || !isElementInEditor) return;
        // For a node selection the caret element is an invisible placement spot,
        // so scroll the selected node's real element to reveal its full box;
        // otherwise scroll the caret span (which wraps the full-height bar, and is
        // correct for a selected placeholder too). 'nearest' on both axes reveals
        // the whole caret/selection with minimal movement (no unwanted recentering).
        const selected =
            caret.position instanceof Node && !caret.isPlaceholderNode()
                ? caret.position
                : undefined;
        const target = selected ? getNodeView(selected) : element;
        target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function getNodeView(node: Node) {
        const editorView = element?.parentElement;
        if (!editorView) return null;

        const tokenView =
            node instanceof Token
                ? (getTokenView(editorView, node) ?? null)
                : null;

        // No token view? (This can happen when stepping, since values are rendered instead of nodes.)
        // Try to find the nearest ancestor that is rendered and return that instead.
        if (tokenView !== null) return tokenView;

        const parents = [node, ...caret.source.root.getAncestors(node)];
        do {
            const parent = parents.shift();
            if (parent) {
                const parentView = editorView.querySelector(
                    `.node-view[data-id="${parent.id}"]`,
                );
                if (parentView) return parentView;
            }
        } while (parents.length > 0);

        return null;
    }

    /** Whether a token has no view in the DOM — collapsed by a fold or (with
     *  statement windowing) scrolled off-window — so caret geometry must skip it
     *  rather than resolve to a wrapper. Ground truth is the absence of the
     *  token's own view, checked against a rendered-id set built at most once per
     *  computeLocation pass: the skip-hidden walks can traverse hundreds of
     *  off-window tokens, and an editor-wide querySelector per step was an
     *  O(tokens × DOM) storm on every window change. */
    let renderedTokenIdSet: Set<string> | null = null;
    function isTokenHidden(node: Node): boolean {
        const editorView = element?.parentElement;
        if (
            !(node instanceof Token) ||
            editorView === null ||
            editorView === undefined
        )
            return false;
        if (renderedTokenIdSet === null) {
            renderedTokenIdSet = new Set();
            for (const el of editorView.getElementsByClassName('token-view')) {
                const id = el.getAttribute('data-id');
                if (id !== null) renderedTokenIdSet.add(id);
            }
        }
        return !renderedTokenIdSet.has(`${node.id}`);
    }

    /** The nearest token from `from` (inclusive of the next one) in `direction`
     *  whose own view is rendered — i.e. not folded away. Used to re-anchor a
     *  caret that landed on a hidden token onto the fold's visible boundary. */
    function nearestVisibleToken(
        from: Token,
        direction: -1 | 1,
    ): Token | undefined {
        let next: Token | undefined = from;
        while (next !== undefined && isTokenHidden(next))
            next = caret?.source.getNextToken(next, direction);
        return next;
    }

    // Line height only depends on the font (fixed per session), zoom, blocks
    // mode, and writing direction — it does NOT change as the caret moves.
    // Without this cache, every caret update would re-run the line-height
    // search below, which iterates getTokenViews() looking for the first
    // token following a <br>. That's O(tokens) DOM iteration plus a
    // querySelectorAll('br') per token visited, on every arrow press. The
    // cache is keyed by source identity so a new source (after edits or
    // navigation) refills it.
    let cachedLineHeight:
        | {
              source: typeof caret.source;
              zoom: number;
              blocks: boolean;
              layout: Axes['layout'];
              lineHeight: number;
          }
        | undefined;

    /** The caret's extent across the lines, and the pitch from one line to the
     *  next — both on the block axis, so "height" here is a width when writing
     *  vertically. */
    function computeCaretAndLineHeight(
        currentToken: Token,
        currentTokenRect: DOMRect,
        axes: Axes,
    ): [number, number] {
        const blockExtent = (rect: DOMRect) => {
            const logical = axes.rect(rect);
            return logical.blockEnd - logical.blockStart;
        };
        let caretHeight = blockExtent(currentTokenRect);

        // If the caret extent is invisible, try to find a token before and use its.
        if (caretHeight === 0) {
            // Skip tokens folded out of the DOM — their view resolves (via the
            // ancestor fallback) to the tall folded wrapper, which would give the
            // caret a giant height.
            let before = caret.source.getTokenBefore(currentToken);
            while (before !== undefined && isTokenHidden(before))
                before = caret.source.getTokenBefore(before);
            const beforeView = before ? getNodeView(before) : undefined;
            const beforeRect = beforeView?.getBoundingClientRect();
            caretHeight = beforeRect ? blockExtent(beforeRect) : 0;
        }

        // Reuse the cached line height when the only thing that changed is caret
        // position. Avoids walking every token-view looking for a <br>.
        if (
            cachedLineHeight !== undefined &&
            cachedLineHeight.source === caret.source &&
            cachedLineHeight.zoom === zoom &&
            cachedLineHeight.blocks === blocks &&
            cachedLineHeight.layout === axes.layout
        )
            return [caretHeight, cachedLineHeight.lineHeight];

        // To compute line height, find two tokens on adjacent lines and difference their tops.
        const tokenViews = getTokenViews();
        let firstTokenView: Element | undefined = undefined;
        let firstTokenViewAfterLineBreak: Element | undefined = undefined;
        let lineBreakCount: number | undefined = undefined;
        for (const nextView of tokenViews) {
            if (firstTokenView === undefined) firstTokenView = nextView;
            else {
                const lineBreaks = nextView.querySelectorAll('br');
                if (lineBreaks.length > 0) {
                    firstTokenViewAfterLineBreak = nextView;
                    lineBreakCount = lineBreaks.length;
                    break;
                }
            }
        }

        let lineHeight;

        if (
            firstTokenView &&
            firstTokenViewAfterLineBreak &&
            lineBreakCount !== undefined
        ) {
            // getTokenViews() returns the .token-view elements themselves, and
            // querySelector searches descendants only, so it returns null for a
            // merged text-mode token (and whenever the DOM lags the model
            // mid-edit); fall back to measuring the element itself.
            const firstTokenAfterLineBreakBound = (
                firstTokenViewAfterLineBreak.querySelector('.token-view') ??
                firstTokenViewAfterLineBreak
            ).getBoundingClientRect();
            const firstTokenBound = (
                firstTokenView.querySelector('.token-view') ?? firstTokenView
            ).getBoundingClientRect();

            lineHeight =
                (axes.rect(firstTokenAfterLineBreakBound).blockStart -
                    axes.rect(firstTokenBound).blockStart) /
                lineBreakCount;
        } else {
            lineHeight = blockExtent(currentTokenRect);
        }

        cachedLineHeight = {
            source: caret.source,
            zoom,
            blocks,
            layout: axes.layout,
            lineHeight,
        };

        return [caretHeight, lineHeight];
    }

    /** Reused across computeSpaceDimensions calls (see the comment there). */
    let sharedSpaceRange: Range | undefined = undefined;

    function computeSpaceDimensions(
        editor: HTMLElement,
        currentToken: Token,
        /** The index into the space where the caret is. */
        caretIndex: number,
        axes: Axes,
    ): LogicalRect {
        const zero = {
            inlineStart: 0,
            inlineEnd: 0,
            blockStart: 0,
            blockEnd: 0,
        };

        // Get the .space wrapper for this token.
        const spaceElement = editor.querySelector(
            `.space[data-id="${currentToken.id}"]`,
        );
        if (!(spaceElement instanceof HTMLElement)) return zero;

        // Find the .space-text line containing caretIndex (counted in original
        // characters, with each \n separating lines).
        const lines = Array.from(spaceElement.querySelectorAll('.space-text'));
        let containingLine: HTMLElement | undefined;
        let lineCaretIndex = caretIndex;
        let currentIndex = 0;
        for (const line of lines) {
            if (!(line instanceof HTMLElement)) continue;
            const lineLength = new UnicodeString(
                line.dataset.space ?? '',
            ).getLength();
            if (currentIndex + lineLength >= caretIndex) {
                containingLine = line;
                lineCaretIndex = caretIndex - currentIndex;
                break;
            }
            // +1 for the newline that separates lines.
            currentIndex += lineLength + 1;
        }
        if (!containingLine) return zero;

        // Translate caretIndex (in original chars) to an offset in the rendered
        // text node. Space.svelte's render() replaces ' ' → 1 char (NBSP or ·)
        // and '\t' → TAB_WIDTH chars (TAB_TEXT or EXPLICIT_TAB_TEXT — both have
        // the same length), so this is a simple sum.
        const dataSpace = containingLine.dataset.space ?? '';
        let renderedOffset = 0;
        for (let i = 0; i < lineCaretIndex && i < dataSpace.length; i++)
            renderedOffset += dataSpace[i] === '\t' ? TAB_TEXT.length : 1;

        // Use a Range to measure without mutating the DOM. The previous
        // implementation set innerHTML and read getBoundingClientRect,
        // forcing two synchronous layout flushes per call — the bulk of the
        // cost of vertical caret movement on long files, since DOWN-arrow
        // typically lands in indentation whitespace. The Range is a reused
        // module-level singleton (the sharedRange pattern in outline.ts):
        // allocating one per call was measurable garbage on held arrow keys.
        const textNode = containingLine.firstChild;
        if (!textNode || textNode.nodeType !== textNode.TEXT_NODE) return zero;
        const textLength = textNode.nodeValue?.length ?? 0;
        sharedSpaceRange ??= document.createRange();
        sharedSpaceRange.setStart(textNode, 0);
        sharedSpaceRange.setEnd(textNode, Math.min(renderedOffset, textLength));
        const rect = sharedSpaceRange.getBoundingClientRect();

        // For an empty range or empty line, the rect is degenerate; fall back
        // to the line element's left/top so the caller still gets a usable
        // anchor for the caret.
        if (rect.width === 0 && rect.height === 0) {
            const line = axes.rect(containingLine.getBoundingClientRect());
            // No extent along the text, but the line's own thickness across it.
            return { ...line, inlineEnd: line.inlineStart };
        }

        return axes.rect(rect);
    }

    function computeLocation(): CaretBounds | undefined {
        if (viewport === null) return;
        const axes = editorAxes(
            viewport,
            writingLayout,
            $locales.getDirection(),
        );
        const placement = computePlacement(axes);
        if (placement === undefined) return undefined;

        // One projection, at the end: everything above is written in the logical
        // basis, so the writing mode is accounted for exactly once.
        const box = axes.box({
            inlineStart: placement.inline,
            inlineEnd: placement.inline,
            blockStart: placement.block,
            blockEnd: placement.blockEnd,
        });
        return {
            left: box.left,
            top: box.top,
            right: box.right,
            bottom: box.bottom,
            extent: placement.extent,
            horizontal: axes.horizontal,
        };
    }

    function computePlacement(axes: Axes): CaretPlacement | undefined {
        if (caret === undefined) return;

        // The DOM may have changed since the last pass; rebuild the rendered-id
        // set lazily if any hidden-token check needs it (see isTokenHidden).
        renderedTokenIdSet = null;

        // Start assuming no position.
        location = undefined;

        // No caret view? No caret.
        if (element === null || element === undefined) return;

        // Don't have a viewport? Can't compute.
        if (viewport === null) return;

        // Get the editor's leading inline padding, since the caret's start is
        // measured from there. getComputedStyle resolves the logical property to
        // the correct physical side — left in LTR, right in RTL, and the top
        // edge in a vertical writing mode — so it is already what we want.
        if (editorPadding === undefined) {
            const editorStyle = window.getComputedStyle(viewport);
            editorPadding = parseInt(
                editorStyle
                    .getPropertyValue('padding-inline-start')
                    .replace('px', ''),
            );
        }

        /** Project a measured rect into the viewport's logical basis. Every
         *  coordinate below is in it, so no branch has to know which physical
         *  axis the text is running along. */
        const project = (rect: DOMRect | undefined) =>
            rect === undefined ? undefined : axes.rect(rect);
        const across = (rect: LogicalRect) => rect.blockEnd - rect.blockStart;

        /** Where a line's content begins along the text: past the editor's own
         *  leading padding and the line gutter. The whole gutter, not just the
         *  number — a line can also begin with a chat reference's marker, and
         *  measuring only the number would put the caret a marker's width early. */
        const contentInlineStart = () => {
            const gutter = project(
                element?.parentElement
                    ?.querySelector('.line-start')
                    ?.getBoundingClientRect(),
            );
            return (
                (editorPadding ?? 0) +
                (gutter ? gutter.inlineEnd - gutter.inlineStart : 0)
            );
        };

        // If the caret is a node, find the bottom left token view.
        if (caret.position instanceof Node) {
            const nodeView = getNodeView(caret.position);
            if (nodeView === null) return;

            // ... and it's a placeholder, then position a caret in it's center
            if (caret.isPlaceholderNode()) {
                const placeholderView = nodeView.querySelector(
                    '.token-category-placeholder',
                );
                const placeholderViewRect =
                    placeholderView?.getBoundingClientRect();
                const placeholder = project(placeholderViewRect);
                if (placeholder) {
                    return {
                        inline:
                            (placeholder.inlineStart + placeholder.inlineEnd) /
                            2,
                        block: placeholder.blockStart,
                        extent: across(placeholder),
                        blockEnd: placeholder.blockEnd,
                    };
                }
            }
            // ... and it's not a placeholder, position (invisible) caret below the last token.
            // This is for scrolling purposes.
            else {
                // Find the token and value views being displayed for the node.
                const tokenAndValueViews = nodeView.classList.contains(
                    'token-view',
                )
                    ? [nodeView]
                    : Array.from(
                          nodeView.querySelectorAll(':is(.token-view, .value)'),
                      );
                // No tokens? No location :(
                if (tokenAndValueViews.length === 0) return;

                // Get the bounding rect of the last token or value in the layout
                // and place the caret there for scrolling purposes.
                const rects = tokenAndValueViews.map((t) =>
                    t.getBoundingClientRect(),
                );
                const logical = rects.map((r) => axes.rect(r));
                const inline = Math.min(...logical.map((r) => r.inlineStart));
                const first = Math.min(...logical.map((r) => r.blockStart));
                const last = Math.max(...logical.map((r) => r.blockEnd));
                const reach = last - first;

                // If the node covers more than two lines, place the spot before
                // it; otherwise after it.
                const tokenExtent = across(logical[0]);
                const before = Math.max(0, first - tokenExtent - editorPadding);
                const after = last + editorPadding;
                const block =
                    reach > tokenExtent * 2 && before > tokenExtent * 2
                        ? before
                        : after;

                return {
                    inline,
                    block,
                    extent: tokenExtent,
                    // Collapsed on purpose: this spot exists to scroll to, not
                    // to hang anything below.
                    blockEnd: block,
                };
            }
        }
        // At the start in blocks mode? Render at the first statement's top left.
        // At the end in blocks mode? Render at the right side of the last token.
        else if (
            blocks &&
            (caret.position === 0 ||
                caret.position === caret.source.code.getLength()) &&
            blocks
        ) {
            const start = caret.position === 0;
            const block = caret.source.expression.expression;
            if (!start) {
                // Find the last token in the program.
                const lastToken = block
                    .leaves()
                    .filter((n): n is Token => n instanceof Token)
                    .at(-1);
                if (lastToken) {
                    // Trailing space lives in the space of the token after the
                    // last real token (spaces precede their token in Wordplay).
                    const nextToken = caret.source.getNextToken(lastToken, 1);
                    const trailingSpace = nextToken
                        ? caret.source.spaces.getSpace(nextToken)
                        : '';

                    if (trailingSpace.includes('\n')) {
                        // NodeSequenceView renders trailing newlines as .break
                        // divs (not .break.first, which has zero height).
                        // In document order the outermost trailing breaks come
                        // last, so the last match is always the correct one.
                        const blockView = getNodeView(block);
                        const allBreaks = blockView
                            ? Array.from(
                                  blockView.querySelectorAll(
                                      '.break:not(.first)',
                                  ),
                              )
                            : [];
                        const lastBreak = allBreaks.at(-1);
                        if (lastBreak) {
                            const breakRect = axes.rect(
                                lastBreak.getBoundingClientRect(),
                            );
                            // Use the left of the last node-view in the same
                            // node-list as the inline start (same as case 2).
                            const nodeList = lastBreak.parentElement;
                            const siblings = nodeList
                                ? Array.from(nodeList.children)
                                : [];
                            const lastNodeView = siblings
                                .filter((el) =>
                                    el.classList.contains('node-view'),
                                )
                                .at(-1);
                            const nodeRect = project(
                                lastNodeView?.getBoundingClientRect(),
                            );
                            const inlineStart = nodeRect
                                ? nodeRect.inlineStart
                                : contentInlineStart();
                            return {
                                inline: inlineStart,
                                block: breakRect.blockStart,
                                extent: across(breakRect),
                                blockEnd: breakRect.blockEnd,
                            };
                        }
                    }

                    // No trailing newlines: render at the right edge of the last
                    // token. Skip any folded-out trailing tokens so we measure a
                    // visible token's view rather than the tall folded wrapper.
                    let visibleLast: Token | undefined = lastToken;
                    while (
                        visibleLast !== undefined &&
                        isTokenHidden(visibleLast)
                    )
                        visibleLast = caret.source.getTokenBefore(visibleLast);
                    const lastTokenView = visibleLast
                        ? getNodeView(visibleLast)
                        : null;
                    if (lastTokenView !== null) {
                        const bounds = axes.rect(
                            lastTokenView.getBoundingClientRect(),
                        );
                        return {
                            inline: bounds.inlineEnd,
                            block: bounds.blockStart,
                            extent: across(bounds),
                            blockEnd: bounds.blockEnd,
                        };
                    }
                }
            }
            const blockView = getNodeView(block);
            if (blockView !== null) {
                const bounds = axes.rect(blockView.getBoundingClientRect());
                return {
                    inline: bounds.inlineStart,
                    block: bounds.blockStart,
                    extent: across(bounds),
                    blockEnd: bounds.blockEnd,
                };
            }
        }

        // No token? No caret.
        if (token === undefined) return;

        // No index to render? No caret.
        if (tokenOffset === undefined) return;

        // Mode A: the caret's own token was folded out of the DOM. Its node-view
        // would resolve (via the ancestor fallback) to the tall folded wrapper,
        // misplacing the caret. Re-anchor to the collapsed run's visible boundary.
        // Prefer the prior visible token, rendered at its END edge — the `…` sits
        // right after the last visible token, so a hidden-region caret reads as
        // "at the fold marker" rather than jumping to the next content far below.
        // Fall back to the next visible token's START only when there's no prior
        // one (a fold at the very start of the source). Reachable via restored
        // carets, clicks, and vertical moves; arrows already skip hidden tokens.
        if (isTokenHidden(token)) {
            const prior = nearestVisibleToken(token, -1);
            const renderToken = prior ?? nearestVisibleToken(token, 1);
            const renderView =
                renderToken !== undefined ? getNodeView(renderToken) : null;
            if (renderView === null) return;
            const rect = axes.rect(renderView.getBoundingClientRect());
            // Prior token → caret at its trailing edge (just before `…`); forward
            // fallback → leading edge, as before.
            const atEnd = prior !== undefined;
            return {
                inline: atEnd ? rect.inlineEnd : rect.inlineStart,
                block: rect.blockStart,
                extent: across(rect),
                blockEnd: rect.blockEnd,
            };
        }

        const tokenView = getNodeView(token);
        if (tokenView === null) return;

        // Figure out where the token view is, so we can properly offset the caret position in the editor.
        const tokenViewRect = tokenView.getBoundingClientRect();
        const tokenBox = axes.rect(tokenViewRect);
        const tokenStart = tokenBox.inlineStart;
        const tokenTop = tokenBox.blockStart;

        const [caretHeight, lineHeight] = computeCaretAndLineHeight(
            token,
            tokenViewRect,
            axes,
        );

        // Is the caret in the text, and not the space? We need to measure it's location in the text.
        if (tokenOffset > 0) {
            const [widthAtCaret, heightAtCaret] = measureTokenSegment(
                tokenView,
                tokenOffset,
                blocks,
            ) ?? [0, 0];

            // The measured segment is a physical box; how far along the text it
            // reaches is its width when writing across the screen and its height
            // when writing down it.
            const alongText = axes.horizontal ? widthAtCaret : heightAtCaret;

            return {
                inline: tokenStart + alongText,
                block: tokenTop,
                extent: caretHeight,
                blockEnd: tokenTop + across(tokenBox),
            };
        }
        // If the caret is in the preceding space, compute the top/left of the space position.
        else {
            // Three cases to handle...
            //   1) The caret is in space trailing a line (including just at the end of the line, just before a newline).
            //   2) The caret is somewhere on an empty line.
            //   3) The caret is in the space preceding a token.
            // Figure out which three of this is the case, then position accordingly.

            const explicitSpace = new UnicodeString(
                caret.source.spaces.getSpace(token),
            );

            const spaceIndex = explicitSpace.getLength() + tokenOffset;
            const spaceBefore = explicitSpace.substring(0, spaceIndex);
            const spaceAfter = explicitSpace.substring(spaceIndex);

            const beforeSpace = computeSpaceDimensions(
                viewport,
                token,
                spaceIndex,
                axes,
            );
            // How far the space before the caret reaches along the text. In the
            // logical basis this simply adds — the direction-dependent sign the
            // physical version needed is already in the projection.
            const spaceAlongText =
                beforeSpace.inlineEnd - beforeSpace.inlineStart;

            const editorInlineStart = contentInlineStart();

            // Find the right side of token just prior to the current one that has this space.
            let priorToken: Token | undefined = token;
            let priorTokenView: Element | null = null;
            // Whether the walk back to a visible prior token crossed a fold. When
            // it does, the prior visible token is many collapsed lines away, so
            // its rect can't anchor this whitespace — we use the rendered .space
            // element instead (below).
            let crossedFold = false;
            do {
                priorToken = caret.source.getNextToken(priorToken, -1);
                // Reached the start of source with no visible prior token: leave
                // priorTokenView null so the editor-start fallback is used (as
                // before).
                if (priorToken === undefined) {
                    priorTokenView = null;
                    break;
                }
                // Folded-out tokens have no view of their own; skip past the whole
                // collapsed run rather than letting getNodeView resolve them to
                // the (wrong) folded wrapper.
                if (isTokenHidden(priorToken)) {
                    crossedFold = true;
                    continue;
                }
                priorTokenView = getNodeView(priorToken);
                // We need to make sure the prior token is visible. If we found a visible one,
                // then stop and compute based on that position.
                if (
                    priorTokenView !== null &&
                    priorTokenView.closest('.hide') === null
                )
                    break;
            } while (true);

            const priorTokenBox = project(
                priorTokenView?.getBoundingClientRect(),
            );
            const priorTokenInlineEnd =
                priorTokenBox === undefined
                    ? editorInlineStart
                    : priorTokenBox.inlineEnd;

            // 1) Trailing space (the caret is before the first newline)
            if (spaceBefore.indexOfCharacter('\n') < 0) {
                {
                    const blocksSpace = blocks && spaceBefore.getLength() > 0;
                    // Across a fold the nearest visible prior token is many
                    // collapsed lines away, so its rect can't anchor this space;
                    // use the measured .space element (as blocks mode does).
                    if (crossedFold && !blocksSpace) {
                        return {
                            inline: beforeSpace.inlineEnd,
                            block: beforeSpace.blockStart,
                            extent: caretHeight,
                            blockEnd: beforeSpace.blockStart + caretHeight,
                        };
                    }
                    // The top of the prior visible token's line — the right
                    // anchor in blocks mode, where the `.space-text` measured by
                    // beforeSpaceTop is display:none (so its rect is ~0, which
                    // would pin the caret to the viewport top).
                    let priorTokenTop: number;
                    if (priorTokenBox !== undefined)
                        priorTokenTop = priorTokenBox.blockStart;
                    else if (explicitSpace.indexOfCharacter('\n') >= 0) {
                        const spaceRect = project(
                            viewport
                                .querySelector(`.space[data-id='${token.id}']`)
                                ?.getBoundingClientRect(),
                        );
                        priorTokenTop = spaceRect?.blockStart ?? tokenTop;
                    } else priorTokenTop = tokenTop;

                    // For horizontal layout, place the caret to the right of the
                    // prior token, {spaces} after. In TEXT mode anchor the top on
                    // the measured line top (`.space-text`) — aligns the caret with
                    // the line box (the blank-line fix). In BLOCKS mode that element
                    // is hidden, so anchor on the prior token's line instead (and on
                    // the measured space only when there ARE rendered spaces).
                    const trailingTop =
                        blocks && !blocksSpace
                            ? priorTokenTop
                            : beforeSpace.blockStart;
                    return {
                        inline: blocksSpace
                            ? beforeSpace.inlineEnd
                            : priorTokenInlineEnd + spaceAlongText,
                        block: trailingTop,
                        extent: caretHeight,
                        blockEnd: trailingTop + caretHeight,
                    };
                }
            }
            // 2) Empty line (there is a newline before and after the current position)
            else if (
                spaceBefore.indexOfCharacter('\n') >= 0 &&
                spaceAfter.indexOfCharacter('\n') >= 0
            ) {
                // Find the space container for the token.
                const spaceView = viewport.querySelector(
                    `.space[data-id='${token.id}']`,
                );
                const spaceViewTop =
                    project(spaceView?.getBoundingClientRect())?.blockStart ??
                    0;

                // Figure out the thickness of a line break.
                const breakRect = project(
                    viewport.querySelector('.break')?.getBoundingClientRect(),
                );
                const breakHeight = breakRect ? across(breakRect) : lineHeight;

                // Place the caret's left the number of spaces on this line.
                // If in blocks mode, account for the fact that we render one fewer spaces due to block layout.
                const offset =
                    (spaceBefore.split('\n').length - 1 - (blocks ? 1 : 0)) *
                    (blocks ? breakHeight : lineHeight);

                {
                    // Place the caret's block start at one line's thickness per
                    // newline before it.
                    let spaceTop: number;
                    let inlineStart = editorInlineStart;
                    if (blocks) {
                        // In blocks mode, NodeView renders the .space span as a sibling of
                        // the .node-view div — both are direct children of .node-list.
                        // The .break divs for this node's preceding newlines appear immediately
                        // before the .space element in the .node-list. Find those .break divs
                        // and use the one matching this newline position's bounding rect.
                        const nodeListView = spaceView?.parentElement;
                        // The number of newlines in spaceBefore maps to the .break div index.
                        const breakDivIdx = spaceBefore.split('\n').length - 1;

                        if (
                            nodeListView?.classList.contains('node-list') &&
                            spaceView
                        ) {
                            const siblings = Array.from(nodeListView.children);
                            const spaceIdx = siblings.indexOf(spaceView);
                            // Walk backwards from the .space to collect consecutive .break siblings.
                            const breaksBefore: Element[] = [];
                            for (let i = spaceIdx - 1; i >= 0; i--) {
                                if (siblings[i].classList.contains('break'))
                                    breaksBefore.unshift(siblings[i]);
                                else break;
                            }
                            const breakBefore = project(
                                breaksBefore[
                                    breakDivIdx
                                ]?.getBoundingClientRect(),
                            );
                            spaceTop =
                                breakBefore !== undefined
                                    ? breakBefore.blockStart
                                    : spaceViewTop + offset;

                            // Use the left edge of the preceding node-view in
                            // the list as the inline start for the caret.
                            const firstBreakIdx =
                                spaceIdx - breaksBefore.length;
                            for (let i = firstBreakIdx - 1; i >= 0; i--) {
                                if (
                                    siblings[i].classList.contains('node-view')
                                ) {
                                    inlineStart = axes.rect(
                                        siblings[i].getBoundingClientRect(),
                                    ).inlineStart;
                                    break;
                                }
                            }
                        } else {
                            spaceTop = spaceViewTop + offset;
                        }
                    } else {
                        // Anchor on the MEASURED top of the caret's rendered line
                        // (the `.space-text` element for this line), like block
                        // mode measures its `.break` divs. The old arithmetic
                        // `priorTokenTop + offset` used a glyph-box anchor plus a
                        // cached lineHeight that underestimates the true line
                        // spacing, drifting the caret several px too high and
                        // compounding per blank line (which also broke ArrowDown,
                        // since the mis-placed caret bar fed the next target y).
                        spaceTop = beforeSpace.blockStart;
                    }
                    return {
                        inline: inlineStart + spaceAlongText,
                        block: spaceTop,
                        extent: caretHeight,
                        blockEnd: spaceTop + caretHeight,
                    };
                }
            }
            // 3) Preceding space (the caret is after the last newline)
            else {
                // Get the last line of spaces.
                const spaceLines = explicitSpace.split('\n');
                let spaceOnLastLine = spaceLines[spaceLines.length - 1];
                // Truncate everything on the last line of spaces after the current position of the caret.
                spaceOnLastLine = spaceOnLastLine.substring(
                    0,
                    spaceOnLastLine.length -
                        (explicitSpace.getLength() - spaceIndex),
                );

                const spaceTop = tokenTop;

                // Figure out where to start. In text mode it's the editor's
                // content start; in blocks mode, the start of the node on this
                // line.
                let inlineStart: number;
                if (blocks) {
                    // The .space element for this token is a direct child of .node-list,
                    // and its next sibling is the .node-view for the node on this line.
                    // Use that node-view's left edge as the inline start.
                    const spaceEl = viewport.querySelector(
                        `.space[data-id='${token.id}']`,
                    );
                    const nodeViewEl =
                        spaceEl?.parentElement?.classList.contains(
                            'node-list',
                        ) &&
                        spaceEl.nextElementSibling?.classList.contains(
                            'node-view',
                        )
                            ? spaceEl.nextElementSibling
                            : null;
                    inlineStart = nodeViewEl
                        ? axes.rect(nodeViewEl.getBoundingClientRect())
                              .inlineStart
                        : editorInlineStart;
                } else inlineStart = editorInlineStart;

                return {
                    inline: inlineStart + spaceAlongText,
                    block: spaceTop,
                    extent: caretHeight,
                    blockEnd: spaceTop + caretHeight,
                };
            }
        }
    }
</script>

<svelte:window
    onresize={() => {
        location = computeLocation();
    }}
/>

<span
    class="caret {blink && !blinkSuppressed ? 'blink' : ''} {ignored
        ? 'ignored'
        : ''} {blocks ? 'blocks' : ''}"
    class:focused={$editor?.focused}
    class:readonly={!editable}
    class:node={caret && caret.isNode() && !caret.isPlaceholderNode()}
    class:vertical={location !== undefined && !location.horizontal}
    style:display={location === undefined ? 'none' : null}
    style:left={location ? `${location.left}px` : null}
    style:top={location ? `${location.top}px` : null}
    bind:this={element}
    ><span
        class="bar"
        style:width={location
            ? location.horizontal
                ? CaretThickness
                : `${location.extent}px`
            : null}
        style:height={location
            ? location.horizontal
                ? `${location.extent}px`
                : CaretThickness
            : null}
    ></span>{#if !blocks}<div class="trigger"
            ><MenuTrigger anchor={caret.position} /></div
        >{/if}</span
>

<style>
    .caret {
        position: absolute;
        opacity: 0.25;
        /* Above RemoteCaretOverlay (z-index 4) so the local user's
           caret is always visible — when a collaborator's caret
           happens to land on the same position, the local one
           still reads as the "you are here" indicator and isn't
           obscured by the peer's flag or line. */
        z-index: 6;
        /* The caret bar overlays the very position it marks, so without this a
           click on it would hit the bar instead of the token/space beneath
           (elementFromPoint returns the bar), and caret placement would fall
           through to the end of the token/program. The bar is purely visual;
           only the menu trigger needs to be clickable (re-enabled below). */
        pointer-events: none;
    }

    .focused,
    .readonly {
        opacity: 1;
    }

    .node {
        visibility: hidden;
    }

    .bar {
        display: inline-block;
        /* A minimum length across the lines, so an unmeasured caret is still
           visible. Which physical axis that is depends on the writing mode, so
           the vertical case restates it rather than relying on a logical
           property: the bar's own box has no writing mode of its own. */
        min-height: var(--wordplay-min-line-height);
        background-color: var(--wordplay-foreground);
    }

    .caret.vertical .bar {
        min-height: 0;
        min-width: var(--wordplay-min-line-height);
    }

    /* Writing vertically, the bar is thin top-to-bottom instead, so the trigger
       centers on the other axis. */
    .caret.vertical .trigger {
        top: 50%;
        transform: translateY(-50%);
    }

    .caret.blink .bar {
        animation: blink-animation 1s steps(2, start) infinite;
    }

    .caret.ignored {
        animation: shake 1;
        animation-duration: calc(var(--animation-factor) * 200ms);
    }

    .blocks.focused .bar {
        background-color: var(--wordplay-highlight-color);
    }

    .trigger {
        position: absolute;
        top: 50%;
        /* Center on the bar, whatever either of them is wide. The .caret box shrink-wraps to the bar
           (the trigger itself is out of flow), so 50% of it is the bar's own center — no dependence on
           the bar's width, which varies, or the trigger's, which grew to the 24px minimum touch target
           WCAG 2.5.8 asks for. The fixed -0.25em nudge this replaces only centered the bare glyph. */
        left: 50%;
        transform: translateX(-50%);
        /* Re-enable pointer events the .caret container disables, so the menu
           trigger stays clickable. */
        pointer-events: auto;
    }

    /* The trigger's trailing margin separates it from what follows it inline; here nothing does, and
       counting it in the box being centered would offset the glyph to the left of the caret. */
    .trigger :global(.trigger) {
        margin-inline-end: 0;
    }

    @keyframes blink-animation {
        to {
            visibility: hidden;
        }
    }
</style>
