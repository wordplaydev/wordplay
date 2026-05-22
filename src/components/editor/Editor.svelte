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
        handleKeyCommand,
    } from '@components/editor/commands/Commands';
    import { getInternalClipboard } from '@components/editor/commands/InternalClipboard';
    import interpret from '@components/editor/commands/interpret';
    import Highlight from '@components/editor/highlights/Highlight.svelte';
    import {
        type HighlightSpec,
        Highlights,
        getCaretHighlights,
        getDragHighlights,
        getProjectHighlights,
        getRangeOutline,
        updateOutlines,
    } from '@components/editor/highlights/Highlights';
    import {
        type Outline,
        OutlinePadding,
        type Rect,
    } from '@components/editor/highlights/outline';
    import MenuTrigger from '@components/editor/menu/MenuTrigger.svelte';
    import {
        getBlockInsertionPoint,
        getCaretPositionAt,
        getEmptyList,
        getNodeAt,
        getTextInsertionPointsAt,
    } from '@components/editor/pointer/PointerUtilities';
    import OutputView from '@components/output/OutputView.svelte';
    import {
        type EditorState,
        IdleKind,
        getAnimatingNodes,
        getAnnouncer,
        getConceptIndex,
        getConflicts,
        getDragged,
        getEditors,
        getEvaluation,
        getKeyboardEditIdle,
        getResetKeyboardIdle,
        getSelectedOutput,
        setCaret,
        setDragTarget,
        setEditor,
        setHighlights,
        setSetMenuAnchor,
    } from '@components/project/Contexts';
    import RootView from '@components/project/RootView.svelte';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';
    import Button from '@components/widgets/Button.svelte';
    import LocalizedText from '@components/widgets/LocalizedText.svelte';
    import type Conflict from '@conflicts/Conflict';
    import {
        DB,
        Projects,
        animationFactor,
        blockDensity,
        blocks,
        locales,
        showLines,
    } from '@db/Database';
    import Project from '@db/projects/Project';
    import Caret, {
        type CaretPosition,
        NegligibleConflicts,
        isCaretPosition,
    } from '@edit/caret/Caret';
    import {
        AssignmentPoint,
        InsertionPoint,
        dropNodeOnSource,
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
    import ExceptionValue from '@values/ExceptionValue';
    import { onMount, tick, untrack } from 'svelte';
    import { get, writable } from 'svelte/store';

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
        /** The locale to use for rending code */
        locale: Locale | null;
        /** The bindable menu the ProjectView displaying this editor should show. */
        menu?: Menu | undefined;
        /** The bindable conflicts to show based caret and mouse position. */
        conflictsOfInterest?: Conflict[];
        /** An preview function that shows this editor */
        setOutputPreview?: () => void;
        /** A function for updating conflicts of interest */
        updateConflicts?: (source: Source, conflicts: Conflict[]) => void;
        /** Whether the code was revised by another creator */
        overwritten?: boolean;
        /** Function to set large deletion notification for this editor */
        setLargeDeletionNotification?: (
            message: LocaleTextAccessor | null,
        ) => void;
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
        locale,
        menu = $bindable(undefined),
        conflictsOfInterest = $bindable([]),
        setOutputPreview,
        updateConflicts,
        overwritten = false,
        setLargeDeletionNotification,
        caretSnapshot = $bindable(undefined),
    }: Props = $props();

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    // We start at the saved caret position or 0. We also share it with parents through a bind.
    const caret = writable<Caret>(
        new Caret(
            source,
            project.getCaretPosition(source) ?? 0,
            undefined,
            undefined,
            undefined,
        ),
    );

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

    let restoredPosition: CaretPosition | undefined = $state(undefined);

    // A menu of potential transformations based on the caret position.
    const selection = getSelectedOutput();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();
    const keyboardEditIdle = getKeyboardEditIdle();
    const resetKeyboardIdle = getResetKeyboardIdle();
    const editors = getEditors();

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
        if (source) tokenViews = undefined;
    });

    /** True if something in the editor is focused. */
    let focused: boolean = $state(false);

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

    // A store of current insertion points in a drag.
    const insertion = writable<InsertionPoint | AssignmentPoint | undefined>(
        undefined,
    );
    setDragTarget(insertion);

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
        // Is the creator hovering over a valid drop target? If so, execute the edit.
        if (
            $dragged &&
            (($hovered &&
                isValidDropTarget(
                    project,
                    $dragged,
                    $hovered,
                    $insertion,
                    true,
                )) ||
                $insertion)
        )
            drop();

        // Release the dragged node.
        if (dragged) dragged.set(undefined);
        dragCandidate = undefined;
        dragPoint = undefined;
        dragStartPosition = undefined;

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

    function handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return;

        // A click is a discrete action — clear any defer flag left set by a
        // prior held-key flurry so the description block, editors-store
        // publish, and announcer all update immediately on the new caret
        // rather than waiting for the 1s idle timeout.
        deferDisplayUpdate = false;

        // Clear any existing large deletion notification when user clicks to clear selection
        setLargeDeletionNotification?.(null);
        event.preventDefault();
        event.stopPropagation();

        placeCaretAt(event);

        // After we handle the click, focus on keyboard input, in case it's not focused.
        grabFocus('Focusing editor on pointer down.');
    }

    function placeCaretAt(event: PointerEvent) {
        if (editor === null) return;

        // If the token is over an empty list, insertion point for that list.
        const empty = $blocks ? getEmptyList(source, event) : undefined;
        const tokenUnderPointer = getNodeAt(source, event, true);
        const nonTokenNodeUnderPointer = getNodeAt(source, event, false);
        const newPosition =
            // If there's an ampty position, use that.
            empty !== undefined
                ? empty
                : // If in blocks mode and over an editable text token, get the caret position
                  $blocks &&
                    tokenUnderPointer instanceof Token &&
                    Caret.isTokenTextBlockEditable(
                        tokenUnderPointer,
                        source.root.getParent(tokenUnderPointer),
                    )
                  ? getCaretPositionAt($caret, event, getTokenViews, $blocks)
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
                            $blocks,
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
            dragStartPosition !== undefined &&
            exceededDragThreshold(event)
        ) {
            // Dragging to select. What's under the pointer?
            const position = getCaretPositionAt(
                $caret,
                event,
                getTokenViews,
                $blocks,
            );
            // Only create a range if the pointer resolved to a different numeric character position.
            if (
                typeof position === 'number' &&
                !$blocks &&
                typeof dragStartPosition === 'number' &&
                position !== dragStartPosition
            ) {
                caret.set($caret.withPosition([dragStartPosition, position]));
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

        // Update insertion points if something is dragged and hovered isn't a placeholder.
        if (
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
                    $blocks,
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
                NegligibleConflicts,
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

        // Clear any existing large deletion notification since a new edit has started
        setLargeDeletionNotification?.(null);
        const previousSource = source;

        const navigation = edit instanceof Caret;

        // Get the new caret and source to display.
        let newCaret = navigation ? edit : edit[1];
        const newSource = navigation ? undefined : edit[0];

        // Always reset the 1s idle timer, even when the store value isn't
        // changing — the timer is what debounces "is the user still typing?".
        if (resetKeyboardIdle) resetKeyboardIdle();
        // Only fire the keyboardEditIdle store on actual transitions. Hitting
        // .set() with the same value still notifies every subscriber and
        // produces a fanout cascade across the project per keystroke.
        if (keyboardEditIdle && get(keyboardEditIdle) !== idle)
            keyboardEditIdle.set(idle);

        // See if the caret is inside a node that's currently being displayed as a value, and if
        // so, select the expression who's value is being displayed instead.
        // This coordinates with logic in NodeView.svelte, which decides when to render a value instead of a node.
        if ($evaluation && !$evaluation.playing) {
            const node = newCaret.getNodeInside();
            const parents = node
                ? [node, ...(project.getRoot(node)?.getAncestors(node) ?? [])]
                : [];
            const expressions = parents.filter(
                (n): n is Expression =>
                    n instanceof Expression && !n.isEvaluationInvolved(),
            );
            const valued = expressions
                .map((expr) => {
                    return {
                        expression: expr,
                        value: $evaluation.evaluator.getLatestExpressionValue(
                            expr,
                        ),
                    };
                })
                .filter((val) => val.value !== undefined);
            const expressionValue = valued.at(-1);

            // If we found a value being rendered
            if (expressionValue && expressionValue.value)
                newCaret = newCaret
                    .withPosition(expressionValue.expression)
                    .withEntry(undefined);
        }

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
            setLargeDeletionNotification?.(
                (l) => l.ui.source.cursor.largeDelete,
            );
        }

        // After everything is updated, if we were asked to focus the editor, focus it.
        await tick();
        if (focusAfter) grabFocus('Focusing editor after edit');
    }

    function grabFocus(message: string) {
        if (input) setKeyboardFocus(input, message);
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

        // Blocks mode? No text input support. It's all handled by text fields.
        if ($blocks) return;

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
        // If we receive a keyboard event that says
        if (composing && !event.isComposing) handleCompositionEnd();

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

            const edit = $caret.insert(
                interpret(internal),
                $blocks,
                project,
                false,
            );
            event.preventDefault();
            event.stopPropagation();
            if (typeof edit === 'function') setIgnored(edit);
            else handleEdit(edit, IdleKind.Typed, true);
            return;
        }

        const [command, result] = handleKeyCommand(event, {
            caret: $caret,
            project,
            editor: true,
            evaluator,
            dragging: $dragged !== undefined,
            database: DB,
            toggleMenu,
            blocks: $blocks,
            locales: $locales,
            view: editor,
            getTokenViews,
            clearLargeDeletionNotification: () =>
                setLargeDeletionNotification?.(null),
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
                handleEdit(result, idle, true);
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
        }
        untrack(() => updateConflicts?.(source, newConflictsOfInterest));

        // Finally, update the conflicts of interest.
        conflictsOfInterest = newConflictsOfInterest;
    });

    /** Announce symbol insertion (character echo) or caret position (navigation) to screen readers.
     *  WCAG 2.1 SC 4.1.3: status messages are conveyed via the live region in Announcer.svelte.
     *  On typing: announce the character that was inserted (character echo).
     *  On navigation: announce the cursor's contextual description. */
    $effect(() => {
        if ($announce && document.activeElement === input && $caret) {
            // Defer announcements during held-key/typing flurries. Screen readers
            // can't keep up with 30Hz updates anyway and the user gets a clear
            // announcement of the final position when the flurry settles.
            // caret.getDescription() does locale-template concretization and
            // string building per call, which adds up on long key holds.
            if (deferDisplayUpdate && $keyboardEditIdle !== IdleKind.Idle)
                return;
            // Read lastInsertedKey before entering untrack so the value is captured
            // at the time the reactive effect fires (i.e. after the caret update).
            const key = lastInsertedKey;
            untrack(() => {
                if (key !== undefined) {
                    // Character echo: announce only the typed symbol so the screen
                    // reader does not flood the user with position descriptions while typing.
                    $announce(sourceID, $caret.getLanguage(), key);
                } else {
                    // Navigation: announce the cursor's contextual description.
                    $announce(
                        sourceID,
                        $caret.getLanguage(),
                        $caret.getDescription(
                            caretExpressionType,
                            conflictsOfInterest,
                            context,
                        ),
                    );
                }
                // Reset so the next caret change (navigation) gets a position description.
                lastInsertedKey = undefined;
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
    $effect(() => {
        // Track every input but bail before recomputing if typing.
        const stepNode = projectStepNode;
        const exceptionNode = projectExceptionNode;
        const animating = $animatingNodes;
        const outputs = selectedOutputs;
        const inBlocks = $blocks;
        const _src = source;
        const _project = project;
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
        return getCaretHighlights(
            source,
            project,
            displayedCaret,
            $blocks,
            $animatingNodes,
        );
    });

    // Drag-derived slice. Skip when there is no drag/hover-select to avoid the
    // O(n) drop-target walk in getDragHighlights.
    let dragHighlights = $derived.by(() => {
        if ($dragged !== undefined || (selectingWithShift && !$blocks))
            return getDragHighlights(
                source,
                project,
                $dragged,
                $hovered,
                $insertion,
                $blocks,
                selectingWithShift,
            );
        return new Highlights();
    });

    // Merge the slices and publish only when the result actually changed.
    // Skipping the store set on no-op caret moves prevents updateOutlines, the
    // scroll effect, and every NodeView's highlight derived from re-running.
    $effect(() => {
        const newHighlights = Highlights.merge(
            projectHighlights,
            caretHighlights,
            dragHighlights,
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

    // While paused/stepping, each step can add or change the value rendered
    // inline next to an expression in NodeView, which shifts the layout.
    // Neither the source nor the highlight set changes, so the conflict
    // underline outlines would otherwise stay at their pre-step positions.
    // Refresh on every evaluator broadcast (it fires once per step) while not
    // playing. During play the !playing guard keeps this cheap.
    // Untrack the call: refreshHighlights does `outlineRevision++`, whose
    // implicit read would otherwise register outlineRevision as a dep of this
    // effect and the subsequent write would re-trigger us — infinite loop.
    $effect(() => {
        if ($evaluation !== undefined && !$evaluation.playing)
            untrack(refreshHighlights);
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
    class:overwritten
    class:dragging={dragCandidate !== undefined || $dragged !== undefined}
    class:density-compact={$blockDensity === 'compact'}
    class:density-spacious={$blockDensity === 'spacious'}
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
    onkeydown={handleKeyDown}
    ondblclick={(event) => {
        event.stopPropagation();
        let node = getNodeAt(source, event, true);
        if (node) caret.set($caret.withPosition(node));
    }}
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
            ><Emoji>🔒</Emoji></span
        >{/if}
    {#if project.getSupplements().length > 0 && setOutputPreview}
        <div class="output-preview-container">
            <Button
                tip={(l) => l.ui.source.button.selectOutput}
                active={!selected}
                action={setOutputPreview}
                scale={false}
            >
                <div
                    class="output-preview"
                    class:error={!selected &&
                        evaluator.getLatestSourceValue(source) instanceof
                            ExceptionValue}
                >
                    {#if selected}
                        <span style="font-size:200%"><Emoji>🎭</Emoji></span>
                    {:else}
                        <OutputView
                            {project}
                            {evaluator}
                            value={evaluator.getLatestSourceValue(source)}
                            mini
                            editable={false}
                        />
                    {/if}
                </div>
            </Button>
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
        gap: var(--wordplay-spacing);
        font-size: calc(var(--wordplay-font-size) + var(--zoom));
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

    .keyboard-input.composing {
        opacity: 1;
        width: auto;
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

    .output-preview-container {
        position: sticky;
        bottom: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        display: inline-block;
        align-self: flex-end;
    }

    .output-preview.error {
        background: var(--wordplay-error);
    }

    .output-preview {
        width: 5em;
        height: 5em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        background: var(--wordplay-background);
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /** A single cycle color animation to indicate the code was revised. */
    @keyframes overwritten {
        0% {
            background-color: var(--wordplay-highlight-color);
        }

        100% {
            background-color: var(--wordplay-background);
        }
    }

    .overwritten {
        animation: overwritten 1s;
        animation-iteration-count: 1;
    }
</style>
