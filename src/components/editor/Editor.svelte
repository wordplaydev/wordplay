<script module lang="ts">
    const SHOW_OUTPUT_IN_PALETTE = false;
</script>

<!-- svelte-ignore state_referenced_locally -->
<script lang="ts">
    import Emoji from '@components/app/Emoji.svelte';
    import ConceptLinkUI from '@components/concepts/ConceptLinkUI.svelte';
    import CaretView, {
        type CaretBounds,
    } from '@components/editor/caret/CaretView.svelte';
    import { computeCaretDescriptionPosition } from '@components/editor/caretDescriptionPosition';
    import {
        type Edit,
        InsertSymbol,
        type ProjectRevision,
        altKeyLabel,
        handleKeyCommand,
        resetVisualColumnAfter,
    } from '@components/editor/commands/Commands';
    import { getInternalClipboard } from '@components/editor/commands/InternalClipboard';
    import {
        DragFeedbackNotification,
        type EditorNotifier,
        LargeDeletionNotification,
        PasteFeedbackNotification,
        TabNotification,
    } from '@components/editor/EditorNotification';
    import EditorSearch from '@components/editor/EditorSearch.svelte';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import {
        type HighlightSpec,
        Highlights,
        getCaretHighlights,
        getDragHighlights,
        getProjectHighlights,
        getRangeOutline,
        getSearchMatches,
        updateOutlines,
    } from '@components/editor/highlights/Highlights';
    import {
        type Outline,
        OutlinePadding,
        type Rect,
    } from '@components/editor/highlights/outline';
    import isComposingKeyDown from '@components/editor/isComposingKeyDown';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import { pasteText } from '@components/editor/Paste';
    import {
        getBlockInsertionPoint,
        getBreakPosition,
        getCaretPositionAt,
        getEmptyList,
        getNodeAt,
        getTextInsertionPointsAt,
    } from '@components/editor/pointer/PointerUtilities';
    import RemoteCaretOverlay from '@components/editor/RemoteCaretOverlay.svelte';
    import {
        isNodeHidden,
        isStrictlyHidden,
        nearestRenderedAncestor,
        nearestVisibleBoundary,
        renderedTokenIds,
    } from '@components/editor/util/foldedCaret';
    import { isFoldableNode } from '@components/editor/util/folding';
    import OutputPreview from '@components/editor/OutputPreview.svelte';
    import {
        type EditorState,
        IdleKind,
        getAnimatingNodes,
        getAnnouncer,
        getConceptIndex,
        getConflicts,
        getDragged,
        getEditors,
        getEmphasizedConflict,
        getEvaluation,
        getKeyboardEditIdle,
        getResetKeyboardIdle,
        getSelectedOutput,
        setCaret,
        setDragTarget,
        setEditor,
        setEffectiveFolded,
        setFolded,
        setHighlights,
        setSetMenuAnchor,
    } from '@components/project/Contexts';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import Templates from '@concepts/Templates';
    import type Conflict from '@conflicts/Conflict';
    import {
        CharactersDB,
        DB,
        Projects,
        Settings,
        animationFactor,
        blockDensity,
        blocks,
        insertTab,
        locales,
        showLines,
        wrap,
    } from '@db/Database';
    import {
        type RemoteCaret,
        decodeRemoteCaret,
        encodeRemoteCaret,
    } from '@db/projects/caretEncoding';
    import Project from '@db/projects/Project';
    import Caret, {
        type CaretPosition,
        isCaretPosition,
        resolveCaretPosition,
        serializeCaretPosition,
    } from '@edit/caret/Caret';
    import {
        AssignmentPoint,
        InsertionPoint,
        dropNodeOnSource,
        getDropConflicts,
        isDropPermitted,
        isValidDropTarget,
    } from '@edit/drag/Drag';
    import Menu, { RevisionSet } from '@edit/menu/Menu';
    import { getEditsAt } from '@edit/menu/PossibleEdits';
    import type Revision from '@edit/revision/Revision';
    import type Locale from '@locale/Locale';
    import { type LocaleTextAccessor } from '@locale/Locales';
    import Evaluate from '@nodes/Evaluate';
    import Expression from '@nodes/Expression';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Node, { type FieldPosition, isFieldPosition } from '@nodes/Node';
    import Source from '@nodes/Source';
    import { Sym } from '@nodes/Sym';
    import Token from '@nodes/Token';
    import TypePlaceholder from '@nodes/TypePlaceholder';
    import { DOCUMENTATION_SYMBOL, TYPE_SYMBOL } from '@parser/Symbols';
    import type Evaluator from '@runtime/Evaluator';
    import UnicodeString from '@unicode/UnicodeString';
    import { debounced } from '@util/debounce.svelte';
    import ExceptionValue from '@values/ExceptionValue';
    import { onDestroy, onMount, tick, untrack } from 'svelte';
    import { type Writable, get, writable } from 'svelte/store';

    interface Props {
        /** The evaluator evaluating the source being edited. */
        evaluator: Evaluator;
        /** The project that contains the source being edited */
        project: Project;
        /** The source being edited */
        source: Source;
        /** The ID corresponding to which source this is in the project */
        sourceID?: string;
        /** True if this editor's output is selected by the container. */
        selected?: boolean;
        /** Whether to autofocus the editor */
        autofocus?: boolean;
        /** Whether the editor is editable */
        editable: boolean;
        /** Whether to offer the search-and-replace field (Cmd/Ctrl+F). Only the
         *  ProjectView editor enables this; embedded editors (e.g. ExampleUI) don't. */
        searchable?: boolean;
        /** The locale to use for rending code */
        locale: Locale | null;
        /** The bindable menu the ProjectView displaying this editor should show. */
        menu?: Menu | undefined;
        /** The bindable conflicts to show based caret and mouse position. */
        conflictsOfInterest?: Conflict[];
        /** An preview function that shows this editor */
        setOutputPreview?: () => void;
        /** Whether 2+ source editors are currently expanded/visible. The
         *  output-preview toggle only makes sense when more than one source's
         *  output could be shown on the stage. */
        multipleSourcesVisible?: boolean;
        /** A function for updating conflicts of interest */
        updateConflicts?: (source: Source, conflicts: Conflict[]) => void;
        /** Controller for this editor's footer notifications (large deletions, drag feedback, etc.) */
        notify?: EditorNotifier;
        /** Bindable snapshot of the current caret, for parents that need to observe it */
        caretSnapshot?: Caret | undefined;
    }

    let {
        evaluator,
        project,
        source,
        sourceID = '',
        selected = false,
        autofocus = true,
        editable,
        searchable = false,
        locale,
        menu = $bindable(undefined),
        conflictsOfInterest = $bindable([]),
        setOutputPreview,
        multipleSourcesVisible = false,
        updateConflicts,
        notify,
        caretSnapshot = $bindable(undefined),
    }: Props = $props();

    // The locally-persisted caret for this source, resolved to a live position
    // (a stored node path becomes the node it points to). Undefined if none is
    // stored or it no longer resolves against the current source.
    function localCaret(): CaretPosition | undefined {
        const stored = Settings.getProjectCaret(
            project.getID(),
            project.getIndexOfSource(source),
        );
        return stored !== undefined
            ? resolveCaretPosition(source, stored)
            : undefined;
    }

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    // We start at the saved caret position or 0. We also share it with parents through a bind.
    // For an editable editor, prefer the locally-persisted caret (updated on every
    // move, see the effect below) over the project document's per-edit caret, so a
    // refresh restores where the caret was actually left. Read-only editors (e.g.
    // embedded examples) don't persist, so they just use the document's caret.
    // Folded nodes (code folding). Owned by the Editor so the rendered code, the
    // CaretView/highlight logic, and the caret store's fold-aware normalization
    // below can all react to it. Declared before the caret store so its wrapper
    // can read it.
    // Persisted per project+source as node paths (like the caret); resolve the
    // stored paths against the current AST, dropping any that no longer resolve.
    function localFolded(): Node[] {
        const stored = Settings.getProjectFolds(
            project.getID(),
            project.getIndexOfSource(source),
        );
        if (stored === undefined) return [];
        return stored
            .map((path) => source.root.resolvePath(path))
            .filter((n): n is Node => n !== undefined);
    }
    const folded = writable<Set<Node>>(new Set(editable ? localFolded() : []));
    setFolded(folded);

    // The set actually used for rendering and caret behavior: `folded` minus the
    // nodes temporarily force-expanded (debug step-in, search/highlight inside).
    // Populated by an effect below; the fold controls still read `folded`.
    const effectiveFolded = writable<Set<Node>>(get(folded));
    setEffectiveFolded(effectiveFolded);

    /** Fold every foldable node in the source (the "fold all" command). */
    function foldAll() {
        if (!editable) return;
        const all = new Set<Node>();
        for (const n of source.nodes())
            if (isFoldableNode(n, source.spaces)) all.add(n);
        folded.set(all);
    }
    /** Unfold everything (the "unfold all" command). */
    function unfoldAll() {
        folded.set(new Set());
    }

    // Whether the fold-all / unfold-all commands would do anything, so the
    // toolbar can disable them (and the shortcuts no-op) at the extremes. This
    // only drives a button's enabled state, so it's computed OFF the synchronous
    // keystroke/render path (settling a tick later is imperceptible) — the
    // per-edit node walk never adds to keystroke latency. isFoldableNode is
    // memoized, so the walk reuses the foldable views' computations.
    let canFoldAllValue = $state(false);
    $effect(() => {
        // Re-evaluate when the source or folded set changes.
        source;
        $folded;
        if (!editable) {
            canFoldAllValue = false;
            return;
        }
        const handle = setTimeout(() => {
            const f = get(folded);
            let result = false;
            for (const n of source.nodes())
                if (isFoldableNode(n, source.spaces) && !f.has(n)) {
                    result = true;
                    break;
                }
            canFoldAllValue = result;
        }, 0);
        return () => clearTimeout(handle);
    });
    let canUnfoldAllValue = $derived($folded.size > 0);

    const baseCaret = writable<Caret>(
        new Caret(
            source,
            (editable ? localCaret() : undefined) ??
                project.getCaretPosition(source) ??
                0,
            undefined,
            undefined,
            undefined,
        ),
    );

    // Fold-aware caret normalization, the single chokepoint every caret change
    // flows through (commands, clicks, Escape, Home/End, edits, restore,
    // search, remote). It keeps the caret out of a fold's HIDDEN content while
    // leaving its visible header/docs fully placeable:
    //  - a numeric position strictly inside a hidden run snaps to the nearest
    //    visible boundary (a fold boundary like a colon's end, with a rendered
    //    neighbour, is NOT snapped — it stays placeable);
    //  - a node selection that is wholly folded out (e.g. Escape selecting a
    //    hidden node) snaps to the nearest rendered ancestor (the fold node);
    //  - a range's active end is normalized the same way.
    // Direction-aware skipping for arrows lives in skipFolded; this is the
    // direction-agnostic safety net for every other producer.
    function normalizeFolded(c: Caret): Caret {
        // No folds, or token views not yet available (pre-mount restore): leave
        // it; the re-normalize effect re-checks once tokens render.
        if (get(effectiveFolded).size === 0) return c;
        const rendered = renderedTokenIds(getTokenViews);
        if (rendered.size === 0) return c;
        // The rendered set reflects the LAST render. If none of this caret's
        // source tokens are in it, the DOM is for a different/stale source — an
        // edit just reparsed the tokens (all-new ids) before re-render, or an
        // eval re-render is mid-flight — so the id comparison is meaningless and
        // would flag every token as hidden, snapping the caret to a bogus
        // boundary (e.g. the source end after a backspace, which reads as
        // "everything after the fold was deleted"). Bail; the post-render
        // re-normalize effect re-checks once the DOM matches the source.
        const tokens = c.source.tokens;
        if (tokens.length > 0 && !tokens.some((t) => rendered.has(t.id)))
            return c;
        const pos = c.position;
        if (typeof pos === 'number') {
            if (!isStrictlyHidden(c.source, pos, rendered)) return c;
            const snapped = nearestVisibleBoundary(c.source, pos, rendered);
            return snapped === pos
                ? c
                : c.withPosition(snapped, c.entry, c.visualColumn);
        }
        if (pos instanceof Node) {
            if (!isNodeHidden(pos, rendered)) return c;
            const ancestor = nearestRenderedAncestor(c.source, pos, rendered);
            return ancestor === undefined
                ? c
                : c.withPosition(ancestor, c.entry, c.visualColumn);
        }
        if (Array.isArray(pos)) {
            const [anchor, active] = pos;
            if (!isStrictlyHidden(c.source, active, rendered)) return c;
            const snapped = nearestVisibleBoundary(c.source, active, rendered);
            if (snapped === active) return c;
            return snapped === anchor
                ? c.withPosition(snapped, c.entry, c.visualColumn)
                : c.withPosition([anchor, snapped], c.entry, c.visualColumn);
        }
        return c;
    }

    const caret: Writable<Caret> = {
        subscribe: baseCaret.subscribe,
        set: (c) => baseCaret.set(normalizeFolded(c)),
        update: (fn) => baseCaret.update((c) => normalizeFolded(fn(c))),
    };

    export function setCaretPosition(position: CaretPosition) {
        // Programmatic placement is a discrete action — clear any defer flag
        // left set by a prior held-key flurry so the description block, the
        // editors-store publish, and the announcer all update on this caret
        // change instead of waiting for the 1s idle timeout.
        deferDisplayUpdate = false;
        caret.set($caret.withPosition(position));
    }

    // Share the caret store with children.
    setCaret(caret);

    // When source changes, make sure the caret is pointing to the source.
    // Short-circuit when caret is already on this source: handleEdit already
    // sets the caret with the new source before reviseProject fires, so when
    // the new source prop catches up the caret is already aligned. Without
    // this guard caret.set() fires every keystroke and re-runs every caret
    // subscriber for nothing.
    $effect(() => {
        const cur = untrack(() => $caret);
        if (cur.source !== source) caret.set(cur.withSource(source));
    });

    // Expose caret value to parent via bindable prop.
    $effect(() => {
        caretSnapshot = $caret;
    });

    // Persist caret-only moves (clicks, arrow keys) to localStorage, debounced,
    // so a refresh restores where the caret was left. Edits already persist the
    // caret to the project document via handleEdit; this covers pure moves, which
    // otherwise never save. We keep this out of the project document on purpose:
    // routing a caret move through the reactive project would force a re-analysis
    // and concept-index rebuild on every pause (see ProjectView). Only editable
    // editors persist. Node selections are stored as their source path.
    const debouncedCaret = debounced(() => $caret, 1000);
    $effect(() => {
        const position = debouncedCaret.current.position;
        untrack(() => {
            if (!editable) return;
            Settings.setProjectCaret(
                project.getID(),
                project.getIndexOfSource(source),
                serializeCaretPosition(source, position),
            );
        });
    });

    /** Narrowing helper: distinguishes a text-mode selection range
     *  (`[number, number]`) from an AST Path (`{type, index}[]`).
     *  Array.isArray alone can't tell them apart because both are
     *  arrays. */
    function isRangeTuple(v: readonly unknown[]): v is [number, number] {
        return (
            v.length === 2 &&
            typeof v[0] === 'number' &&
            typeof v[1] === 'number'
        );
    }

    // Encoded snapshot of the LOCAL user's caret, kept current with
    // every caret change. We re-resolve this against the Y.Text after
    // a remote-origin update so the local caret follows the same
    // content (or AST node) it was anchored to — just like we do for
    // peer carets, but for ourselves. Stored in a plain `let` because
    // Svelte reactivity isn't needed: only the onChange listener
    // below reads it, and it does so on its own event tick.
    let localCaretEncoded: RemoteCaret = null;

    // Encode the local caret on every caret change AND publish it to
    // the PresenceTracker so collaborators see where we're editing.
    // The encoding (caretEncoding.encodeRemoteCaret) turns text
    // positions into Yjs RelativePositions anchored to content (not
    // integer indices), and node positions into AST Paths the
    // receiver resolves with nearest-ancestor fallback. No-op when
    // CRDT isn't active for this project — the encoder needs the
    // Y.Text.
    $effect(() => {
        const c = $caret;
        const crdt = Projects.getProjectCRDT(project.getID());
        if (crdt === undefined) return;
        const sourceIndex = project.getIndexOfSource(source);
        const yText = crdt.getYText(sourceIndex);
        const encoded = encodeRemoteCaret(yText, source, c.position);
        localCaretEncoded = encoded;
        const tracker = Projects.getPresenceTracker(project.getID());
        if (tracker !== undefined) tracker.updateCaret(sourceIndex, encoded);
    });

    // When a remote peer's edit lands, the local user's caret index
    // would normally stay put — but the content under it has shifted.
    // Subscribe to the CRDT's onChange and, on remote-origin updates,
    // decode our encoded snapshot against the now-updated Y.Text to
    // get the position that anchors to the same content. For
    // node-mode (Path), resolve through the latest source's root with
    // the nearest-ancestor fallback baked into decodeRemoteCaret.
    //
    // Origin filtering matters: local edits also fire onChange, and
    // re-applying the snapshot to ourselves would clobber the caret
    // position the user just typed into. We only re-resolve when the
    // change came from a peer.
    $effect(() => {
        const crdt = Projects.getProjectCRDT(project.getID());
        if (crdt === undefined) return;
        const sourceIndex = project.getIndexOfSource(source);
        if (sourceIndex < 0) return;
        return crdt.onChange((idx, _code, origin) => {
            if (idx !== sourceIndex) return;
            if (origin !== 'remote') return;
            if (localCaretEncoded === null) return;
            // The bridge in ProjectsDatabase.activateCRDT has
            // already replaced the source in history by the time we
            // run (its listener fires first). Read the post-bridge
            // source from history rather than from our `source`
            // closure — the closure source is the pre-merge one and
            // its AST won't contain the merged content.
            const latest = Projects.getHistory(project.getID())?.getCurrent();
            const latestSource = latest?.getSources()[sourceIndex];
            if (latestSource === undefined) return;
            const yText = crdt.getYText(idx);
            const decoded = decodeRemoteCaret(
                localCaretEncoded,
                yText,
                latestSource,
            );
            if (decoded === null) return;
            const current = untrack(() => $caret);
            if (typeof decoded === 'number') {
                caret.set(current.withPosition(decoded));
            } else if (Array.isArray(decoded)) {
                if (isRangeTuple(decoded)) {
                    caret.set(current.withPosition(decoded));
                } else {
                    // Path — resolve to a Node in the post-merge
                    // source. decodeRemoteCaret already did the
                    // nearest-ancestor walk so this path resolves.
                    const node = latestSource.root.resolvePath(decoded);
                    if (node !== undefined)
                        caret.set(current.withPosition(node));
                }
            }
        });
    });

    let restoredPosition: CaretPosition | undefined = $state(undefined);

    // A menu of potential transformations based on the caret position.
    const selection = getSelectedOutput();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();
    const keyboardEditIdle = getKeyboardEditIdle();
    const resetKeyboardIdle = getResetKeyboardIdle();
    const editors = getEditors();
    const emphasizedConflict = getEmphasizedConflict();

    /** Get the concept index context */
    const indexContext = getConceptIndex();

    /** The DOM node representing the text field for typing. */
    let input: HTMLTextAreaElement | null = $state(null);

    /** The DOM node representing the editor */
    let editor: HTMLElement | null = $state(null);

    /** The width and height of the editor viewport */
    let editorWidth = $state(0);
    let editorHeight = $state(0);

    /** A cache of the .token-view HTMLElements */
    let tokenViews: HTMLElement[] | undefined = $state(undefined);

    /**
     * An expensive operation to get all the token views for various operations.
     * We try to do it only once per update.
     */
    function getTokenViews(): HTMLElement[] {
        if (editor === null) tokenViews = [];
        else if (tokenViews !== undefined) return tokenViews;
        else
            tokenViews = Array.from(
                editor.getElementsByClassName('token-view'),
            ) as HTMLElement[];
        return tokenViews;
    }

    $effect(() => {
        // Refresh the cache when the source OR the fold state changes: folding
        // removes/re-adds rendered tokens, and a stale cache leaves the caret
        // geometry (vertical movement, pointer hit-testing) measuring detached
        // token elements from a node's now-hidden body. Also refresh on the
        // play↔pause transition: pausing shows value views and can re-render
        // token elements, so the cached set must reflect the paused DOM.
        $effectiveFolded;
        $evaluation?.playing;
        if (source) tokenViews = undefined;
    });

    /** True if something in the editor is focused. */
    let focused: boolean = $state(false);

    /** Timer that auto-dismisses the "how to insert a tab" notice shown when Tab
     *  is pressed and the tab-inserts-tab setting is off. */
    let tabNoticeTimeout: ReturnType<typeof setTimeout> | undefined = undefined;

    /** True if the editor was focused before the menu was shown, so we can know whether to restore it after hiding menu. */
    let wasFocusedBeforeMenu = $state(false);

    // A store of highlighted nodes, used by node views to highlight themselves.
    // We store centrally since the logic that determines what's highlighted is in the Editor.
    const highlights = writable<Highlights>(new Highlights());
    setHighlights(highlights);

    // A store of what node is hovered over, excluding tokens, used in drag and drop.
    const hovered = writable<Node | undefined>(undefined);

    // A store of what node is hovered over, including tokens.
    const hoveredAny = writable<Node | undefined>(undefined);

    // A store of the current structural insertion point in a drag — used internally for drop feedback
    // and the release decision. It's set whenever the dragged node *fits* a list/field, even if the drop
    // would be blocked by a conflict.
    const insertion = writable<InsertionPoint | AssignmentPoint | undefined>(
        undefined,
    );

    // The drag target exposed to descendant views to render the drop indicator. Unlike `insertion`, it's
    // only set when the drop is actually PERMITTED, so a blocked target (e.g. a type-mismatched input)
    // doesn't show a misleading insertion indicator. Kept in sync below.
    const visibleDragTarget = writable<
        InsertionPoint | AssignmentPoint | undefined
    >(undefined);
    setDragTarget(visibleDragTarget);

    let zoom = $state(0);

    function setZoom(z: number) {
        zoom = z;
    }

    // A store of the handle edit function
    const editContext = writable({
        edit: handleEdit,
        sourceID: sourceID,
        caret: $caret,
        displayedCaret: $caret,
        blocks: $blocks,
        project,
        focused: false,
        toggleMenu,
        grabFocus,
        setCaretPosition,
        refreshHighlights,
        foldAll,
        unfoldAll,
        canFoldAll: () => canFoldAllValue,
        canUnfoldAll: () => canUnfoldAllValue,
        zoom,
        setZoom,
    });
    setEditor(editContext);

    // True if the last keyboard input was not handled by a command.
    let lastKeyDownIgnored = $state(false);
    let keyIgnoredReason = $state<undefined | LocaleTextAccessor>(undefined);

    // True if the caret was recently set with a pointer.
    let caretSetByPointer = $state(false);

    // Caret location comes from the caret
    let caretLocation: CaretBounds | undefined = $state(undefined);

    // The caret-description div, used to measure its rendered size so we
    // can pick a non-clipped position around the selected block.
    let descriptionElement: HTMLDivElement | undefined = $state(undefined);
    // Computed editor-relative position for the caret-description in blocks
    // mode. Falls back to the simple caretLocation-based placement when
    // unavailable.
    let descriptionPos: { left: number; top: number } | undefined =
        $state(undefined);

    /** In blocks mode, position the caret-description so it doesn't get
     *  clipped by the editor's actual visible viewport. See
     *  computeCaretDescriptionPosition for placement details. */
    $effect(() => {
        const pos = displayedCaret.position;
        // Reading these keeps the effect reactive to layout-affecting changes.
        void $blocks;
        void caretLocation;
        const blockEl = pos instanceof Node ? getNodeView(pos) : undefined;
        if (!descriptionElement || !$blocks || !blockEl || editor === null) {
            descriptionPos = undefined;
            return;
        }
        descriptionPos = computeCaretDescriptionPosition({
            editor,
            descriptionElement,
            blockElement: blockEl,
        });
    });

    // The store the contains the current node being dragged.
    let dragged = getDragged();

    // The point at which a drag started.
    let dragPoint: { x: number; y: number } | undefined = $state(undefined);

    // Touch input uses a long-press to enter drag mode (the iOS reorder
    // convention) so a typical scroll swipe still scrolls. Mouse/trackpad
    // input keeps the existing 10px-threshold drag start.
    let dragLongPressTimer: NodeJS.Timeout | undefined;
    /** ms a touch must be held still before a drag commits */
    const DRAG_LONG_PRESS_MS = 250;
    /** px a touch can drift during the hold before the long-press is
     *  cancelled (i.e. the user is scrolling, not pressing-and-holding) */
    const DRAG_LONG_PRESS_CANCEL_PX = 5;

    function clearDragLongPress() {
        if (dragLongPressTimer !== undefined) {
            clearTimeout(dragLongPressTimer);
            dragLongPressTimer = undefined;
        }
    }

    // The caret position resolved at pointer-down, used as the anchor for drag-to-select.
    let dragStartPosition: CaretPosition | undefined = $state(undefined);

    // The possible candidate for dragging
    let dragCandidate: Node | undefined = $state(undefined);

    // The identity of the drop target the drag-feedback notification was last computed for, so we
    // only re-simulate the drop (and re-render the explanation) when the pointer moves to a new target.
    let lastDragTargetKey: string | undefined = undefined;

    // Whether dropping on the current under-pointer target is permitted (no blocking conflict). Computed
    // once per target by updateDragFeedback and read by the highlight pass to gate the 'match' highlight.
    let currentTargetPermitted = $state(true);

    // Whether the current pointer location is a valid drop (a structural candidate that's also permitted).
    // Drives the cursor: a drag over anything else shows `no-drop`. False unless actively over a good target.
    let validDropTarget = $state(false);

    // Expose the insertion point to descendant views' drop indicators only when the drop is permitted, so
    // a blocked target never shows a misleading indicator. The structural `insertion` still drives feedback
    // and the (permission-checked) release.
    $effect(() => {
        visibleDragTarget.set(validDropTarget ? $insertion : undefined);
    });

    // Tracks consecutive clicks on the same token so that double, triple,
    // quadruple, … clicks select that token and then climb to its ancestors. We
    // track this ourselves rather than relying on the pointer event's click
    // count (event.detail isn't populated consistently across browsers). "Same
    // location" is measured by the token the click's source index falls in (its
    // text plus leading whitespace), NOT by pixel position or elementFromPoint:
    // placing a caret re-renders the token and shifts the layout, which makes
    // the resolved index oscillate between the token's text and its preceding
    // space — but both of those fall in the same token, so this is stable.
    // clickDepth is how far we've climbed (0 = a plain position caret, 1 = the
    // token itself, 2 = its parent, …).
    let lastClickToken: Node | undefined = undefined;
    let lastClickTime = 0;
    let clickDepth = 0;
    /** ms within which a click on the same token continues a multi-click */
    const MULTI_CLICK_MS = 500;

    // Whenever the caret changes, update it's announcements.
    const announce = getAnnouncer();

    // True when the last key was ignored and we're not debugging.
    let shakeCaret = $derived(
        $evaluation !== undefined &&
            $evaluation.playing === true &&
            lastKeyDownIgnored,
    );

    function setMenuAnchor(anchor: CaretPosition | FieldPosition) {
        if (
            anchor !== undefined &&
            (menu === undefined || $caret.position !== anchor)
        ) {
            if (isCaretPosition(anchor)) caret.set($caret.withPosition(anchor));
            showMenu(anchor);
        } else hideMenu();
    }

    // A store of the currently requested node for which to show a menu.
    const menuAnchor =
        writable<(position: CaretPosition | FieldPosition) => void>(
            setMenuAnchor,
        );
    setSetMenuAnchor(menuAnchor);

    // Focus the editor on mount, if autofocus is on.
    onMount(() =>
        autofocus ? grabFocus('Auto-focusing editor on mount.') : undefined,
    );

    onDestroy(() => clearTimeout(tabNoticeTimeout));

    /** Called when the program evaluates another step. */
    async function evalUpdate() {
        // No evaluator, or we're playing? No need to update the eval editor info.
        if (evaluator.isPlaying()) return;

        // If the program contains this node, scroll it's first token into view.
        const stepNode = evaluator.getStepNode();
        if (stepNode && source.has(stepNode)) {
            // Wait for everything to render...
            await tick();
            // Then find the node to scroll to. Keep searching for a visible node,
            // in case the step node is invisible.
            let highlight: Node | undefined = stepNode;
            let element = null;
            do {
                element = document.querySelector(`[data-id="${highlight.id}"]`);
                if (element !== null) break;
                else highlight = source.root.getParent(highlight);
            } while (element === null && highlight !== undefined);

            if (element !== null) ensureElementIsVisible(element);
        }
    }

    function resetIgnored(resetReason: boolean) {
        lastKeyDownIgnored = false;
        if (resetReason) keyIgnoredReason = undefined;
    }

    function setIgnored(reason: LocaleTextAccessor | undefined) {
        lastKeyDownIgnored = true;
        keyIgnoredReason = reason;
        // Flip back to unignored after the animation so we can give more feedback.
        setTimeout(() => resetIgnored(false), $animationFactor * 250);
    }

    /**
     * Given a node, find its rendered counterpart. This is expensive, so we do some caching.
     * null represents that the node could not be found when we first checked.
     */
    let nodeViewCache = new Map<Node, HTMLElement | null>();
    $effect(() => {
        // Reset on real DOM-shape changes only: source replacement (new AST
        // means new ids and rendered elements), blocks mode toggle, or a
        // stepping advance that swaps in value-rendered elements. We deliberately
        // do NOT depend on $evaluation directly, which fires every animation
        // frame during play and would otherwise blow this cache away 60 Hz.
        $blocks;
        source;
        // Tracking the projectStepNode derived rather than $evaluation: its value
        // stays undefined during play and only changes when stepping advances.
        projectStepNode;
        nodeViewCache = new Map();
    });
    function getNodeView(node: Node): HTMLElement | undefined {
        if (editor === null) return undefined;
        const cache = nodeViewCache.get(node);
        if (cache !== undefined) return cache ?? undefined;
        // See if there's a node or value view that corresponds to this node.
        const view =
            document.getElementById(`node-${node.id}`) ??
            document.getElementById(`value-${evaluator.getCurrentValue()?.id}`);
        if (view instanceof HTMLElement) {
            nodeViewCache.set(node, view);
            return view;
        } else {
            nodeViewCache.set(node, null);
            return undefined;
        }
    }

    function ensureElementIsVisible(element: Element, nearest = false) {
        // Scroll to the element. Note that we don't set "smooth" here because it break's Chrome's ability to horizontally scroll.
        element.scrollIntoView({
            block: nearest ? 'nearest' : 'center',
            inline: nearest ? 'nearest' : 'center',
        });
    }

    function handleRelease() {
        // Drop only if the editor is editable (drag-and-drop is disabled when viewing a read-only
        // checkpoint) and the target is PERMITTED: structurally valid AND introducing no blocking (Error)
        // conflict — the same predicate getDragHighlights uses to highlight, so what's highlighted is
        // exactly what will drop. A blocked target does nothing; the footer feedback already explains why.
        const releaseTarget = $hovered ?? $insertion;
        if (
            editable &&
            $dragged &&
            releaseTarget !== undefined &&
            isDropPermitted(project, source, $dragged, releaseTarget)
        )
            drop();

        // Clear any drag feedback now that the drag is ending.
        notify?.clear(DragFeedbackNotification);

        // Release the dragged node.
        if (dragged) dragged.set(undefined);
        dragCandidate = undefined;
        dragPoint = undefined;
        dragStartPosition = undefined;
        lastDragTargetKey = undefined;

        // Cancel any pending touch long-press.
        clearDragLongPress();

        // Reset the insertion points.
        insertion.set(undefined);

        // Restore native touch behavior (scroll, etc.) for the next gesture.
        // We only set touch-action on actual drag-start so this is a no-op
        // for non-drag pointerups, but it keeps the editor in a clean state.
        if (editor) editor.style.removeProperty('touchAction');
    }

    async function drop() {
        if ($dragged === undefined) return;
        if ($hovered === undefined && $insertion === undefined) return;

        // If there's a hovered node, prioritize that. Otherwise, choose the insertion point.
        const target = $hovered ?? $insertion;

        const [newProject, newSource, droppedNode] =
            target === undefined
                ? [undefined, undefined]
                : (dropNodeOnSource(project, source, $dragged, target) ?? [
                      undefined,
                      undefined,
                  ]);

        if (newProject === undefined || droppedNode === undefined) return;

        // Set the caret to the first placeholder or the dragged node, or the node itself if there isn't one.
        const newCaretPosition =
            droppedNode.getFirstPlaceholder() ?? droppedNode;
        caret.set(
            $caret.withPosition(newCaretPosition).withAddition(droppedNode),
        );

        // Update the project with the new source files
        Projects.reviseProject(
            newProject.withCaret(newSource, newCaretPosition),
        );

        // Focus the node caret selected.
        grabFocus('Focusing editor on node drop.');
    }

    /**
     * Paste `text` at the caret. In blocks mode, if the paste would introduce a conflict it's rejected
     * (by Caret.insert) and we explain why at the bottom of the editor — the same "explain, don't just
     * block" feedback drag-and-drop gives — instead of the generic "would create an error" message.
     */
    function pasteWithFeedback(text: string) {
        const result = pasteText(
            text,
            $caret,
            project,
            $blocks,
            $locales,
            notify,
        );
        // `true` means a specific conflict explanation was shown, so there's nothing more to do.
        // Otherwise handleEdit applies the edit, or shows the generic ignored reason for a rejection.
        if (result !== true) handleEdit(result, IdleKind.Typed, true);
    }

    /** A stable string identity for a drop target, so we only recompute feedback when it changes. */
    function dropTargetKey(
        target: Node | InsertionPoint | AssignmentPoint,
    ): string {
        if (target instanceof InsertionPoint)
            return `i:${target.node.id}:${target.field}:${target.index}`;
        if (target instanceof AssignmentPoint)
            return `a:${target.parent.id}:${target.field}`;
        return `n:${target.id}`;
    }

    /**
     * While dragging, explain at the bottom of the editor what dropping on the target under the pointer
     * would do: a red rejection if it would introduce a blocking (Error) conflict (the drop is then
     * disallowed), or an amber warning if it would only introduce a permitted type-mismatch (Warning).
     * Also records `currentTargetPermitted` so the highlight pass can gate the 'match' highlight without
     * re-simulating. Only re-simulates when the pointer moves to a new target, since dragged + source are
     * constant during a drag.
     */
    function updateDragFeedback() {
        // No feedback (and no valid drop) when there's no drag, or in a read-only editor where
        // drag-and-drop is disabled.
        if (!editable || $dragged === undefined) {
            lastDragTargetKey = undefined;
            currentTargetPermitted = true;
            validDropTarget = false;
            return;
        }

        // The target that would receive the drop right now (insertion and hovered are mutually exclusive).
        // Only give feedback for actual drop candidates: an insertion/assignment point, or a hovered node
        // that is a structurally valid drop target.
        const target = $hovered ?? $insertion;
        const isCandidate =
            target instanceof InsertionPoint ||
            target instanceof AssignmentPoint ||
            (target instanceof Node &&
                isValidDropTarget(project, $dragged, target));
        if (target === undefined || !isCandidate) {
            currentTargetPermitted = true;
            validDropTarget = false;
            if (lastDragTargetKey !== undefined) {
                lastDragTargetKey = undefined;
                notify?.clear(DragFeedbackNotification);
            }
            return;
        }

        // Same target as last move? Nothing to recompute (currentTargetPermitted already set for it).
        const key = dropTargetKey(target);
        if (key === lastDragTargetKey) return;
        lastDragTargetKey = key;

        // Simulate the drop. Blocking (Error) conflicts make the drop invalid; Warning conflicts are
        // permitted but worth flagging. Explain the blocker first if there is one.
        const { conflicts, project: dropped } = getDropConflicts(
            project,
            source,
            $dragged,
            target,
        );
        const blocking = conflicts.filter((c) => c.isBlocking());
        currentTargetPermitted = blocking.length === 0;
        validDropTarget = blocking.length === 0;
        const relevant = blocking.length > 0 ? blocking : conflicts;
        const conflict = relevant[0];
        if (conflict === undefined) {
            // Clean drop: no feedback.
            notify?.clear(DragFeedbackNotification);
            return;
        }
        // The conflict's nodes live in the simulated project, so resolve its message against that context.
        const droppedContext = dropped.getContext(dropped.getMain());
        const nodes = conflict.getMessage(droppedContext, Templates);
        notify?.set({
            id: DragFeedbackNotification,
            content: {
                // Frame the conflict message so it's clear what it's about.
                prefix: (l) => l.ui.source.feedback.cantDrop,
                markup: nodes.explanation(
                    $locales,
                    dropped.getNodeContext(nodes.node) ?? droppedContext,
                ),
            },
            // Red when the drop is blocked, amber when it's a permitted type-mismatch.
            variant: blocking.length > 0 ? 'error' : 'warning',
        });
    }

    function handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return;

        // A click is a discrete action — clear any defer flag left set by a
        // prior held-key flurry so the description block, editors-store
        // publish, and announcer all update immediately on the new caret
        // rather than waiting for the 1s idle timeout.
        deferDisplayUpdate = false;

        // Clear any existing large deletion notification when user clicks to clear selection
        notify?.clear(LargeDeletionNotification);
        // Clear any stale drag/paste feedback as a new gesture begins.
        notify?.clear(DragFeedbackNotification);
        notify?.clear(PasteFeedbackNotification);
        lastDragTargetKey = undefined;
        event.preventDefault();
        event.stopPropagation();

        // A click on the same token as the previous one (soon enough after it)
        // is a continued multi-click: select that token, then climb one ancestor
        // for each further click, stopping at the root. Otherwise it's a fresh
        // click, so record the token and place a position caret as usual. We
        // resolve the click's source index and find the token it falls in rather
        // than comparing the node under the pointer, since the index→token
        // mapping is stable across the layout shift that placing a caret causes.
        const clickIndex = getCaretPositionAt(
            $caret,
            event,
            getTokenViews,
            editor,
            $blocks,
            $locales.getDirection() === 'rtl',
        );
        let clickToken =
            clickIndex === undefined
                ? undefined
                : source.getTokenAt(clickIndex, true);
        // If the click landed in the empty space after a line (the resolved
        // position is the line's terminating newline, or the very end of the
        // source), getTokenAt maps it to the *next* line's first token via that
        // token's leading space. For selection, prefer the last token of the
        // clicked line, so step back one token in the source's token stream.
        if (
            clickToken !== undefined &&
            clickIndex !== undefined &&
            (clickIndex >= source.getCode().getLength() ||
                source.getCode().at(clickIndex) === '\n')
        ) {
            const index = source.tokens.indexOf(clickToken);
            if (index > 0) clickToken = source.tokens[index - 1];
        }
        // Never select the program's end token (the last token in the source);
        // clicking at or after the last token can resolve to it via its leading
        // space. Use the last token of the program before the end token instead.
        if (
            clickToken !== undefined &&
            clickToken === source.tokens[source.tokens.length - 1]
        )
            clickToken =
                source.tokens.length > 1
                    ? source.tokens[source.tokens.length - 2]
                    : undefined;
        // If the resolved token was folded out of the DOM (a click at a folded
        // header's end resolves to the boundary that getTokenAt maps to the
        // hidden value's first token), step back to the nearest visible token so
        // multi-click selection climbs from the visible header, not a collapsed
        // node. Use the rendered-id set (the shared source of truth) rather than
        // a per-token DOM query. An empty set means the editor isn't mounted yet
        // (or the DOM is stale mid-render); skip rather than unwind to nothing.
        const renderedForClick = renderedTokenIds(getTokenViews);
        if (renderedForClick.size > 0)
            while (
                clickToken !== undefined &&
                !renderedForClick.has(clickToken.id)
            )
                clickToken = source.getTokenBefore(clickToken);
        const sameLocation =
            clickToken !== undefined &&
            clickToken === lastClickToken &&
            event.timeStamp - lastClickTime < MULTI_CLICK_MS;
        lastClickTime = event.timeStamp;

        if (sameLocation) {
            clickDepth += 1;
        } else {
            clickDepth = 0;
            lastClickToken = clickToken;
        }

        if (clickDepth === 0 || lastClickToken === undefined) {
            placeCaretAt(event);
        } else {
            let node: Node = lastClickToken;
            for (let i = 0; i < clickDepth - 1; i++) {
                const parent = source.root.getParent(node);
                if (parent === undefined) break;
                node = parent;
            }
            caret.set($caret.withPosition(node));
            // Remember where the drag started so a subsequent drag can extend
            // the selected node into a range (see handlePointerMove). Unlike
            // placeCaretAt, there's no numeric position to anchor on yet; the
            // anchor is derived from the node's token boundaries when the drag
            // actually begins.
            dragPoint = { x: event.clientX, y: event.clientY };
        }

        // After we handle the click, focus on keyboard input, in case it's not focused.
        grabFocus('Focusing editor on pointer down.');
    }

    function placeCaretAt(event: PointerEvent) {
        if (editor === null) return;

        // If the token is over an empty list, insertion point for that list.
        const empty = $blocks ? getEmptyList(source, event) : undefined;
        // In blocks mode, a click on a blank line's `.break` div places the caret
        // at that line's beginning (the only navigable blocks-mode whitespace).
        const breakPosition = $blocks
            ? getBreakPosition(source, event)
            : undefined;
        const tokenUnderPointer = getNodeAt(source, event, true);
        const nonTokenNodeUnderPointer = getNodeAt(source, event, false);
        const newPosition =
            // If there's an ampty position, use that.
            empty !== undefined
                ? empty
                : // If over a blank line's break in blocks mode, use its beginning.
                  breakPosition !== undefined
                  ? breakPosition
                  : // If in blocks mode and over an editable text token, get the caret position
                    $blocks &&
                      tokenUnderPointer instanceof Token &&
                      Caret.isTokenTextBlockEditable(
                          tokenUnderPointer,
                          source.root.getParent(tokenUnderPointer),
                      )
                    ? getCaretPositionAt(
                          $caret,
                          event,
                          getTokenViews,
                          editor,
                          $blocks,
                          $locales.getDirection() === 'rtl',
                      )
                    : // If shift is down or in blocks mode and not over an editable text token, select the non-token node at the position.
                      (event.shiftKey || $blocks) &&
                        nonTokenNodeUnderPointer !== undefined
                      ? nonTokenNodeUnderPointer
                      : // If the node is a placeholder token, select it's placeholder ancestor
                        tokenUnderPointer instanceof Token &&
                          tokenUnderPointer.isSymbol(Sym.Placeholder)
                        ? source.root
                              .getAncestors(tokenUnderPointer)
                              .find((a) => a.isPlaceholder())
                        : // Otherwise choose an index position under the mouse
                          getCaretPositionAt(
                              $caret,
                              event,
                              getTokenViews,
                              editor,
                              $blocks,
                              $locales.getDirection() === 'rtl',
                          );
        // If we found a position, set it and reset the ignore feedback.
        if (newPosition !== undefined) {
            caret.set($caret.withPosition(newPosition));
            resetIgnored(true);
            caretSetByPointer = true;
            dragStartPosition = newPosition;
            setTimeout(() => {
                caretSetByPointer = false;
            }, 100);
        }

        // Mark that the creator might want to drag the node under the pointer and remember where the click started.
        // We deliberately do NOT preventDefault or set touch-action here:
        // doing so on touch-start commits iOS to "this isn't a scroll" before
        // we know the user's intent, breaking scrolling in blocks mode. The
        // suppression is deferred to the moment a drag actually starts (in
        // handleEditHover for mouse, or the long-press timer for touch).
        dragPoint = { x: event.clientX, y: event.clientY };
        // Drag requires the editor to be editable. The previous condition
        // (`editable ? $blocks || event.shiftKey : $blocks`) inadvertently
        // allowed dragging in read-only blocks mode.
        if (
            editable &&
            nonTokenNodeUnderPointer &&
            ($blocks || event.shiftKey)
        ) {
            dragCandidate = nonTokenNodeUnderPointer;

            // Touch input: gate drag on a long-press so scroll swipes still
            // scroll. Mouse/trackpad still uses the existing pixel
            // threshold check in handleEditHover.
            if (
                event.pointerType === 'touch' &&
                dragged !== undefined &&
                dragCandidate !== undefined
            ) {
                const candidate = dragCandidate;
                clearDragLongPress();
                dragLongPressTimer = setTimeout(() => {
                    dragLongPressTimer = undefined;
                    // Only commit if still the same candidate (the user
                    // didn't release or move enough to cancel) and we
                    // haven't already started a drag.
                    if (
                        dragCandidate === candidate &&
                        $dragged === undefined &&
                        dragged !== undefined
                    ) {
                        dragged.set(candidate);
                        dragCandidate = undefined;
                        dragPoint = undefined;
                        if (editor) editor.style.touchAction = 'none';
                    }
                }, DRAG_LONG_PRESS_MS);
            }
        }
    }

    function exceededDragThreshold(event: PointerEvent) {
        return (
            dragPoint !== undefined &&
            Math.sqrt(
                Math.pow(event.clientX - dragPoint.x, 2) +
                    Math.pow(event.clientY - dragPoint.y, 2),
            ) >= 10
        );
    }

    function handlePointerMove(event: PointerEvent) {
        if (editor === null) return;

        // Touch input: if the finger drifts during the long-press window,
        // the user is scrolling, not pressing-and-holding. Cancel the
        // pending drag so subsequent moves go to the browser as scroll.
        if (
            dragLongPressTimer !== undefined &&
            dragPoint !== undefined &&
            Math.sqrt(
                Math.pow(event.clientX - dragPoint.x, 2) +
                    Math.pow(event.clientY - dragPoint.y, 2),
            ) >= DRAG_LONG_PRESS_CANCEL_PX
        ) {
            clearDragLongPress();
            dragCandidate = undefined;
        }

        // Handle an edit
        handleEditHover(event);

        // If the primary button is held and we have a drag start position,
        // update the selection if the pointer has moved to a different character position
        // AND has moved enough pixels to indicate intentional dragging (not click micro-movement).
        if (
            event.buttons === 1 &&
            $dragged === undefined &&
            dragPoint !== undefined &&
            !$blocks &&
            exceededDragThreshold(event)
        ) {
            // Dragging to select. What's under the pointer?
            const position = getCaretPositionAt(
                $caret,
                event,
                getTokenViews,
                editor,
                $blocks,
                $locales.getDirection() === 'rtl',
            );
            if (typeof position === 'number') {
                // If a node is currently selected (e.g. via double-click), there's
                // no numeric anchor yet. Convert the node selection into a range
                // anchor: the node's token start or end position, whichever is
                // nearest the pointer.
                if (
                    dragStartPosition === undefined &&
                    $caret.position instanceof Node
                ) {
                    const start = source.getNodeFirstPosition($caret.position);
                    const end = source.getNodeLastPosition($caret.position);
                    if (start !== undefined && end !== undefined)
                        dragStartPosition =
                            Math.abs(position - start) <=
                            Math.abs(position - end)
                                ? start
                                : end;
                }

                // Only create a range if the pointer resolved to a different numeric character position.
                if (
                    typeof dragStartPosition === 'number' &&
                    position !== dragStartPosition
                )
                    caret.set(
                        $caret.withPosition([dragStartPosition, position]),
                    );
            }
        }

        // Hover debug stuff when paused.
        if (!evaluator.isPlaying()) handleDebugHover(event);
    }

    function handleEditHover(event: PointerEvent) {
        if (editor === null) return;

        // Update the selecting state
        selectingWithShift = event.shiftKey && dragCandidate === undefined;

        // By default, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(source, event, false));
        hoveredAny.set(getNodeAt(source, event, true));

        // If we have a drag candidate and it's past 5 pixels from the start point, set the insertion points to whatever points are under the mouse.
        if (
            dragged &&
            dragCandidate &&
            exceededDragThreshold(event) &&
            event.buttons === 1
        ) {
            dragged.set(dragCandidate);
            dragCandidate = undefined;
            dragPoint = undefined;
            // Drag has actually started — now suppress native scroll/zoom
            // for the rest of this gesture. Doing this on pointerdown would
            // break iOS scrolling because Safari commits the gesture's
            // intent (scroll vs custom) at touch-start.
            event.preventDefault();
            if (editor) editor.style.touchAction = 'none';
        }

        // Update insertion points if something is dragged and hovered isn't a placeholder. Drag-and-drop
        // is disabled in a read-only editor, so it ignores the dragged node entirely (no insertion
        // points, no drop feedback).
        if (
            editable &&
            $dragged &&
            !($hovered instanceof ExpressionPlaceholder) &&
            !($hovered instanceof TypePlaceholder)
        ) {
            let insertionPoint: InsertionPoint | AssignmentPoint | undefined =
                undefined;

            // In blocks mode? Handle the case of empty and insert.
            if ($blocks) {
                insertionPoint = getBlockInsertionPoint(
                    context,
                    event,
                    $dragged,
                );
            }
            // Get the insertion points at the current pointer position
            // And filter them by kinds that match, getting the field's allowed types,
            // and seeing if the dragged node is an instance of any of the dragged types.
            // This only works if the types list contains a single item that is a list of types.
            else {
                insertionPoint = getTextInsertionPointsAt(
                    $caret,
                    event,
                    getTokenViews,
                    editor,
                    $blocks,
                    $locales.getDirection() === 'rtl',
                ).filter((insertion) => {
                    const kind = insertion.node.getFieldKind(insertion.field);
                    return (
                        kind &&
                        $dragged &&
                        (kind.allows($dragged) || kind.allows([$dragged]))
                    );
                })[0];
            }

            // Set the insertion, whatever we found.
            insertion.set(insertionPoint);

            // If we found one, unset the hovered. We don't do both at the same time.
            if (insertionPoint) hovered.set(undefined);
        } else insertion.set(undefined);

        // Explain the target under the pointer if dropping there would produce a conflict.
        updateDragFeedback();
    }

    function handleDebugHover(event: PointerEvent) {
        const node = getNodeAt(source, event, false);

        // If the node is associated with a step, set it, otherwise unset it.
        hovered.set(
            evaluator.isDone() || node === undefined
                ? undefined
                : evaluator.getEvaluableNode(node),
        );
    }

    function handlePointerLeave() {
        hovered.set(undefined);
        insertion.set(undefined);
    }

    // When the menu changes to undefined, focus back on this source.
    $effect(() => {
        if (menu === undefined && wasFocusedBeforeMenu)
            grabFocus('Restoring editor focus after menu is hidden.');
    });

    async function showMenu(anchor: CaretPosition | FieldPosition) {
        if (!editable) return;

        wasFocusedBeforeMenu = focused;

        // Wait for everything to be updated so we have a fresh context
        await tick();

        // Get the unique valid edits at the caret.
        let revisions = getEditsAt(
            project,
            $caret,
            isFieldPosition(anchor) ? anchor : undefined,
            $locales,
            concepts,
            CharactersDB.getAvailableCharacterNamesForAutocomplete(),
        );

        // If in blocks mode, filter edits that would create conflicts.
        if ($blocks) {
            // Make a mapping of sources to revisions.
            const revisionToSource = new Map<Revision, Source>();
            for (const revision of revisions) {
                const edit = revision.getEdit($locales);
                const source = Array.isArray(edit) ? edit[0] : undefined;
                if (source) revisionToSource.set(revision, source);
            }
            // Find the new conflicts for each revision.
            const newConflicts = project.getNewConflictsBatch(
                source,
                Array.from(revisionToSource.values()),
            );
            // Filter the revisions by those that don't create conflicts.
            revisions = revisions.filter((revision) => {
                const source = revisionToSource.get(revision);
                const conflicts = source
                    ? (newConflicts.get(source) ?? [])
                    : [];
                return conflicts.length === 0;
            });
        }

        // Set the menu.
        if (concepts)
            menu = new Menu(
                project,
                source,
                anchor,
                revisions,
                undefined,
                concepts,
                [0, undefined],
                handleMenuItem,
            );
    }

    function hideMenu() {
        menu = undefined;
        wasFocusedBeforeMenu = false;
    }

    function toggleMenu() {
        return menu === undefined ? showMenu($caret.position) : hideMenu();
    }

    // Toggle the search field (Cmd/Ctrl+F). EditorSearch focuses the field on
    // open and clears the query on close, so flipping the flag is enough.
    function toggleSearch() {
        if (!searchable) return;
        searchActive = !searchActive;
    }

    // Move the caret to the next match after the current position, cycling back
    // to the first after the last (Cmd/Ctrl+G, or Enter in the search field).
    // Returns whether it handled the keystroke.
    function goToNextMatch(): boolean {
        if (!searchActive) return false;
        const matches = searchMatches;
        if (matches.length === 0) return true;
        const position = $caret.isPosition() ? $caret.position : undefined;
        const next =
            (position !== undefined
                ? matches.find((match) => match.start > position)
                : undefined) ?? matches[0];
        caret.set($caret.withPosition(next.start));
        return true;
    }

    // Replace every search match with the given replacement text, as a single
    // source edit. Afterward there are typically no matches left, so the search
    // highlights and the replace UI disappear on their own.
    function replace(replacement: string) {
        const matches = searchMatches;
        if (matches.length === 0) return;
        // Splice the replacement into each match range (grapheme coordinates).
        // Matches are non-overlapping and in document order.
        const code = source.code;
        let newCode = '';
        let cursor = 0;
        for (const match of matches) {
            newCode += code.substring(cursor, match.start).toString();
            newCode += replacement;
            cursor = match.end;
        }
        newCode += code.substring(cursor).toString();

        const newSource = source.reparse(newCode);
        // Place the caret just after the first replacement.
        const newPosition =
            matches[0].start + new UnicodeString(replacement).getLength();
        handleEdit(
            [newSource, $caret.withSource(newSource).withPosition(newPosition)],
            IdleKind.Typed,
            true,
        );
    }

    function handleMenuItem(
        selection: Edit | RevisionSet | undefined,
    ): boolean {
        if (menu) {
            if (selection === undefined) {
                menu = menu.back();
            } else if (selection instanceof RevisionSet) {
                const newIndex = menu.getOrganization().indexOf(selection);
                menu = menu.withSelection([newIndex, 0]);
                return false;
            } else {
                // Menu commands are discrete user actions — clear any defer
                // flag left set by a prior held-key flurry so consumers
                // (description block, editors store, announcer) update on
                // this edit instead of waiting for the 1s idle timeout.
                deferDisplayUpdate = false;
                handleEdit(selection, IdleKind.Typed, true);
                return true;
            }
        }
        return false;
    }

    /**
     * @param focusAfter: True if the editor should claim focus after performing this edit.
     *      For all actions that come from the editor, it should.
     *      But there are other things that edit, and they may not want the editor grabbing focus.
     **/
    async function handleEdit(
        edit: Edit | ProjectRevision | LocaleTextAccessor,
        idle: IdleKind,
        focusAfter: boolean,
    ) {
        // Received a reason to ignore the edit? Set ignored.
        if (typeof edit === 'function') {
            setIgnored(edit);
            return;
        }

        // Clear any existing large deletion or paste-rejection notification since a new edit has started
        notify?.clear(LargeDeletionNotification);
        notify?.clear(PasteFeedbackNotification);
        const previousSource = source;

        const navigation = edit instanceof Caret;

        // Get the new caret and source to display.
        let newCaret = navigation ? edit : edit[1];
        const newSource = navigation ? undefined : edit[0];

        // Editing a folded node that's currently selected expands it permanently,
        // so the change the creator is making is actually visible.
        if (newSource !== undefined && $caret.position instanceof Node) {
            const selected = $caret.position;
            if (get(folded).has(selected))
                folded.update((set) => {
                    const next = new Set(set);
                    next.delete(selected);
                    return next;
                });
        }

        // Deleting folded content: if a deletion removes any of a folded node's
        // HIDDEN tokens, unfold that node so it's visible what's being deleted.
        // The deleted range [delStart, delEnd) is in the OLD source, where the
        // folded set's nodes and getTokenViews still live (the DOM hasn't
        // re-rendered yet), so the ids line up.
        if (
            newSource !== undefined &&
            !(newSource instanceof Project) &&
            typeof newCaret.position === 'number' &&
            get(folded).size > 0
        ) {
            const removed =
                source.getCode().getLength() - newSource.getCode().getLength();
            if (removed > 0) {
                const delStart = newCaret.position;
                const delEnd = delStart + removed;
                const rendered = renderedTokenIds(getTokenViews);
                folded.update((set) => {
                    let changed = false;
                    const next = new Set(set);
                    for (const node of set) {
                        const deletesHidden = node.leaves().some((leaf) => {
                            if (!(leaf instanceof Token)) return false;
                            const s = source.getTokenTextPosition(leaf);
                            const e = source.getTokenLastPosition(leaf);
                            return (
                                s !== undefined &&
                                e !== undefined &&
                                s < delEnd &&
                                e > delStart &&
                                !rendered.has(leaf.id)
                            );
                        });
                        if (deletesHidden) {
                            next.delete(node);
                            changed = true;
                        }
                    }
                    return changed ? next : set;
                });
            }
        }

        // Always reset the 1s idle timer, even when the store value isn't
        // changing — the timer is what debounces "is the user still typing?".
        if (resetKeyboardIdle) resetKeyboardIdle();
        // Only fire the keyboardEditIdle store on actual transitions. Hitting
        // .set() with the same value still notifies every subscriber and
        // produces a fanout cascade across the project per keystroke.
        if (keyboardEditIdle && get(keyboardEditIdle) !== idle)
            keyboardEditIdle.set(idle);

        // Update the caret and project.
        if (newSource) {
            if (editable) {
                Projects.reviseProject(
                    newSource instanceof Project
                        ? newSource
                        : project
                              .withSource(source, newSource)
                              .withCaret(newSource, newCaret.position),
                );
                caret.set(
                    newSource instanceof Project
                        ? newCaret
                        : newCaret.withSource(newSource),
                );
                resetIgnored(true);
            } else setIgnored((l) => l.ui.source.cursor.ignored.readOnly);
        } else {
            // Remove the addition, since the caret moved since being added.
            caret.set(newCaret.withoutAddition());
            resetIgnored(true);
        }

        // After processing the edit, if it was a deletion, check if a large deletion occurred
        if (
            newSource &&
            'getCode' in newSource &&
            previousSource.getCode().getLength() -
                newSource.getCode().getLength() >=
                40
        ) {
            notify?.set({
                id: LargeDeletionNotification,
                content: { path: (l) => l.ui.source.cursor.largeDelete },
                variant: 'info',
            });
        }

        // After everything is updated, if we were asked to focus the editor, focus it.
        await tick();
        if (focusAfter) grabFocus('Focusing editor after edit');
    }

    function grabFocus(message: string) {
        if (input) setKeyboardFocus(input, message);
    }

    /** Move keyboard focus to the next tabbable element after `from` in document
     *  order, emulating what plain Tab normally does. Used when the
     *  tab-inserts-tab setting has reassigned plain Tab to inserting a tab, so the
     *  insert-tab shortcut (Ctrl/Alt+Tab) can still move focus out of the editor. */
    function focusNextTabbable(from: HTMLElement) {
        const tabbable = Array.from(
            document.querySelectorAll<HTMLElement>(
                'a[href], button, input, textarea, select, [tabindex]',
            ),
        ).filter(
            (el) =>
                !el.hasAttribute('disabled') &&
                el.getAttribute('tabindex') !== '-1' &&
                el.getClientRects().length > 0,
        );
        const index = tabbable.indexOf(from);
        const next = index >= 0 ? tabbable[index + 1] : undefined;
        if (next)
            setKeyboardFocus(
                next,
                'Switching focus on the insert-tab shortcut.',
            );
    }

    /** True if the last symbol was a dead key*/
    let keyWasDead = false;
    let replacePreviousWithNext = false;
    let composing = $state(false);
    let composingJustEnded = false;
    /** If the shift key is pressed in text mode, entering selecting mode */
    let selectingWithShift = $state(false);

    /** True if a symbol was inserted using the insert symbol command, so we can undo it if composition starts. */
    let insertedSymbol = false;
    /** The key most recently inserted via InsertSymbol, for character echo; undefined when the last action was navigation. */
    let lastInsertedKey: string | undefined = undefined;
    /** True if text was pasted */
    let pasted = true;

    function handleTextInput(event: Event) {
        // Not all platforms send composition end events, so if we think we're composing,
        // but receive an event that indicates we are not, end composition.
        if (composing && event instanceof InputEvent && !event.isComposing)
            handleCompositionEnd();

        // Blocks mode? There's no free text input — typing is handled by per-token text fields. But a
        // paste still lands on the hidden input here, so route it through pasteWithFeedback: it inserts
        // when valid, or shows the usual paste-not-allowed feedback instead of dropping silently. We must
        // also clear the hidden input; otherwise repeated blocks-mode pastes accumulate in it and leak
        // into the next text-mode paste.
        if ($blocks) {
            if (pasted && input !== null) {
                const text = input.value;
                input.value = '';
                pasted = false;
                if (text.length > 0) pasteWithFeedback(text);
            }
            return;
        }

        // Text input is treated as a flurry: every typed character calls
        // handleEdit which would otherwise update displayedCaret + publish
        // editors + run the announcer per character. Defer all of those
        // until the 1s idle timer fires (or some other discrete action
        // resets the flag).
        deferDisplayUpdate = true;

        resetIgnored(true);

        let edit: Edit | ProjectRevision | LocaleTextAccessor | undefined;

        // Somehow no reference to the input? Bail.
        if (input === null) return;

        // Get the character that was typed into the text box, or the whole thing if there was a paste.
        // Wrap the string in a unicode wrapper so we can account for graphemes.
        const value = new UnicodeString(input.value);

        const lastChar = pasted
            ? // Get everything pasted
              value.substring(0, value.getLength())
            : // Get the last grapheme entered.
              value.substring(value.getLength() - 1, value.getLength());

        let newCaret = $caret;
        let newSource: Source | undefined = source;

        // First, delete any selected node.
        if (newCaret.position instanceof Node) {
            const edit = newCaret.deleteNode(
                newCaret.position,
                $blocks,
                project,
            );
            if (Array.isArray(edit)) {
                newSource = edit[0];
                newCaret = edit[1];
            } else setIgnored(edit);
        }

        // If the last key pressed was a deadkey, capture it from the input.
        if (typeof newCaret.position === 'number') {
            // Did we decide to replace the previous character typed with the next one? Do that.
            if (replacePreviousWithNext) {
                replacePreviousWithNext = false;

                const char = lastChar.toString();
                newSource = newSource.withPreviousGraphemeReplaced(
                    char,
                    newCaret.position,
                );
                if (newSource) {
                    // Reset the hidden field.
                    input.value = '';
                    edit = [
                        newSource,
                        new Caret(
                            newSource,
                            newCaret.position,
                            undefined,
                            newSource.getTokenAt(newCaret.position),
                        ),
                    ];
                } else edit = undefined;
            }
            // Otherwise, just insert the grapheme and limit the input field to the last character.
            else if (!composing) {
                const char = lastChar.toString();

                // Insert the character that was added last.
                edit = newCaret.insert(char, $blocks, project, !keyWasDead);
                if (edit) {
                    // Reset the value to the last character.
                    if (value.getLength() > 1)
                        input.value = lastChar.toString();
                }

                // If the key was a dead key, the next time a key is pressed, replace the diacritic that was
                // inserted with the replacement symbol typed.
                if (keyWasDead) replacePreviousWithNext = true;
            }
        }

        // Reset pasted flag.
        if (pasted) {
            pasted = false;
            input.value = '';
        }

        // Prevent the OS from doing anything with this input.
        if (!composing) event.preventDefault();

        // Did we make an update?
        if (edit instanceof Caret || Array.isArray(edit))
            handleEdit(edit, IdleKind.Typing, true);
        else if (edit !== undefined) setIgnored(edit);
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Some platforms (e.g. the Windows emoji picker) drop the compositionend
        // event, leaving us stuck composing; a keydown that is not part of a
        // composition is our cue to recover and commit. We must exclude IME
        // composition keys, though — on macOS Chrome with 2-Set Korean,
        // event.isComposing is intermittently false on syllable boundaries, and
        // ending composition there fragments the word (#1054).
        if (composing && !isComposingKeyDown(event)) handleCompositionEnd();

        // Ignore key down events that come just after composing. They're usually part of selecting the phrase in Safari.
        if (composingJustEnded) {
            composingJustEnded = false;
            return;
        }
        // If we're in the middle of composing, ignore the key events.
        if (composing || event.isComposing) return;
        if (editor === null) return;

        // Assume we'll handle it.
        resetIgnored(true);

        // If it was a dead key, don't handle it as a command, just remember that it was
        // a dead key, then let the input event above insert it.
        keyWasDead = event.key === 'Dead';
        if (keyWasDead) {
            return;
        }

        // An IME composition key (keyCode 229) that arrives while we're not yet
        // composing is the start of a composition (e.g. the first jamo of a Korean
        // syllable). The browser drives it through composition events, so don't run
        // it as an editor command — doing so inserts a raw pre-composition character
        // (a stray leading ㅇ before the composed syllable) that the composition then
        // duplicates (#1054).
        if (isComposingKeyDown(event)) return;

        // Are we to replace the prior symbol with the next? Don't handle it as a command,
        // just let the character with diacritic remark be typed, and handle it in the input handler above.
        if (replacePreviousWithNext) return;

        // Ctrl/Cmd+V handling. If a copy from inside the app is still fresh,
        // paste from the in-app clipboard directly and skip the native paste
        // event — this avoids per-paste clipboard scanning that some browsers
        // (notably Edge on managed Windows) do, which can freeze the page for
        // a second or two. If the in-app clipboard is stale, fall through to
        // the textarea's native paste event so cross-app paste still works.
        // We don't use the PASTE command for the cross-app case because it
        // calls navigator.clipboard.read(), which prompts for clipboard-read
        // permission on each invocation in Edge.
        if (
            (event.ctrlKey || event.metaKey) &&
            !event.shiftKey &&
            !event.altKey &&
            (event.code === 'KeyV' || event.key === 'v' || event.key === 'V')
        ) {
            const internal = getInternalClipboard();
            if (internal === undefined) return;

            event.preventDefault();
            event.stopPropagation();
            // The in-app clipboard only ever holds text copied from within
            // Wordplay, so paste it verbatim — never reinterpret our own code
            // as foreign data (e.g. CSV).
            pasteWithFeedback(internal);
            return;
        }

        // Tab handling depends on the tab-inserts-tab setting. We handle it here
        // rather than as a Command because a Command always consumes the
        // keystroke, which would break the case where Tab must keep its default
        // focus switch. Shift+Tab is left alone so reverse focus navigation
        // always works.
        if (event.key === 'Tab' && !event.shiftKey) {
            const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
            // The insert-tab shortcut: Ctrl/Cmd+Alt+Tab (see Commands.ts).
            const shortcut = (event.ctrlKey || event.metaKey) && event.altKey;
            if ($insertTab) {
                // Setting on: plain Tab inserts a tab, and the shortcut — which
                // would otherwise insert — instead moves focus to the next
                // control, since Tab can no longer do that.
                if (plain && $caret) {
                    handleEdit(
                        $caret.insert('\t', $blocks, project),
                        IdleKind.Typed,
                        true,
                    );
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                } else if (shortcut && input) {
                    event.preventDefault();
                    event.stopPropagation();
                    focusNextTabbable(input);
                    return;
                }
            } else if (plain) {
                // Setting off: plain Tab keeps its default focus switch; explain
                // how to insert a tab instead, auto-dismissing the notice after a
                // few seconds. Don't preventDefault, so focus still moves. The
                // Ctrl/Alt+Tab insert shortcut falls through to its command below.
                notify?.set({
                    id: TabNotification,
                    // Concretize so the Alt/Option label matches the platform,
                    // reusing the same modifier label as keyboard-shortcut hints.
                    content: {
                        markup: $locales.concretize(
                            (l) => l.ui.source.cursor.tab,
                            { alt: altKeyLabel() },
                        ),
                    },
                    variant: 'info',
                });
                clearTimeout(tabNoticeTimeout);
                tabNoticeTimeout = setTimeout(
                    () => notify?.clear(TabNotification),
                    6000,
                );
                return;
            }
        }

        const [command, result] = handleKeyCommand(event, {
            caret: $caret,
            project,
            editor: true,
            evaluator,
            dragging: $dragged !== undefined,
            database: DB,
            toggleMenu,
            toggleSearch,
            nextSearchMatch: goToNextMatch,
            foldAll,
            unfoldAll,
            canFoldAll: () => canFoldAllValue,
            canUnfoldAll: () => canUnfoldAllValue,
            folded: get(effectiveFolded),
            blocks: $blocks,
            locales: $locales,
            view: editor,
            getTokenViews,
            clearLargeDeletionNotification: () =>
                notify?.clear(LargeDeletionNotification),
            notify,
            zoom,
            setZoom,
        });

        // Don't insert symbols if composing.
        insertedSymbol = command === InsertSymbol;
        // Track the key for character echo; clear for navigation commands.
        lastInsertedKey =
            command === InsertSymbol && event.key.length === 1
                ? event.key
                : undefined;

        // Defer the displayed-caret description update for rapid input —
        // a held key auto-repeating, OR a typing-kind command (e.g.,
        // InsertSymbol when the user is typing characters). Discrete
        // commands like Escape, a single arrow press, or a menu shortcut
        // fall through with deferDisplayUpdate=false and update the
        // description immediately.
        deferDisplayUpdate = event.repeat || command?.typing === true;

        // If it produced a new caret and optionally a new project, update the stores.
        const idle =
            command?.typing === true ? IdleKind.Typing : IdleKind.Typed;

        if (typeof result === 'function') {
            setIgnored(result);

            // Consume the event so that nothing else handles it.
            event.preventDefault();
            event.stopPropagation();

            return;
        } else if (result !== false) {
            if (result instanceof Promise) {
                result.then((edit) => {
                    if (typeof edit === 'function') setIgnored(edit);
                    else if (edit !== true) handleEdit(edit, idle, true);
                });
            } else if (result !== undefined && result !== true) {
                // Reset the visual goal column unless this was a vertical move,
                // so left/right/home/end (etc.) update it. See resetVisualColumnAfter.
                handleEdit(resetVisualColumnAfter(command, result), idle, true);
            }

            // Consume the event so that nothing else handles it.
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        // Give feedback that we didn't execute a command if it's not a modifier key.
        else if (!/^(Shift|Control|Alt|Meta|Tab)$/.test(event.key)) {
            setIgnored(undefined);
            return;
        }
        // Return undefined and let the event bubble.
    }

    function handleCompositionStart() {
        composing = true;

        if (insertedSymbol) DB.Projects.undoRedo(evaluator.project.getID(), -1);
    }

    function handleCompositionEnd() {
        composing = false;
        /** We have to remember this because safari sends key down events that were part of the composition. */
        composingJustEnded = true;

        if (input) {
            // Insert the symbols that were composed.
            const edit = $caret.insert(
                input.value,
                $blocks,
                project,
                !keyWasDead,
            );
            if (typeof edit === 'function') setIgnored(edit);
            else handleEdit(edit, IdleKind.Typing, true);
            input.value = '';
        }
    }

    function handlePaste() {
        pasted = true;
    }

    function getInputID() {
        return `${source.getNames()[0]}-input`;
    }

    // When the project changes, reset the restored position
    $effect(() => {
        if (project) restoredPosition = undefined;
    });

    // When the project is undone or redone, if we haven't restored the position, restore it, then remember the restored position.
    $effect(() => {
        if (
            Projects.getHistory(project.getID())?.wasRestored() &&
            untrack(() => restoredPosition === undefined)
        ) {
            const position = project.getCaretPosition(source);
            if (position !== undefined && position !== restoredPosition) {
                restoredPosition = position;
                caret.set($caret.withPosition(position));
            }
        }
    });

    let context = $derived(project.getContext(source));
    let caretExpressionType = $derived(
        $caret.position instanceof Expression
            ? $caret.position.getType(context).simplify(context)
            : undefined,
    );

    // A caret snapshot used by the caret-description block. We want immediate
    // feedback for discrete actions (single arrow press, click, menu command,
    // Escape) but not for rapid input (held arrow keys auto-repeating, fast
    // text typing). `deferDisplayUpdate` is set true by the rapid input paths
    // (handleKeyDown when event.repeat is true; handleTextInput) and false by
    // discrete paths. The effect updates displayedCaret on every caret change
    // unless deferred; even when deferred, it'll catch up when keyboardEditIdle
    // returns to Idle.
    let deferDisplayUpdate = $state(false);
    let displayedCaret = $state<Caret>(untrack(() => $caret));
    $effect(() => {
        $caret; // track caret moves so non-deferred updates publish immediately
        if (
            $keyboardEditIdle === IdleKind.Idle ||
            !untrack(() => deferDisplayUpdate)
        )
            displayedCaret = untrack(() => $caret);
    });
    let displayedCaretExpressionType = $derived(
        displayedCaret.position instanceof Expression
            ? displayedCaret.position.getType(context).simplify(context)
            : undefined,
    );

    let concepts = $derived(indexContext?.index);

    /** When the current step, step index, or playing state changes, update the evaluation view of the editor.
     *  evalUpdate() bails when playing, so depending on $evaluation directly
     *  (which broadcasts every animation frame) is wasteful. projectStepNode
     *  changes only when stepping advances and stays undefined during play. */
    $effect(() => {
        projectStepNode;
        evalUpdate();
    });

    // Whenever the selected output changes from a source other than the editor, ensure the first selected node is scrolled to.
    $effect(() => {
        if (
            selection !== undefined &&
            selection.hasPaths() &&
            selection.origin !== 'editor'
        ) {
            const node = selection.getOutput(project)[0];
            if (node) {
                tick().then(() => {
                    const view = getNodeView(node);
                    if (view) ensureElementIsVisible(view, true);
                });
            }
        }
    });

    // Keep the project-level editors store in sync with this editor's state.
    // Every CommandButton in the toolbar subscribes to this store and re-runs
    // command.active() (often AST-walking) on each fire, so during a held-key
    // or typing flurry we'd otherwise be doing 20+ reactivity-driven AST
    // queries per character at 30Hz. Defer the publish until the flurry
    // settles — when deferDisplayUpdate clears or $keyboardEditIdle returns
    // to Idle, this effect re-fires and consumers catch up to the latest
    // state.
    $effect(() => {
        // Read all reactive dependencies up front so the effect re-fires on
        // any of them even when we bail below.
        const c = $caret;
        const dc = displayedCaret;
        const inBlocks = $blocks;
        const _project = project;
        const isFocused = focused;
        const z = zoom;
        const defer = deferDisplayUpdate;
        const idle = $keyboardEditIdle;
        // Track fold state so the toolbar's fold/unfold buttons re-evaluate
        // their active state when the user folds or unfolds.
        const canFold = canFoldAllValue;
        const canUnfold = canUnfoldAllValue;

        if (defer && idle !== IdleKind.Idle) return;

        const editorsRef = untrack(() => editors);
        if (editorsRef) {
            const state: EditorState = {
                caret: c,
                displayedCaret: dc,
                edit: handleEdit,
                sourceID: sourceID,
                blocks: inBlocks,
                project: _project,
                focused: isFocused,
                toggleMenu,
                grabFocus,
                setCaretPosition,
                refreshHighlights,
                foldAll,
                unfoldAll,
                canFoldAll: () => canFold,
                canUnfoldAll: () => canUnfold,
                zoom: z,
                setZoom,
            };
            untrack(() => {
                const currentEditors = get(editorsRef);
                // Update the editor state in the editors store.
                currentEditors.set(sourceID, state);
                // Update the store with the edited map.
                editorsRef.set(currentEditors);
                // Update the local editor state.
                editContext.set(state);
            });
        }
    });

    // Hide the menu when the caret changes.
    $effect(() => {
        if ($caret) hideMenu();
    });

    // Cache of the inputs to the conflictsOfInterest computation. Caret moves
    // within a single token don't change any of these, so we can bail without
    // re-running the work — which previously did a full source.nodes() walk.
    let prevConflictsKey:
        | {
              project: Project;
              nodeConflicts: Conflict[] | undefined;
              dragged: Node | undefined;
              hoveredAny: Node | undefined;
              caretNode: Node | undefined;
              tokenAtCaret: Token | undefined;
              tokenPrior: Token | undefined;
              atTokenEnd: boolean;
          }
        | undefined;

    /** The node we last told the sidebar to emphasize from the caret, so we only
     * publish on change. */
    let lastEmittedConflictNode: Node | undefined = undefined;
    /**
     * Publish an editor-origin emphasis for the conflict the caret is over (or
     * clear our own emphasis when the caret leaves all conflicts). Reads/writes
     * the store untracked so it never re-triggers the surrounding effect.
     */
    function emitEmphasis(node: Node | undefined) {
        if (emphasizedConflict === undefined) return;
        if (node === lastEmittedConflictNode) return;
        lastEmittedConflictNode = node;
        untrack(() => {
            const current = get(emphasizedConflict);
            if (node !== undefined)
                emphasizedConflict.set({
                    node,
                    origin: 'editor',
                    nonce: (current?.nonce ?? 0) + 1,
                });
            // Only clear our own (editor-origin) emphasis; leave sidebar emphasis alone.
            else if (current?.origin === 'editor')
                emphasizedConflict.set(undefined);
        });
    }

    $effect(() => {
        // The project and source can update at different times, so we only do this if the current source is in the project.
        if (!project.contains(source)) return;

        // Build a cache key from the effect's true inputs. If they're all
        // unchanged, the result is the same as last time and we can skip the
        // entire computation (which is the hot path for arrow-key movement).
        const tokenAtCaret = $caret.isPosition()
            ? source.getTokenAt($caret.position, false)
            : undefined;
        const atTokenEnd = $caret.isPosition() && !!$caret.atTokenEnd();
        const tokenPrior = atTokenEnd ? $caret.tokenPrior : undefined;
        const caretNode =
            $caret.position instanceof Node ? $caret.position : undefined;

        if (
            prevConflictsKey !== undefined &&
            prevConflictsKey.project === project &&
            prevConflictsKey.nodeConflicts === $nodeConflicts &&
            prevConflictsKey.dragged === $dragged &&
            prevConflictsKey.hoveredAny === $hoveredAny &&
            prevConflictsKey.caretNode === caretNode &&
            prevConflictsKey.tokenAtCaret === tokenAtCaret &&
            prevConflictsKey.tokenPrior === tokenPrior &&
            prevConflictsKey.atTokenEnd === atTokenEnd
        )
            return;

        prevConflictsKey = {
            project,
            nodeConflicts: $nodeConflicts,
            dragged: $dragged,
            hoveredAny: $hoveredAny,
            caretNode,
            tokenAtCaret,
            tokenPrior,
            atTokenEnd,
        };

        let newConflictsOfInterest: Conflict[] = [];

        // If dragging, don't show conlicts.
        if ($dragged !== undefined) {
            untrack(() => updateConflicts?.(source, newConflictsOfInterest));
            conflictsOfInterest = newConflictsOfInterest;
            return;
        }

        // If there are any conflicts in the project...
        if ($nodeConflicts !== undefined && $nodeConflicts.length > 0) {
            let conflictSelection: Node | undefined = undefined;

            // Is the mouse hovering over one? Get the node at the mouse, including tokens
            // and see if it, or any of its parents, are involved in node conflicts.
            const conflictedHover =
                $hoveredAny === undefined
                    ? undefined
                    : (
                          project
                              .getRoot($hoveredAny)
                              ?.getSelfAndAncestors($hoveredAny) ?? []
                      ).find((node) => project.nodeInvolvedInConflicts(node));
            if (conflictedHover) conflictSelection = conflictedHover;

            // If not, is there a node selected?
            if (
                conflictSelection === undefined &&
                caretNode !== undefined &&
                project.nodeInvolvedInConflicts(caretNode)
            )
                conflictSelection = caretNode;

            // If not, what is the "nearest" conflicted node at the caret position?
            if (conflictSelection === undefined) {
                if ($caret.isPosition()) {
                    // 1) Find any conflicted node whose first position is at the caret.
                    //    Iterate the conflicted-nodes map directly instead of walking
                    //    every node in the source.
                    for (const node of project.getConflictedNodes().keys()) {
                        if (
                            source.has(node) &&
                            source.getNodeFirstPosition(node) ===
                                $caret.position
                        ) {
                            conflictSelection = node;
                            break;
                        }
                    }
                    // 2) Else: walk ancestors of the token at/just-before the caret
                    //    looking for a conflicted ancestor.
                    if (conflictSelection === undefined) {
                        for (const token of [tokenAtCaret, tokenPrior]) {
                            if (token === undefined) continue;
                            const ancestors =
                                project
                                    .getRoot(token)
                                    ?.getSelfAndAncestors(token) ?? [];
                            const conflicted = ancestors.find((n) =>
                                project.nodeInvolvedInConflicts(n),
                            );
                            if (conflicted) {
                                conflictSelection = conflicted;
                                break;
                            }
                        }
                    }
                }
                // If there's a node selection, see if it or any of it's ancestors are involved in conflicts
                else if (caretNode !== undefined) {
                    const conflictedAncestor = [
                        caretNode,
                        ...source.root.getAncestors(caretNode),
                    ].find((node) => project.nodeInvolvedInConflicts(node));
                    if (conflictedAncestor)
                        conflictSelection = conflictedAncestor;
                }
            }

            // If we found a selection, get its conflicts.
            if (conflictSelection)
                // Get all conflicts involving the selection
                newConflictsOfInterest = [
                    ...(project.getConflictsInvolvingNode(conflictSelection) ??
                        []),
                    ...$nodeConflicts,
                ]
                    // Eliminate duplicate conflicts
                    .filter(
                        (c1, i1, list) =>
                            !list.some(
                                (c2, i2) => c1 === c2 && i2 > i1 && i1 !== i2,
                            ),
                    );
            // If we didn't find a selection, just get all conflicts in the project.
            else newConflictsOfInterest = $nodeConflicts;

            // Emphasize the conflict the *caret* landed on (not a hover) so the
            // Annotations sidebar wiggles + scrolls to the matching row. Only
            // emit on change to avoid churning the store on every keystroke.
            const caretDerived =
                conflictSelection !== undefined &&
                conflictSelection !== conflictedHover
                    ? conflictSelection
                    : undefined;
            emitEmphasis(caretDerived);
        }
        untrack(() => updateConflicts?.(source, newConflictsOfInterest));

        // Finally, update the conflicts of interest.
        conflictsOfInterest = newConflictsOfInterest;
    });

    /** Announce symbol insertion (character echo) or caret position (navigation) to screen readers.
     *  WCAG 2.1 SC 4.1.3: status messages are conveyed via the live region in Announcer.svelte.
     *  On typing: announce the character that was inserted (character echo) immediately,
     *    matching standard text-input behavior — the Announcer's own queue takes care
     *    of pacing for screen readers that can't keep up with rapid input.
     *  On navigation: announce the cursor's contextual description, deferred during
     *    typing flurries because `caret.getDescription()` is expensive and screen readers
     *    can't keep up. */
    $effect(() => {
        if ($announce && document.activeElement === input && $caret) {
            // Read lastInsertedKey before entering untrack so the value is captured
            // at the time the reactive effect fires (i.e. after the caret update).
            const key = lastInsertedKey;
            // Character echo: never defer. Send each typed character to
            // the Announcer with the 'type' kind so it's processed in FIFO
            // order (without trimming) — matching standard text-input
            // behavior where every key is heard.
            if (key !== undefined) {
                untrack(() => {
                    $announce('type', $caret.getLanguage(), key);
                    lastInsertedKey = undefined;
                });
                return;
            }
            // Navigation announcements may be deferred during typing flurries —
            // see comment above.
            if (deferDisplayUpdate && $keyboardEditIdle !== IdleKind.Idle)
                return;
            untrack(() => {
                $announce(
                    sourceID,
                    $caret.getLanguage(),
                    $caret.getDescription(
                        caretExpressionType,
                        conflictsOfInterest,
                        context,
                    ),
                );
            });
        }
    });

    // When the caret changes, see if it contains output, and if so, select it so the
    // palette appears.
    $effect(() => {
        if (
            SHOW_OUTPUT_IN_PALETTE &&
            selection !== undefined &&
            $caret.position instanceof Evaluate &&
            $caret.position.isOneOf(
                project.getNodeContext($caret.position),
                project.shares.output.Phrase,
                project.shares.output.Group,
                project.shares.output.Stage,
            )
        ) {
            selection.setPaths(project, [$caret.position], 'editor');
        }
    });

    // The evaluator's broadcast() fires on every requestAnimationFrame while a
    // program with temporal streams is playing, which means $evaluation is
    // replaced ~60 times per second. We derive the editor-relevant pieces
    // separately so their values are *stable* during steady-state play
    // (Svelte 5 deriveds only re-trigger downstream when their value changes).
    //
    // stepNode: only meaningful while paused/stepping. During play it stays
    // undefined so the 'evaluating' highlight doesn't flicker every frame.
    let projectStepNode = $derived.by(() => {
        if ($evaluation === undefined || $evaluation.playing) return undefined;
        return $evaluation.evaluator.getStepNode();
    });

    // exceptionNode: returns undefined unless the latest source value is an
    // ExceptionValue, so during normal play the value stays === undefined and
    // downstream consumers don't re-run.
    let projectExceptionNode = $derived.by(() => {
        $evaluation;
        const latest = evaluator.getLatestSourceValue(source);
        return latest instanceof ExceptionValue &&
            latest.step !== undefined &&
            latest.step.node instanceof Node
            ? latest.step.node
            : undefined;
    });

    // Memoize the resolved selected outputs so projectHighlights doesn't see a
    // new array reference on every read of selection.getOutput().
    let selectedOutputs = $derived(selection?.getOutput(project));

    // The project-level slice (conflicts, animating nodes, output, evaluating
    // step) is computed via an effect rather than a $derived so we can clear
    // it as soon as $keyboardEditIdle enters Typing. The previous outlines
    // are stale the moment the first edit lands (the source has changed but
    // project.analyze() is deferred until idle for performance), so we wipe
    // them rather than leave misleading outlines hovering over moved code.
    // They repopulate when the flurry settles and analysis runs.
    let projectHighlights = $state<Highlights>(new Highlights());

    // Editor search state: whether the search field is open, and the current
    // query. Per-editor and ephemeral, so it lives as local state here, bound
    // to the EditorSearch component that renders the toggle and field.
    let searchActive = $state(false);
    let searchQuery = $state('');

    $effect(() => {
        // Track every input but bail before recomputing if typing.
        const stepNode = projectStepNode;
        const exceptionNode = projectExceptionNode;
        const animating = $animatingNodes;
        const outputs = selectedOutputs;
        const inBlocks = $blocks;
        const _src = source;
        const _project = project;
        // Track the published conflicts so the underlines refresh when analysis
        // (re)publishes them — e.g. on load the project is analyzed slightly
        // after first render, and without this dependency the conflict
        // underlines computed from project.getConflictedNodes() would vanish
        // until some other tracked input (like a caret move) re-ran this effect.
        $nodeConflicts;
        if ($keyboardEditIdle === IdleKind.Typing) {
            projectHighlights = new Highlights();
            return;
        }
        projectHighlights = getProjectHighlights(
            _src,
            _project,
            stepNode,
            exceptionNode,
            animating,
            outputs,
            inBlocks,
        );
    });

    // Caret-derived slice (selected/hovered/delimiter/related entries).
    // During a held-key or typing flurry we return an empty Highlights so
    // the decorative outlines disappear rather than stick to the old
    // position the caret has visually moved away from. Together with the
    // merged-highlights diff below, this means the publish during the
    // flurry is a single emit-empty at the start; subsequent presses see
    // an unchanged merged result and don't fire the highlights store
    // (which would otherwise trigger updateOutlines and re-measure
    // caretParent's rows — the dominant per-press JS cost on vertical
    // movement, since each press lands in a different token whose parent
    // often contains many descendants). The outlines snap back to the
    // final position when $keyboardEditIdle flips to Idle and
    // displayedCaret catches up.
    let caretHighlights = $derived.by(() => {
        if (deferDisplayUpdate && $keyboardEditIdle !== IdleKind.Idle)
            return new Highlights();
        return getCaretHighlights(source, project, displayedCaret, $blocks);
    });

    // Drag-derived slice. Skip when there is no drag/hover-select to avoid the
    // O(n) drop-target walk in getDragHighlights. Drag-and-drop is disabled in a
    // read-only editor (e.g. viewing an older checkpoint), so ignore the dragged
    // node there — only shift-drag text selection still highlights.
    let dragHighlights = $derived.by(() => {
        const activeDragged = editable ? $dragged : undefined;
        if (activeDragged !== undefined || (selectingWithShift && !$blocks))
            return getDragHighlights(
                source,
                project,
                activeDragged,
                $hovered,
                $insertion,
                $blocks,
                selectingWithShift,
                currentTargetPermitted,
            );
        return new Highlights();
    });

    // Emphasis slice: when the Annotations sidebar emphasizes a conflict, wiggle
    // its underline here. Only react to sidebar-origin emphasis (editor-origin
    // emphasis is the editor telling the sidebar, so reacting to it would loop).
    let attentionHighlights = $derived.by(() => {
        const emphasis = $emphasizedConflict;
        const slice = new Highlights();
        if (
            emphasis !== undefined &&
            emphasis.origin === 'sidebar' &&
            source.has(emphasis.node)
        )
            slice.add(source, emphasis.node, 'attention');
        return slice;
    });

    // Scroll the emphasized conflict's node into view when the sidebar emphasizes
    // it. Keyed on nonce so re-emphasizing the same node still scrolls.
    let lastScrolledEmphasisNonce: number | undefined = undefined;
    $effect(() => {
        const emphasis = $emphasizedConflict;
        if (
            emphasis === undefined ||
            emphasis.origin !== 'sidebar' ||
            !source.has(emphasis.node) ||
            emphasis.nonce === lastScrolledEmphasisNonce
        )
            return;
        lastScrolledEmphasisNonce = emphasis.nonce;
        const view = untrack(() => getNodeView(emphasis.node));
        if (view) ensureElementIsVisible(view);
    });

    // Merge the slices and publish only when the result actually changed.
    // Skipping the store set on no-op caret moves prevents updateOutlines, the
    // scroll effect, and every NodeView's highlight derived from re-running.
    $effect(() => {
        const newHighlights = Highlights.merge(
            projectHighlights,
            caretHighlights,
            dragHighlights,
            attentionHighlights,
        );
        const current = untrack(() => get(highlights));
        if (!current.equals(newHighlights)) highlights.set(newHighlights);
    });

    // Cache of measured per-row Rects keyed by node-view. updateOutlines
    // populates and reads it so a highlight refresh that adds/removes one
    // entry doesn't re-measure every other entry's rows. Invalidated whenever
    // layout-affecting state changes (source/blocks/zoom) or the editor
    // resizes.
    let outlineRowsCache = new WeakMap<HTMLElement, Rect[]>();
    $effect(() => {
        // Tracking these intentionally so the cache is reset on layout changes.
        source;
        $blocks;
        zoom;
        editorWidth;
        editorHeight;
        outlineRowsCache = new WeakMap();
    });

    // Bumped by descendants whose visible content changed shape (e.g. a
    // sequence expanded/collapsed). Drives the outline effect to re-measure,
    // since neither editor size nor the highlight set will have changed.
    let outlineRevision = $state(0);
    function refreshHighlights() {
        outlineRowsCache = new WeakMap();
        outlineRevision++;
    }

    // The inline values rendered next to expressions while stepping shift the
    // layout when they appear, and shift it back when they disappear on play.
    // Neither the source nor the highlight set changes, so the caret/delimiter
    // and conflict outlines would otherwise stick to the previous layout — most
    // visibly, the matching-delimiter highlight ends up out of place after
    // pausing/playing. Refresh (which drops the cached node rects and bumps the
    // outline revision so the outlines remeasure) on every evaluator broadcast.
    // We refresh on ALL broadcasts, not just the play/pause transition or step
    // advances, because the values that reflow the editor can appear on a later
    // broadcast than the one that flips the state — so a single
    // transition-time remeasure can read the pre-reflow layout. The per-frame
    // cost during play is the accepted tradeoff for outlines that stay put.
    // Untrack the call: refreshHighlights does `outlineRevision++`, whose
    // implicit read would otherwise register outlineRevision as a dep of this
    // effect and the subsequent write would re-trigger us — infinite loop.
    $effect(() => {
        if ($evaluation !== undefined) untrack(refreshHighlights);
    });

    // Folding/unfolding (including auto-expand/re-fold) collapses or expands code,
    // moving the highlighted tokens, so re-measure the outlines when the EFFECTIVE
    // folded set changes. Untracked for the same reason as the effect above.
    $effect(() => {
        $effectiveFolded;
        untrack(refreshHighlights);
    });

    // When the effective folds change, re-run the caret through the store's
    // fold normalization (normalizeFolded): folding a node the caret is inside
    // snaps an interior text position to the fold boundary, and a wholly-hidden
    // node selection to the fold node. This also fires post-render, so it
    // corrects any caret set in the same tick as a fold toggle (before the DOM
    // reflected it) and re-checks a restored caret once tokens render. Note: it
    // re-pushes the already-normalized baseCaret, so unfolding leaves the caret
    // at the boundary it snapped to rather than teleporting back into the
    // newly-revealed content.
    $effect(() => {
        $effectiveFolded;
        untrack(() => caret.set(get(baseCaret)));
    });

    // Persist folds (as node paths) whenever the set CHANGES. The re-resolve
    // effect rebuilds `folded` with fresh node refs on every edit, firing this
    // even when the folds are structurally unchanged; comparing the serialized
    // paths skips the (synchronous localStorage) write in that common case, so a
    // write only happens on an actual fold/unfold — never on the keystroke path.
    let lastPersistedFolds: string | undefined = undefined;
    $effect(() => {
        const set = $folded;
        untrack(() => {
            if (!editable) return;
            const paths = [...set]
                .filter((n) => source.root.has(n))
                .map((n) => source.root.getPath(n));
            const key = JSON.stringify(paths);
            if (key === lastPersistedFolds) return;
            lastPersistedFolds = key;
            Settings.setProjectFolds(
                project.getID(),
                project.getIndexOfSource(source),
                paths,
            );
        });
    });

    // After an edit (new AST), re-resolve the persisted fold paths against the
    // new tree so the folded set tracks live nodes; paths that no longer resolve
    // are dropped. Skipped when there are no folds so plain editing pays nothing.
    $effect(() => {
        source;
        untrack(() => {
            if (!editable) return;
            const resolved = new Set(localFolded());
            const current = get(folded);
            if (resolved.size === 0 && current.size === 0) return;
            folded.set(resolved);
        });
    });

    // Re-measure outlines when an ancestor of the editor finishes a CSS
    // animation. Matters for the editor inside ExampleUI: its container
    // paragraph in MarkupHTMLView animates from transform: scaleY(0) to
    // scaleY(1), and getBoundingClientRect on descendants reflects the
    // mid-animation transform. If $animatingNodes populates while the
    // ancestor is mid-pop, the cached rects stay collapsed and the
    // animating outline ends up rendering above the editor. ResizeObserver
    // does not fire on transform changes, so we listen for animationend
    // bubbling up and refresh once the ancestor is at its final transform.
    $effect(() => {
        if (editor === null) return;
        const editorEl = editor;
        const handler = (event: AnimationEvent) => {
            if (
                event.target instanceof Element &&
                event.target !== editorEl &&
                event.target.contains(editorEl)
            ) {
                outlineRowsCache = new WeakMap();
                if ($highlights)
                    tick().then(() => {
                        outlines = updateOutlines(
                            $highlights,
                            true,
                            $locales.getDirection() === 'rtl',
                            $blocks,
                            getNodeView,
                            outlineRowsCache,
                        );
                    });
            }
        };
        document.addEventListener('animationend', handler);
        return () => document.removeEventListener('animationend', handler);
    });

    // Update the outline positions any time the highlights change, but only after we're done rendering.
    let outlines = $state<HighlightSpec[]>([]);
    $effect(() => {
        /** Update outlines when blocks mode changes. */
        $blocks;
        /** Re-run on layout-affecting state too. The highlights store skips
         * publishing when the highlighted node set is unchanged (e.g. the
         * same nodes stay in $animatingNodes frame-to-frame), so without
         * this the outlines would keep their stale positions after the
         * editor reflows (a tile opens, zoom changes, etc.). */
        editorWidth;
        editorHeight;
        zoom;
        outlineRevision;
        if ($highlights)
            tick().then(() => {
                outlines = updateOutlines(
                    $highlights,
                    true,
                    $locales.getDirection() === 'rtl',
                    $blocks,
                    getNodeView,
                    outlineRowsCache,
                );
            });
        /** Remove the caret selection if in blocks mode and its a range. */
        if ($blocks && $caret.isRange())
            caret.set($caret.withPosition($caret.position[1]));
    });

    // When the caret changes, and it's a range, compute a range highlight.
    let rangeHighlight: Outline | undefined = $derived(
        $caret.isRange()
            ? getRangeOutline(
                  $caret.source,
                  $caret.position[0],
                  $caret.position[1],
                  getNodeView,
                  true,
                  $locales.getDirection() === 'rtl',
                  $blocks,
              )
            : undefined,
    );

    // The current search match ranges (grapheme [start, end) in source text),
    // or empty when search is closed or the query is blank. A pure model
    // computation shared by the highlight outlines, match navigation, and the
    // replace UI.
    let searchMatches = $derived(
        searchActive && searchQuery.trim().length > 0
            ? getSearchMatches(source, searchQuery, $locales.getLanguages())
            : [],
    );

    // Auto-expand: compute the effective folded set as `folded` minus nodes that
    // should temporarily render expanded — because the debugger stepped into
    // them, or a search match is inside them. They re-fold once the trigger
    // moves away. Caret placement and highlights deliberately do NOT auto-expand
    // (folding is manual); only stepping and search reveal folded code.
    $effect(() => {
        const f = $folded;
        const step = projectStepNode;
        const matches = searchMatches;
        untrack(() => {
            const next = new Set<Node>();
            for (const node of f) {
                // Stepped into?
                if (step && (node === step || node.contains(step))) continue;
                // A search match inside the node's text range?
                if (matches.length > 0) {
                    const start = source.getNodeFirstPosition(node);
                    const end = source.getNodeLastPosition(node);
                    if (
                        start !== undefined &&
                        end !== undefined &&
                        matches.some((m) => m.start < end && m.end > start)
                    )
                        continue;
                }
                next.add(node);
            }
            const cur = get(effectiveFolded);
            if (next.size !== cur.size || [...next].some((n) => !cur.has(n)))
                effectiveFolded.set(next);
        });
    });

    // Outlines for the editor search: one clipped range outline per matched
    // substring, using the same getRangeOutline machinery as the range
    // selection above so it highlights just the matched text and works in
    // blocks mode. Recomputed after render (tick) and on the same
    // layout-affecting state as the node outlines, so matches track reflows
    // (zoom, resize, blocks toggle, sequence expand/collapse).
    let searchOutlines = $state<Outline[]>([]);
    $effect(() => {
        // Track the matches and layout-affecting state.
        const matches = searchMatches;
        $blocks;
        editorWidth;
        editorHeight;
        zoom;
        outlineRevision;
        const rtl = $locales.getDirection() === 'rtl';
        if (matches.length === 0) {
            searchOutlines = [];
            return;
        }
        tick().then(() => {
            searchOutlines = matches
                .map((match) =>
                    getRangeOutline(
                        source,
                        match.start,
                        match.end,
                        getNodeView,
                        true,
                        rtl,
                        $blocks,
                    ),
                )
                .filter((outline): outline is Outline => outline !== undefined);
        });
    });

    // When the query changes, move the caret to the first match so the user
    // lands on a result; the caret's own scroll-into-view (CaretView) brings it
    // on screen if it was scrolled off. Tracks only the query/active — not the
    // caret — so navigating with the next-match command doesn't re-trigger this
    // and snap back to the first.
    $effect(() => {
        const active = searchActive;
        const query = searchQuery.trim();
        if (!active || query.length === 0) return;
        untrack(() => {
            if (searchMatches.length > 0)
                caret.set($caret.withPosition(searchMatches[0].start));
        });
    });

    // When search closes, return focus to the editor — closing always comes
    // from an explicit toggle (button, command, or Cmd/Ctrl+F in the field),
    // and the field or toggle button held focus, so without this it would fall
    // to the body. Track the previous value with a plain (non-reactive) flag so
    // this only fires on a true→false transition, not on mount.
    let searchWasActive = false;
    $effect(() => {
        const active = searchActive;
        if (searchWasActive && !active)
            // Wait for the field to unmount before refocusing.
            tick().then(() =>
                grabFocus('Returning focus to editor after closing search.'),
            );
        searchWasActive = active;
    });

    // When the caret changes in block mode and the editor is focused, see if we need to focus a token widget.
    $effect(() => {
        if ($blocks && $caret && focused) {
            if ($caret.isNode() && $caret.position instanceof Token) {
                const token = $caret.position;
                const widget = editor?.querySelector(
                    `.token-editor[data-id="${token.id}"]`,
                );
                if (widget instanceof HTMLElement) {
                    setKeyboardFocus(
                        widget,
                        'Focusing token editor after caret or focus change',
                    );
                }
            }
        }
    });
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window onblur={handleRelease} />

<!--
    iOS Safari preserves document.activeElement across a backgrounded tab
    (switching apps, locking the device, etc.) even though the on-screen
    keyboard is gone. On return, the next tap calls grabFocus(), but
    setKeyboardFocus's "already focused" short-circuit then skips .focus()
    so the keyboard never reappears — until the user taps something else
    first to move activeElement off the textarea. Blurring on visibility
    change resets the state so the next tap re-focuses cleanly.
-->
<svelte:document
    onvisibilitychange={() => {
        if (document.hidden && input && document.activeElement === input)
            input.blur();
    }}
/>

<!--
    Has ARIA role text box to allow keyboard keys to go through
    All NodeViews are set to role="presentation"
    We use the live region above
-->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    data-testid="editor"
    class="editor {$evaluation !== undefined && $evaluation.playing
        ? 'playing'
        : 'stepping'}"
    class:readonly={!editable}
    class:focused
    class:dragging={dragCandidate !== undefined || $dragged !== undefined}
    class:invalid-drop={$dragged !== undefined &&
        (!editable || !validDropTarget)}
    class:density-compact={$blockDensity === 'compact'}
    class:density-spacious={$blockDensity === 'spacious'}
    class:wrap={$wrap && !$blocks}
    data-uiid="editor"
    role="application"
    style:--zoom={`${zoom}pt`}
    aria-label={`${$locales.getPlainText((l) => l.ui.source.label)} ${$locales.getName(
        source.names,
    )}`}
    dir={$locales.getDirection()}
    data-id={source.id}
    bind:this={editor}
    bind:clientWidth={editorWidth}
    bind:clientHeight={editorHeight}
    onpointerdown={handlePointerDown}
    onpointerup={handleRelease}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    onmousedown={(event) => {
        // iOS Safari fires synthetic mousedown after a touchend even though
        // we handled the gesture via pointer events, and the default action
        // of that synthetic mousedown blurs the (programmatically focused)
        // textarea — which is what dismisses the on-screen keyboard a
        // moment after a tap. Calling preventDefault here cancels that
        // focus side-effect. Real mouse/pen mousedown is already suppressed
        // by the preventDefault on pointerdown, so the only events that
        // reach this handler in practice are the touch-synthesized ones.
        event.preventDefault();
    }}
    onkeydown={handleKeyDown}
    onfocusin={() => {
        // If the active element is a widget for a token in this editor's source,
        // set the caret to that token.
        if (
            $blocks &&
            document.activeElement &&
            document.activeElement instanceof HTMLElement &&
            document.activeElement.classList.contains('token-editor')
        ) {
            const widget = document.activeElement;
            const id = widget.dataset.id;
            if (id !== undefined) {
                const node = source.getNodeByID(parseInt(id));
                if (node !== undefined) {
                    caret.set($caret.withPosition(node));
                }
            }
        }
    }}
>
    {#if rangeHighlight}
        <Highlight
            outline={rangeHighlight}
            underline={rangeHighlight}
            types={['selected']}
            above={false}
        />
    {/if}

    <!-- Render highlights below the code -->
    {#each outlines as outline}
        <Highlight
            {...outline}
            above={false}
            types={outline.types}
            ignored={shakeCaret}
        />
    {/each}
    <!--
        If the caret is a position, render the invisible text field that allows us to capture inputs
        We put it here, before rendering the code, so anything focusable in the code comes after this.
        That way, all controls are just a tab away.
    -->
    <textarea
        id={getInputID()}
        data-defaultfocus
        aria-autocomplete="none"
        aria-label={$locales.getPlainText((l) => l.ui.edit.area)}
        autocomplete="off"
        autocapitalize="none"
        spellcheck="false"
        class="keyboard-input"
        class:composing
        style:left={caretLocation ? `${caretLocation.left}px` : null}
        style:top={caretLocation ? `${caretLocation.top}px` : null}
        bind:this={input}
        oninput={handleTextInput}
        oncompositionstart={handleCompositionStart}
        oncompositionend={handleCompositionEnd}
        onpaste={handlePaste}
        onfocusin={() => (focused = true)}
        onfocusout={() => {
            focused = false;
            // If we're composing and lose focus, end the composition.
            if (composing) handleCompositionEnd();
        }}
    ></textarea>
    <!-- Render the program -->
    <RootView
        node={source}
        spaces={source.spaces}
        {locale}
        caret={$caret}
        {editable}
        blocks={$blocks}
        lines={$showLines}
        inline={false}
    />
    <!-- Render highlights above the code -->
    {#each outlines as outline}
        <Highlight
            {...outline}
            types={outline.types}
            above={true}
            ignored={shakeCaret}
        />
    {/each}
    <!-- If a range outline, rander it -->
    {#if rangeHighlight}
        <Highlight
            outline={rangeHighlight}
            underline={rangeHighlight}
            types={['selected']}
            above={true}
            ignored={shakeCaret}
        />
    {/if}
    <!-- Render search match outlines above the code so they stay visible
         over opaque token blocks in blocks mode. -->
    {#each searchOutlines as outline}
        <Highlight
            {outline}
            underline={outline}
            types={['search']}
            above={true}
        />
    {/each}

    <!-- Render the caret on top of the program -->
    <CaretView
        caret={$caret}
        blocks={$blocks}
        {editable}
        blink={$keyboardEditIdle === IdleKind.Idle &&
            focused &&
            editable &&
            restoredPosition === undefined &&
            !caretSetByPointer}
        ignored={shakeCaret}
        {getTokenViews}
        viewport={editor}
        viewportWidth={editorWidth}
        viewportHeight={editorHeight}
        {zoom}
        placedByPointer={caretSetByPointer}
        bind:location={caretLocation}
    />
    <!-- Floating per-peer caret overlays, anchored to token positions in
         this source. Always mounted because CRDT is always-on, but the
         component renders nothing when no remote peers are publishing
         presence here — so a solo user sees no overlay chrome. -->
    <RemoteCaretOverlay
        projectID={project.getID()}
        sourceIndex={project.getIndexOfSource(source)}
        {source}
        viewport={editor}
        blocks={$blocks}
        {getNodeView}
        rtl={$locales.getDirection() === 'rtl'}
    />
    <!--
        This is a localized description of the current caret position, a live region for screen readers,
        and a visual label for sighted folks.
     -->
    {#key displayedCaret.position}
        {@const descriptionLeft =
            caretLocation === undefined
                ? undefined
                : Math.min(caretLocation.left)}
        {@const descriptionTop =
            caretLocation === undefined
                ? undefined
                : Math.min(caretLocation.bottom)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="caret-description"
            class:ignored={shakeCaret}
            class:visible={(($keyboardEditIdle === IdleKind.Idle ||
                !deferDisplayUpdate) &&
                displayedCaret.isNode()) ||
                keyIgnoredReason !== undefined}
            onpointerdown={(event) => event.stopPropagation()}
            bind:this={descriptionElement}
            style:left={descriptionPos
                ? `${descriptionPos.left}px`
                : descriptionLeft
                  ? `calc(${descriptionLeft}px - ${OutlinePadding}px)`
                  : undefined}
            style:top={descriptionPos
                ? `${descriptionPos.top}px`
                : descriptionTop
                  ? `${descriptionTop}px`
                  : undefined}
            data-left={descriptionPos ? descriptionPos.left : descriptionLeft}
            >{#if displayedCaret.position instanceof Node}
                {@const relevantConcept = concepts?.getRelevantConcept(
                    displayedCaret.position,
                )}
                <span class="node-label">
                    <!-- Make a link to the node's documentation -->
                    {#if relevantConcept}<ConceptLinkUI
                            link={relevantConcept}
                            label={DOCUMENTATION_SYMBOL}
                        />{/if}
                    <!-- Show the node's label and type -->
                    {displayedCaret.position.getLabel(
                        $locales,
                    )}{#if displayedCaretExpressionType}&nbsp;{TYPE_SYMBOL}&nbsp;{displayedCaretExpressionType.toWordplay()}{/if}
                    {#if editable}<MenuTrigger
                            anchor={displayedCaret.position}
                        />{/if}
                </span>{#if !(displayedCaret.position instanceof Token)}<em
                        class="node-description"
                        >{displayedCaret.position
                            .getDescription($locales, context)
                            .toText()}</em
                    >{/if}{/if}{#if keyIgnoredReason}<em>
                    &nbsp;<LocalizedText path={keyIgnoredReason} /></em
                >{/if}</div
        >
    {/key}
    {#if !editable}<span class="readonly-indicator" aria-hidden="true"
            ><Emoji text="🔒" /></span
        >{/if}
    <!-- Editor controls cluster: a single container pinned to the editor's
         top-right corner that stacks floating controls vertically (search on
         top, optional output preview below). A flex column means controls
         reflow rather than overlap, and new controls are just more children.
         The inner panel paints an always-visible bordered card that grows as
         controls appear or the search field expands. -->
    {#if searchable || (multipleSourcesVisible && setOutputPreview)}
        <div class="editor-controls">
            <div class="editor-controls-panel">
                <!-- Floating search: a magnifying-glass toggle that reveals a
                     query field. Matched substrings are highlighted via
                     searchOutlines above the code. Only the ProjectView editor. -->
                {#if searchable}
                    <EditorSearch
                        bind:active={searchActive}
                        bind:query={searchQuery}
                        matchCount={searchMatches.length}
                        next={goToNextMatch}
                        {replace}
                    />
                {/if}
                {#if multipleSourcesVisible && setOutputPreview}
                    <OutputPreview
                        {project}
                        {evaluator}
                        {source}
                        {selected}
                        select={setOutputPreview}
                    />
                {/if}
            </div>
        </div>
    {/if}
</div>

<style>
    .editor {
        white-space: nowrap;
        line-height: var(--wordplay-code-line-height);
        position: relative;
        user-select: none;
        padding: var(--wordplay-spacing);
        flex: 1;
        cursor: text;
        margin-bottom: auto;
        min-width: fit-content;
        min-height: fit-content;
        display: flex;
        flex-direction: column;
        gap: 0;
        font-size: calc(var(--wordplay-font-size) + var(--zoom));
    }

    /* Soft-wrap (text mode): break long lines at the token boundaries marked by
       <wbr> in Space.svelte, constraining the editor to the tile width instead of
       overflowing horizontally. pre-wrap preserves the explicit <br> newlines and
       leading-whitespace indentation. */
    .editor.wrap {
        white-space: pre-wrap;
        min-width: 0;
    }

    .readonly-indicator {
        position: absolute;
        top: 0;
        left: var(--wordplay-spacing-half);
        pointer-events: none;
        font-size: 0.75em;
        line-height: 1;
    }

    .editor.dragging {
        touch-action: none;
        cursor: grabbing;
    }

    /* During a drag, force one cursor across the whole editor subtree. Without this, per-node cursors
       (e.g. NodeView's `grab` on hover, which has high specificity) override the editor's drag cursor,
       so the affordance — especially no-drop over an invalid target — never appears. */
    .editor.dragging :global(*) {
        cursor: grabbing !important;
    }

    /* Over an invalid drop location — a blocked target, empty space, or a read-only editor — show that
       releasing here won't drop. */
    .editor.dragging.invalid-drop,
    .editor.dragging.invalid-drop :global(*) {
        cursor: no-drop !important;
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        caret-color: transparent;
        opacity: 0;
        width: 1px;
        height: 1em;
        pointer-events: none;
        touch-action: none;
        resize: none;
        overflow: hidden;
        font-size: 16px; /* Prevents Safari from zooming on input focus */

        /* Helpful for debugging */
        /* outline: 1px solid red;
        opacity: 1;
        width: 10px; */
    }

    /* While an IME composition is in progress the textarea must be visible so the
       candidate window anchors to it. Style it to read as inline code at the caret
       (matching the editor's font, size, and color) instead of the browser's
       default white box painted over the program (#1054). */
    .keyboard-input.composing {
        opacity: 1;
        width: auto;
        height: auto;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        caret-color: var(--wordplay-foreground);
        font-family: var(--wordplay-code-font);
        font-size: calc(var(--wordplay-font-size) + var(--zoom));
        line-height: var(--wordplay-code-line-height);
        z-index: 1;
    }

    .caret-description {
        position: absolute;
        background: var(--wordplay-highlight-color);
        color: var(--wordplay-background);
        /* border:  var(--wordplay-border-width) solid var(--wordplay-border-color); */
        padding-left: var(--wordplay-spacing-half);
        padding-right: var(--wordplay-spacing-half);
        border-radius: var(--wordplay-border-radius);
        opacity: 0;
        display: flex;
        flex-direction: column;
    }

    .caret-description.visible {
        opacity: 1;
    }

    .caret-description.ignored {
        animation: shake calc(var(--animation-factor) * 250ms) linear;
    }

    .node-label {
        display: inline-flex;
        align-items: center;
        gap: var(--wordplay-spacing-half);
    }

    .node-description {
        display: block;
        font-size: var(--wordplay-small-font-size);
        opacity: 0.75;
    }

    /* Zero-height positioning shell pinned to the editor's top-right corner. It
       reserves no flex track (the code isn't pushed down) while its child panel
       overflows downward and paints above the code. */
    .editor-controls {
        position: sticky;
        top: 0;
        right: 0;
        align-self: flex-end;
        height: 0;
        overflow: visible;
        z-index: 1;
        /* Visually first (top) while staying last in DOM/tab order. */
        order: -1;
        /* Pull the card up through the editor's top padding so its top edge meets
           the editor viewport's top border (the tile header's lower border) at
           scroll-top, instead of floating one spacing below it. The matching
           positive margin-bottom cancels this in flex layout (net height 0), so
           the code's own top padding is unchanged. */
        margin-top: calc(-1 * var(--wordplay-spacing));
        margin-bottom: var(--wordplay-spacing);
    }

    /* The visible card: an always-on panel hanging from the top-right corner
       (top and right edges flush, a left/bottom border and rounded bottom-left
       inner corner). Controls stack top-to-bottom, right-aligned, with a gap, so
       they reflow as the search field expands rather than overlapping. */
    .editor-controls-panel {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: var(--wordplay-spacing);
        padding: var(--wordplay-spacing);
        background: var(--wordplay-background);
        border-left: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom: var(--wordplay-border-width) solid
            var(--wordplay-border-color);
        border-bottom-left-radius: var(--wordplay-border-radius);
    }

</style>
