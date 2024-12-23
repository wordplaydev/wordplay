<script module lang="ts">
    const SHOW_OUTPUT_IN_PALETTE = false;
</script>

<script lang="ts">
    import Node from '@nodes/Node';
    import Caret, { type CaretPosition } from '../../edit/Caret';
    import { onMount, untrack } from 'svelte';
    import UnicodeString from '@models/UnicodeString';
    import {
        handleKeyCommand,
        type Edit,
        type ProjectRevision,
        InsertSymbol,
    } from './util/Commands';
    import type Source from '@nodes/Source';
    import { writable } from 'svelte/store';
    import type Program from '@nodes/Program';
    import Token from '@nodes/Token';
    import CaretView, { type CaretBounds } from './CaretView.svelte';
    import {
        getDragged,
        getSelectedOutput,
        getAnimatingNodes,
        getConflicts,
        getEvaluation,
        getKeyboardEditIdle,
        IdleKind,
        getConceptIndex,
        getEditors,
        getAnnounce,
        setCaret,
        setEditor,
        setHovered,
        setInsertionPoint,
        setHighlights,
        setSetMenuNode,
    } from '../project/Contexts';
    import {
        type HighlightSpec,
        type Highlights,
        HighlightTypes,
        getHighlights,
        updateOutlines,
    } from './util/Highlights';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import TypePlaceholder from '@nodes/TypePlaceholder';
    import Sym from '@nodes/Sym';
    import RootView from '../project/RootView.svelte';
    import Project from '@models/Project';
    import type Conflict from '@conflicts/Conflict';
    import { tick } from 'svelte';
    import { getEditsAt } from '../../edit/Autocomplete';
    import { OutlinePadding, type Outline } from './util/outline';
    import Highlight from './Highlight.svelte';
    import {
        dropNodeOnSource,
        getInsertionPoint,
        InsertionPoint,
        isValidDropTarget,
    } from '../../edit/Drag';
    import Menu, { RevisionSet } from './util/Menu';
    import Evaluate from '@nodes/Evaluate';
    import type Evaluator from '@runtime/Evaluator';
    import { TAB_WIDTH } from '../../parser/Spaces';
    import PlaceholderView from './MenuTrigger.svelte';
    import Expression from '../../nodes/Expression';
    import { DOCUMENTATION_SYMBOL, TYPE_SYMBOL } from '../../parser/Symbols';
    import {
        DB,
        Projects,
        animationFactor,
        blocks,
        locales,
        showLines,
    } from '../../db/Database';
    import Button from '../widgets/Button.svelte';
    import OutputView from '../output/OutputView.svelte';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';
    import Emoji from '@components/app/Emoji.svelte';
    import { localized } from '../../db/Database';
    import ExceptionValue from '@values/ExceptionValue';
    import setKeyboardFocus from '@components/util/setKeyboardFocus';

    interface Props {
        /** The evaluator evaluating the source being edited. */
        evaluator: Evaluator;
        /** The project that contains the source being edited */
        project: Project;
        /** The source being edited */
        source: Source;
        /** The ID corresponding to which source this is in the project */
        sourceID: string;
        /** True if this editor's output is selected by the container. */
        selected: boolean;
        /** Whether to autofocus the editor */
        autofocus?: boolean;
        /** Whether the editor is editable */
        editable: boolean;
        /** The bindable menu the ProjectView displaying this editor should show. */
        menu?: Menu | undefined;
        /** The bindable conflicts to show based caret and mouse position. */
        conflictsOfInterest?: Conflict[];
        /** An preview function that shows this editor */
        setOutputPreview: () => void;
        /** A function for updating conflicts of interest */
        updateConflicts: (source: Source, conflicts: Conflict[]) => void;
        /** Whether the code was revised by another creator */
        overwritten?: boolean;
    }

    let {
        evaluator,
        project,
        source,
        sourceID,
        selected,
        autofocus = true,
        editable,
        menu = $bindable(undefined),
        conflictsOfInterest = $bindable([]),
        setOutputPreview,
        updateConflicts,
        overwritten = false,
    }: Props = $props();

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    // We start at the saved caret position or 0.
    const caret = writable<Caret>(
        new Caret(
            source,
            project.getCaretPosition(source) ?? 0,
            undefined,
            undefined,
            undefined,
        ),
    );

    // Share the caret store with children.
    setCaret(caret);

    // When source changes, update various nested state from the source.
    $effect(() => {
        caret.set(untrack(() => $caret).withSource(source));
    });

    let restoredPosition: CaretPosition | undefined = $state(undefined);

    // A menu of potential transformations based on the caret position.
    const selection = getSelectedOutput();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();
    const keyboardEditIdle = getKeyboardEditIdle();
    const editors = getEditors();

    /** Get the concept index context */
    const indexContext = getConceptIndex();

    /** The DOM node representing the text field for typing. */
    let input: HTMLTextAreaElement | null = $state(null);

    /** The DOM node representing the editor */
    let editor: HTMLElement | null = $state(null);

    /** True if something in the editor is focused. */
    let focused: boolean = $state(false);

    /** True if the editor was focused before the menu was shown, so we can know whether to restore it after hiding menu. */
    let wasFocusedBeforeMenu = $state(false);

    // A store of highlighted nodes, used by node views to highlight themselves.
    // We store centrally since the logic that determines what's highlighted is in the Editor.
    const highlights = writable<Highlights>(new Map());
    setHighlights(highlights);

    // A store of what node is hovered over, excluding tokens, used in drag and drop.
    const hovered = writable<Node | undefined>(undefined);
    setHovered(hovered);

    // A store of what node is hovered over, including tokens.
    const hoveredAny = writable<Node | undefined>(undefined);

    // A store of current insertion points in a drag.
    const insertion = writable<InsertionPoint | undefined>(undefined);
    setInsertionPoint(insertion);

    // A store of the handle edit function
    const editContext = writable({
        edit: handleEdit,
        caret: $caret,
        blocks: $blocks,
        project,
        focused: false,
        toggleMenu,
        grabFocus,
    });
    setEditor(editContext);

    // True if the last keyboard input was not handled by a command.
    let lastKeyDownIgnored = $state(false);

    // Caret location comes from the caret
    let caretLocation: CaretBounds | undefined = $state(undefined);

    // The store the contains the current node being dragged.
    let dragged = getDragged();

    // The point at which a drag started.
    let dragPoint: { x: number; y: number } | undefined = $state(undefined);

    // The possible candidate for dragging
    let dragCandidate: Node | undefined = $state(undefined);

    // Whenever the caret changes, update it's announcements.
    const announce = getAnnounce();

    // True when the last key was ignored and we're not debugging.
    let shakeCaret = $derived(
        $evaluation !== undefined &&
            $evaluation.playing === true &&
            lastKeyDownIgnored,
    );

    function setMenuNode(position: CaretPosition | undefined) {
        if (
            position !== undefined &&
            (menu === undefined || $caret.position !== position)
        ) {
            caret.set($caret.withPosition(position));
            showMenu();
        } else hideMenu();
    }

    // A store of the currently requested node for which to show a menu.
    const menuNode =
        writable<(position: CaretPosition | undefined) => void>(setMenuNode);
    setSetMenuNode(menuNode);

    // Focus the editor on mount, if autofocus is on.
    onMount(() =>
        autofocus ? grabFocus('Auto-focusing editor on mount.') : undefined,
    );

    // After updates, update highlight outlines.
    $effect(() => {
        $highlights;
        $locales;
        $caret;
        editor;

        untrack(() => {
            tick().then(() => {
                // Optimization: add and remove classes for styling here rather than having them
                // retrieved in each NodeView.
                if (editor) {
                    // Remove any existing highlights
                    for (const highlighted of editor.querySelectorAll(
                        '.highlighted',
                    ))
                        for (const highlightType of Object.keys(HighlightTypes))
                            highlighted.classList.remove(highlightType);

                    // Add any new highlights of highlighted nodes.
                    for (const [node, types] of $highlights.entries()) {
                        const view = getNodeView(node);
                        if (view) {
                            view.classList.add('highlighted');
                            for (const type of types) view.classList.add(type);
                        }
                    }
                }
            });
        });
    });

    async function evalUpdate() {
        // No evaluator, or we're playing? No need to update the eval editor info.
        if (evaluator === undefined || evaluator.isPlaying()) return;

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

    function setIgnored(ignored: boolean) {
        if (ignored) {
            lastKeyDownIgnored = true;
            // Flip back to unignored after the animation so we can give more feedback.
            setTimeout(
                () => (lastKeyDownIgnored = false),
                $animationFactor * 250,
            );
        } else lastKeyDownIgnored = false;
    }

    function getNodeView(node: Node): HTMLElement | undefined {
        if (editor === null) return undefined;
        // See if there's a node or value view that corresponds to this node.
        const view =
            editor.querySelector(`.node-view[data-id="${node.id}"]`) ??
            document.querySelector(
                `.value[data-id="${evaluator.getCurrentValue()?.id}"]`,
            );
        return view instanceof HTMLElement ? view : undefined;
    }

    function getTokenByView(program: Program, tokenView: Element) {
        if (
            tokenView instanceof HTMLElement &&
            tokenView.dataset.id !== undefined
        ) {
            const node = program.getNodeByID(parseInt(tokenView.dataset.id));
            return node instanceof Token ? node : undefined;
        }
        return undefined;
    }

    async function ensureElementIsVisible(element: Element, nearest = false) {
        // Scroll to the element. Note that we don't set "smooth" here because it break's Chrome's ability to horizontally scroll.
        element.scrollIntoView({
            block: nearest ? 'nearest' : 'center',
            inline: nearest ? 'nearest' : 'center',
        });
    }

    function handleRelease() {
        // Is the creator hovering over a valid drop target? If so, execute the edit.
        if (isValidDropTarget(project, $dragged, $hovered, $insertion)) drop();

        // Release the dragged node.
        if (dragged) dragged.set(undefined);
        dragCandidate = undefined;
        dragPoint = undefined;

        // Reset the insertion points.
        insertion.set(undefined);
    }

    async function drop() {
        if ($dragged === undefined) return;
        if ($hovered === undefined && $insertion === undefined) return;

        const [newProject, newSource, droppedNode] = dropNodeOnSource(
            project,
            source,
            $dragged,
            $hovered ?? ($insertion as Node | InsertionPoint),
        ) ?? [undefined, undefined];

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
        event.preventDefault();
        event.stopPropagation();

        placeCaretAt(event);

        // After we handle the click, focus on keyboard input, in case it's not focused.
        grabFocus('Focusing editor on pointer down.');
    }

    function placeCaretAt(event: PointerEvent) {
        const tokenUnderPointer = getNodeAt(event, true);
        const nonTokenNodeUnderPointer = getNodeAt(event, false);
        const newPosition =
            // If shift is down or in blocks mode, select the non-token node at the position.
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
                    getCaretPositionAt(event);

        // If we found a position, set it.
        if (newPosition !== undefined)
            caret.set($caret.withPosition(newPosition));

        // Mark that the creator might want to drag the node under the mouse and remember where the click started.
        dragPoint = undefined;
        if (editable && nonTokenNodeUnderPointer) {
            dragCandidate = nonTokenNodeUnderPointer;
            // If the primary mouse button is down, start dragging and set insertion.
            // We don't actually start dragging until the cursor has moved more than a certain amount since last click.
            if (dragCandidate && event.buttons === 1) {
                dragPoint = { x: event.clientX, y: event.clientY };
                event.preventDefault();
                event.stopPropagation();
                if (editor) editor.style.touchAction = 'none';
            }
        }
    }

    function getNodeAt(
        event: PointerEvent | MouseEvent,
        includeTokens: boolean,
    ) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        // Only return a node if hovering over its text. Space isn't eligible.
        if (el instanceof HTMLElement) {
            const nodeView = el.closest(
                `.node-view${includeTokens ? '' : `:not(.Token)`}`,
            );
            if (nodeView instanceof HTMLElement && nodeView.dataset.id) {
                return source.expression.getNodeByID(
                    parseInt(nodeView.dataset.id),
                );
            }
        }
        return undefined;
    }

    function getTokenFromElement(
        textOrSpace: Element,
    ): [Token, Element] | undefined {
        const tokenView = textOrSpace.closest(`.Token`);
        const token =
            tokenView === null
                ? undefined
                : getTokenByView($caret.getProgram(), tokenView);
        return tokenView === null || token === undefined
            ? undefined
            : [token, tokenView];
    }

    function getTokenFromLineBreak(
        textOrSpace: Element,
    ): [Token, Element] | undefined {
        const spaceView = textOrSpace.closest('.space') as HTMLElement;
        const tokenID =
            spaceView instanceof HTMLElement && spaceView.dataset.id
                ? parseInt(spaceView.dataset.id)
                : undefined;
        const node = tokenID ? source.getNodeByID(tokenID) : undefined;
        return node instanceof Token ? [node, spaceView] : undefined;
    }

    function getCaretPositionAt(event: PointerEvent): number | undefined {
        // What element is under the mouse?
        const elementAtCursor = document.elementFromPoint(
            event.clientX,
            event.clientY,
        );

        // If there's no element (which should be impossible), return nothing.
        if (elementAtCursor === null) return undefined;
        if (editor === null) return undefined;

        // If we've selected a token view, figure out what position in the text to place the caret.
        if (elementAtCursor.classList.contains('token-view')) {
            // Find the token this corresponds to.
            const [token, tokenView] =
                getTokenFromElement(elementAtCursor) ?? [];
            // If we found a token, find the position in it corresponding to the mouse position.
            if (
                token instanceof Token &&
                tokenView instanceof Element &&
                event.target instanceof Element
            ) {
                const startIndex = $caret.source.getTokenTextPosition(token);
                const lastIndex = $caret.source.getTokenLastPosition(token);
                if (startIndex !== undefined && lastIndex !== undefined) {
                    // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
                    const targetRect = event.target.getBoundingClientRect();
                    const tokenRect = elementAtCursor.getBoundingClientRect();
                    const offset =
                        event.offsetX + (targetRect.left - tokenRect.left);
                    const newPosition = Math.max(
                        startIndex,
                        Math.min(
                            lastIndex,
                            startIndex +
                                (tokenRect.width === 0
                                    ? 0
                                    : Math.round(
                                          token.getTextLength() *
                                              (offset / tokenRect.width),
                                      )),
                        ),
                    );
                    return newPosition;
                }
            }
        }

        // If the element at the cursor is inside space, choose the space.
        // This depends tightly on the spaces rendered in Space.svelte and
        // NodeView.svelte, when in blocks mode.
        const spaceView = elementAtCursor.closest('.space');
        if (spaceView instanceof HTMLElement) {
            const tokenID = spaceView.dataset.id
                ? parseInt(spaceView.dataset.id)
                : null;
            const token =
                tokenID !== null && !isNaN(tokenID)
                    ? source.getNodeByID(tokenID)
                    : null;
            if (token instanceof Token) {
                const space = source.spaces.getSpace(token);
                // We only choose this position if doesn't contain newlines (we handle those below).
                if (!space.includes('\n')) {
                    const tokenView = getNodeView(token);
                    const spacePosition = source.getTokenSpacePosition(token);
                    if (tokenView && spacePosition !== undefined) {
                        const spaceRect = spaceView.getBoundingClientRect();
                        const percent =
                            (spaceRect.width -
                                (tokenView.getBoundingClientRect().left -
                                    event.clientX)) /
                            spaceRect.width;

                        return Math.round(
                            spacePosition +
                                percent *
                                    space.replace('\t', ' '.repeat(TAB_WIDTH))
                                        .length,
                        );
                    }
                }
            }
        }

        // Otherwise, the pointer is over the editor.
        // Find the closest token and choose either it's right or left side.
        // Map the token text to a list of vertical and horizontal distances
        const closestToken = Array.from(editor.querySelectorAll('.token-view'))
            .map((tokenView) => {
                const textRect = tokenView.getBoundingClientRect();
                return {
                    view: tokenView,
                    textDistance:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : Math.abs(
                                  event.clientY -
                                      (textRect.top + textRect.height / 2),
                              ),
                    textLeft:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : textRect.left,
                    textRight:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : textRect.right,
                    textTop:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : textRect.top,
                    textBottom:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : textRect.bottom,
                    leftDistance:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : Math.abs(event.clientX - textRect.left),
                    rightDistance:
                        textRect === undefined
                            ? Number.POSITIVE_INFINITY
                            : Math.abs(event.clientX - textRect.right),
                    hidden: tokenView.closest('.hide') !== null,
                };
            })
            // Filter by tokens within the vertical boundaries of the token.
            .filter(
                (text) =>
                    !text.hidden &&
                    text.textDistance !== Number.POSITIVE_INFINITY &&
                    event.clientY >= text.textTop &&
                    event.clientY <= text.textBottom,
            )
            // Sort by increasing horizontal distance from the pointer
            .sort(
                (a, b) =>
                    Math.min(a.leftDistance, a.rightDistance) -
                    Math.min(b.leftDistance, b.rightDistance),
            )[0]; // Choose the closest.

        // If we found one, choose either the beginnng or end of the line.
        if (closestToken) {
            const [token] = getTokenFromElement(closestToken.view) ?? [];
            if (token === undefined) return undefined;

            return closestToken.textRight < event.clientX
                ? source.getEndOfTokenLine(token)
                : source.getStartOfTokenLine(token);
        }

        // Otherwise, if the mouse wasn't within the vertical bounds of the nearest token text, choose the nearest empty line.
        type BreakInfo = {
            token: Token;
            offset: number;
            index: number;
            view: HTMLElement;
        };

        // Find all tokens with empty lines and choose the nearest.
        const closestLine =
            // Find all of the token line breaks, which are wrapped in spans to enable consistent measurement.
            // This is because line breaks and getBoundingClientRect() are jumpy depending on what's around them.
            Array.from(editor.querySelectorAll('.space .break'))
                // Map each one to 1) the token, 2) token view, 3) line break top, 4) index within each token's space
                .map((br) => {
                    const [token, tokenView] = getTokenFromLineBreak(br) ?? [];
                    // Check the br container, which gives us a more accurate bounding client rect.
                    const rect = br.getBoundingClientRect();
                    if (tokenView === undefined || token === undefined)
                        return undefined;
                    return {
                        token,
                        offset: Math.abs(
                            rect.top + rect.height / 2 - event.clientY,
                        ),
                        // Find the index of the break in the space view.
                        index: Array.from(
                            tokenView.querySelectorAll('.break'),
                        ).indexOf(br),
                        view: br as HTMLElement,
                    };
                })
                // Filter out any empty breaks that we couldn't find
                .filter<BreakInfo>(
                    (br: BreakInfo | undefined): br is BreakInfo =>
                        br !== undefined,
                )
                // Sort by increasing offset from mouse y
                .sort((a, b) => a.offset - b.offset)[0]; // Chose the closest

        // If we have a closest line, find the line number
        if (closestLine) {
            // Find the space view of the closest line.

            // Compute the horizontal position at which to place the caret.
            // Find the width of a single space by finding the longest line,
            // which determines its width.
            const spaceView = closestLine.view.closest('.space');
            const spaceBounds = spaceView?.getBoundingClientRect();
            const tokenSpace = source.spaces.getSpace(closestLine.token);
            let spaceWidth =
                (spaceBounds?.width ?? 0) /
                Math.max.apply(
                    null,
                    tokenSpace
                        .replaceAll('\t', ' '.repeat(TAB_WIDTH))
                        .split('\n')
                        .map((s) => s.length),
                );
            if (isNaN(spaceWidth) || spaceWidth === Infinity) spaceWidth = 0;

            // Offset the caret position by the number of spaces from the edge that was clicked.
            let positionOffset = spaceBounds
                ? Math.round(
                      Math.abs(
                          event.clientX -
                              ($locales.getDirection() === 'ltr'
                                  ? spaceBounds.left
                                  : spaceBounds.right),
                      ) / spaceWidth,
                  )
                : 0;
            if (isNaN(positionOffset) || positionOffset === Infinity)
                positionOffset = 0;

            const index = $caret.source.getTokenSpacePosition(
                closestLine.token,
            );

            // Figure out where on the line to place the insertion point based on the line index
            return index !== undefined
                ? index +
                      tokenSpace.split('\n', closestLine.index).length +
                      positionOffset
                : undefined;
        }

        // Otherwise, choose the last position if nothing else matches.
        return source.getCode().getLength();
    }

    function getInsertionPointsAt(event: PointerEvent) {
        // Is the caret position between tokens?
        // If so, are any of the token's parents inside a list in which we could insert something?
        const position = getCaretPositionAt(event);

        // If we found a position, find what's between.
        if (position !== undefined) {
            // Create a caret for the position and get the token it's at.
            const caret = new Caret(
                source,
                position,
                undefined,
                undefined,
                undefined,
            );
            const token = caret.getToken();
            if (token === undefined) return [];

            // What is the space prior to this insertion point?
            const index = source.getTokenSpacePosition(token);
            if (index === undefined) return [];

            // Find what space is prior.
            const spacePrior = source.spaces
                .getSpace(token)
                .substring(0, position - index);

            // How many lines does the space prior include?
            const line = spacePrior.split('\n').length - 1;

            // What nodes are between this and are any of them insertion points?
            const { before, after } = caret.getNodesBetween();

            // If there are nodes between the point, construct insertion points
            // that exist in lists.
            return (
                [
                    ...before.map((tree) =>
                        getInsertionPoint(source, tree, false, token, line),
                    ),
                    ...after.map((tree) =>
                        getInsertionPoint(source, tree, true, token, line),
                    ),
                ]
                    // Filter out duplicates and undefineds
                    .filter<InsertionPoint>(
                        (
                            insertion1: InsertionPoint | undefined,
                            i1,
                            insertions,
                        ): insertion1 is InsertionPoint =>
                            insertion1 !== undefined &&
                            insertions.find(
                                (insertion2, i2) =>
                                    i1 > i2 &&
                                    insertion1 !== insertion2 &&
                                    insertion2 !== undefined &&
                                    insertion1.equals(insertion2),
                            ) === undefined,
                    )
            );
        }
        return [];
    }

    function exceededDragThreshold(event: PointerEvent) {
        return (
            dragPoint !== undefined &&
            Math.sqrt(
                Math.pow(event.clientX - dragPoint.x, 2) +
                    Math.pow(event.clientY - dragPoint.y, 2),
            ) >= 5
        );
    }

    function handlePointerMove(event: PointerEvent) {
        if (evaluator === undefined) return;

        // Remove the touch action disabling now that we're moving.
        if (editor) editor.style.removeProperty('touchAction');

        // Handle an edit
        handleEditHover(event);

        // Hover debug stuff when paused.
        if (!evaluator.isPlaying()) handleDebugHover(event);
    }

    function handleEditHover(event: PointerEvent) {
        // By default, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(event, false));
        hoveredAny.set(getNodeAt(event, true));

        // If we have a drag candidate and it's past 5 pixels from the start point, set the insertion points to whatever points are under the mouse.
        if (dragged && dragCandidate && exceededDragThreshold(event)) {
            dragged.set(dragCandidate);
            dragCandidate = undefined;
            dragPoint = undefined;
        }

        // Update insertion points if something is dragged and hovered isn't a placeholder.
        if (
            $dragged &&
            !($hovered instanceof ExpressionPlaceholder) &&
            !($hovered instanceof TypePlaceholder)
        ) {
            // Get the insertion points at the current mouse position
            // And filter them by kinds that match, getting the field's allowed types,
            // and seeing if the dragged node is an instance of any of the dragged types.
            // This only works if the types list contains a single item that is a list of types.
            const insertionPoint = getInsertionPointsAt(event).filter(
                (insertion) => {
                    const kind = insertion.node.getFieldKind(insertion.field);
                    return (
                        kind &&
                        $dragged &&
                        (kind.allows($dragged) || kind.allows([$dragged]))
                    );
                },
            )[0];

            // Set the insertion, whatever we found.
            insertion.set(insertionPoint);

            // If we found one, unset the hovered. We don't do both at the same time.
            if (insertionPoint) hovered.set(undefined);
        } else insertion.set(undefined);
    }

    function handleDebugHover(event: PointerEvent) {
        if (evaluator === undefined) return;

        const node = getNodeAt(event, false);

        // if the node is associated with a step, set it, otherwise unset it.
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

    async function showMenu(node: CaretPosition | undefined = undefined) {
        if (!editable) return;

        wasFocusedBeforeMenu = focused;

        // Wait for everything to be updated so we have a fresh context
        await tick();

        // Is the caret on a specific token or node?
        const position = node ?? $caret.position;

        // Get the unique valid edits at the caret.
        const revisions = getEditsAt(
            project,
            $caret.withPosition(position),
            $locales,
        );

        // Set the menu.
        if (concepts)
            menu = new Menu(
                $caret,
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
        return menu === undefined ? showMenu() : hideMenu();
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
        edit: Edit | ProjectRevision | undefined,
        idle: IdleKind,
        focusAfter: boolean,
    ) {
        if (edit === undefined) return;

        const navigation = edit instanceof Caret;

        // Get the new caret and source to display.
        let newCaret = navigation ? edit : edit[1];
        const newSource = navigation ? undefined : edit[0];

        // Set the keyboard edit idle to false.
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
            } else setIgnored(true);
        } else {
            // Remove the addition, since the caret moved since being added.
            caret.set(newCaret.withoutAddition());
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
    /** True if a symbol was inserted using the insert symbol command, so we can undo it if composition starts. */
    let insertedSymbol = false;
    /** True if text was pasted */
    let pasted = true;

    function handleTextInput(event: Event) {
        // Blocks mode? No text input support. It's all handled by text fields.
        if ($blocks) return;

        setIgnored(false);

        let edit: Edit | ProjectRevision | undefined = undefined;

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
            if (edit) {
                newSource = edit[0];
                newCaret = edit[1];
            } else return;
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
                }
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
        if (edit) handleEdit(edit, IdleKind.Typing, true);
        else setIgnored(true);
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Ignore key down events that come just after composing. They're usually part of selecting the phrase in Safari.
        if (composingJustEnded) {
            composingJustEnded = false;
            return;
        }
        // If we're in the middle of composing, ignore the key events.
        if (composing || event.isComposing) return;
        if (evaluator === undefined) return;
        if (editor === null) return;

        // Assume we'll handle it.
        setIgnored(false);

        // If it was a dead key, don't handle it as a command, just remember that it was
        // a dead key, then let the input event above insert it.
        keyWasDead = event.key === 'Dead';
        if (keyWasDead) {
            return;
        }

        // Are we to replace the prior symbol with the next? Don't handle it as a command,
        // just let the character with diacritic remark be typed, and handle it in the input handler above.
        if (replacePreviousWithNext) return;

        const [command, result] = handleKeyCommand(event, {
            caret: $caret,
            project,
            editor: true,
            evaluator,
            dragging: $dragged !== undefined,
            database: DB,
            toggleMenu,
            blocks: $blocks,
            view: editor,
        });

        // Don't insert symbols if composing.
        insertedSymbol = command === InsertSymbol;

        // If it produced a new caret and optionally a new project, update the stores.
        const idle =
            command?.typing === true ? IdleKind.Typing : IdleKind.Typed;

        if (result !== false) {
            if (result instanceof Promise) {
                result.then((edit) => handleEdit(edit, idle, true));
            } else if (result !== undefined && result !== true) {
                handleEdit(result, idle, true);
            }

            // Prevent default keyboard commands from being otherwise handled, since they were handled here.
            event.preventDefault();
            event.stopPropagation();
        }
        // Give feedback that we didn't execute a command.
        else if (!/^(Shift|Control|Alt|Meta|Tab)$/.test(event.key))
            setIgnored(true);
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
            if (edit) handleEdit(edit, IdleKind.Typing, true);
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
            untrack(
                () =>
                    Projects.getHistory(project.getID())?.wasRestored() &&
                    restoredPosition === undefined,
            )
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

    let concepts = $derived(indexContext?.index);
    // A shorthand for the current program.
    let program = $derived(source.expression);

    /** When the current step, step index, or playing state changes, update the evaluation view of the editor */
    $effect(() => {
        $evaluation;
        evalUpdate();
    });

    // Whenever the selected output changes, ensure the first selected node is scrolled to.
    $effect(() => {
        if (selection?.selectedOutput !== undefined) {
            const node = selection.selectedOutput[0];
            if (node) {
                tick().then(() => {
                    const view = getNodeView(node);
                    if (view) ensureElementIsVisible(view, true);
                });
            }
        }
    });

    // Keep the project-level editors store in sync with this editor's state.
    $effect(() => {
        if (untrack(() => editors)) {
            const state = {
                caret: $caret,
                edit: handleEdit,
                blocks: $blocks,
                project,
                focused,
                toggleMenu,
                grabFocus,
            };
            untrack(() => {
                // Update the editor state in the editors store.
                $editors.set(sourceID, state);
                // Update the store with the edited map.
                editors.set($editors);
                // Update the local editor state.
                editContext.set(state);
            });
        }
    });

    // Hide the menu when the caret changes.
    $effect(() => {
        if ($caret) hideMenu();
    });

    $effect(() => {
        // The project and source can update at different times, so we only do this if the current source is in the project.
        if (project.contains(source)) {
            let newConflictsOfInterest: Conflict[] = [];

            // If dragging, don't show conlicts.
            if ($dragged !== undefined) return;

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
                          ).find((node) =>
                              project.nodeInvolvedInConflicts(node),
                          );
                if (conflictedHover) conflictSelection = conflictedHover;

                // If not, is there a node selected?
                if (
                    conflictSelection === undefined &&
                    $caret.position instanceof Node &&
                    project.nodeInvolvedInConflicts($caret.position)
                )
                    conflictSelection = $caret.position;

                // If not, what is the "nearest" conflicted node at the caret position?
                if (conflictSelection === undefined) {
                    if (typeof $caret.position === 'number') {
                        // Try:
                        // 1) the token just before
                        // 2) the token before if we're at it's end.
                        // 3) any nodes whose first position is at the caret.
                        let conflictsAtPosition = [
                            ...source
                                .nodes()
                                .filter(
                                    (node) =>
                                        source.getNodeFirstPosition(node) ===
                                        $caret.position,
                                ),
                            source.getTokenAt($caret.position, false),
                            $caret.atTokenEnd() ? $caret.tokenPrior : undefined,
                        ].reduce(
                            (conflicted: Node[], token: Node | undefined) => {
                                let nodesAtPosition =
                                    token === undefined
                                        ? []
                                        : (project
                                              .getRoot(token)
                                              ?.getSelfAndAncestors(token) ??
                                          []);
                                let nodesInConflict = nodesAtPosition.find(
                                    (node) =>
                                        project.nodeInvolvedInConflicts(node),
                                );
                                return [
                                    ...conflicted,
                                    ...(nodesInConflict
                                        ? [nodesInConflict]
                                        : []),
                                ];
                            },
                            [],
                        );

                        if (conflictsAtPosition !== undefined)
                            conflictSelection = conflictsAtPosition[0];
                    }
                    // If there's a node selection, see if it or any of it's ancestors are involved in conflicts
                    else {
                        const conflictedAncestor = [
                            $caret.position,
                            ...source.root.getAncestors($caret.position),
                        ].find((node) => project.nodeInvolvedInConflicts(node));
                        if (conflictedAncestor)
                            conflictSelection = conflictedAncestor;
                    }
                }

                // If we found a selection, get its conflicts.
                if (conflictSelection)
                    // Get all conflicts involving the selection
                    newConflictsOfInterest = [
                        ...(project.getPrimaryConflictsInvolvingNode(
                            conflictSelection,
                        ) ?? []),
                        ...(project.getSecondaryConflictsInvolvingNode(
                            conflictSelection,
                        ) ?? []),
                    ]
                        // Eliminate duplicate conflicts
                        .filter(
                            (c1, i1, list) =>
                                !list.some(
                                    (c2, i2) =>
                                        c1 === c2 && i2 > i1 && i1 !== i2,
                                ),
                        );
            }
            untrack(() => updateConflicts(source, newConflictsOfInterest));

            // Finally, update the conflicts of interest.
            conflictsOfInterest = newConflictsOfInterest;
        }
    });

    /** Announce caret position when it changes */
    $effect(() => {
        if (
            $announce &&
            document.activeElement === input &&
            $caret &&
            conflictsOfInterest &&
            caretExpressionType
        ) {
            untrack(() =>
                $announce(
                    sourceID,
                    $caret.getLanguage(),
                    $caret.getDescription(
                        caretExpressionType,
                        conflictsOfInterest,
                        context,
                    ),
                ),
            );
        }
    });

    // When the caret changes, see if it contains output, and if so, select it so the
    // palette appears.
    $effect(() => {
        if (
            SHOW_OUTPUT_IN_PALETTE &&
            selection?.selectedPaths &&
            $caret.position instanceof Evaluate &&
            $caret.position.isOneOf(
                project.getNodeContext($caret.position),
                project.shares.output.Phrase,
                project.shares.output.Group,
                project.shares.output.Stage,
            )
        )
            selection.setSelectedOutput(project, [$caret.position]);
    });

    // Update the highlights when any of these stores values change
    $effect(() => {
        $evaluation;
        highlights.set(
            getHighlights(
                source,
                evaluator,
                $caret,
                $dragged,
                $hovered,
                $insertion,
                $animatingNodes,
                selection?.selectedOutput,
                $blocks,
            ),
        );
    });

    // Update the outline positions any time the highlights change;
    let outlines = $state<HighlightSpec[]>([]);
    $effect(() => {
        if ($highlights)
            tick().then(() => {
                outlines = updateOutlines(
                    $highlights,
                    true,
                    $locales.getDirection() === 'rtl',
                    getNodeView,
                );
            });
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
    class:dragging={dragCandidate !== undefined ||
        $dragged !== undefined ||
        dragPoint !== undefined}
    data-uiid="editor"
    role="application"
    aria-label={`${$locales.get((l) => l.ui.source.label)} ${$locales.getName(
        source.names,
    )}`}
    dir={$locales.getDirection()}
    data-id={source.id}
    bind:this={editor}
    onpointerdown={handlePointerDown}
    onpointerup={handleRelease}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    onkeydown={handleKeyDown}
    ondblclick={(event) => {
        event.stopPropagation();
        let node = getNodeAt(event, false);
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
    <!-- Render highlights below the code -->
    {#each outlines as outline}
        <Highlight
            {...outline}
            above={false}
            types={outline.types}
            ignored={$evaluation &&
                $evaluation.playing === true &&
                lastKeyDownIgnored}
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
        }}
    ></textarea>
    <!-- Render the program -->
    <RootView
        node={program}
        spaces={source.spaces}
        localized={$localized}
        caret={$caret}
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

    <!-- Render the caret on top of the program -->
    <CaretView
        caret={$caret}
        blocks={$blocks}
        blink={$keyboardEditIdle === IdleKind.Idle && focused && editable}
        ignored={shakeCaret}
        bind:location={caretLocation}
    />
    <!-- 
        This is a localized description of the current caret position, a live region for screen readers,
        and a visual label for sighted folks.
     -->
    {#key $caret.position}
        <div
            class="caret-description"
            class:node={$caret.isNode()}
            onpointerdown={(event) => event.stopPropagation()}
            style:left={caretLocation
                ? `calc(${caretLocation.left}px - ${OutlinePadding}px)`
                : undefined}
            style:top={caretLocation ? `${caretLocation.bottom}px` : undefined}
            >{#if $caret.position instanceof Node}
                {@const relevantConcept = concepts?.getRelevantConcept(
                    $caret.position,
                )}
                <!-- Make a link to the node's documentation -->
                {#if relevantConcept}<ConceptLinkUI
                        link={relevantConcept}
                        label={DOCUMENTATION_SYMBOL}
                    />{/if}
                <!-- Show the node's label and type -->
                {$caret.position.getLabel(
                    $locales,
                )}{#if caretExpressionType}&nbsp;{TYPE_SYMBOL}&nbsp;{caretExpressionType.toWordplay()}{/if}
                <PlaceholderView position={$caret.position} />{/if}</div
        >
    {/key}
    {#if project.getSupplements().length > 0}
        <div class="output-preview-container">
            <Button
                tip={$locales.get((l) => l.ui.source.button.selectOutput)}
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
    }

    .editor.readonly {
        --size: 10px;

        background-image: linear-gradient(
                45deg,
                var(--wordplay-alternating-color) 25%,
                transparent 25%
            ),
            linear-gradient(
                -45deg,
                var(--wordplay-alternating-color) 25%,
                transparent 25%
            ),
            linear-gradient(
                45deg,
                transparent 75%,
                var(--wordplay-alternating-color) 75%
            ),
            linear-gradient(
                -45deg,
                transparent 75%,
                var(--wordplay-alternating-color) 75%
            );
        background-size: var(--size) var(--size);
        background-position:
            0 0,
            0 calc(var(--size) / 2),
            calc(var(--size) / 2) calc(-1 * var(--size) / 2),
            calc(-1 * var(--size) / 2) 0px;
    }

    .editor.dragging {
        touch-action: none;
        cursor: grabbing;
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        opacity: 0;
        width: 1px;
        height: 1em;
        pointer-events: none;
        touch-action: none;
        resize: none;
        overflow: hidden;

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
        padding-left: calc(var(--wordplay-spacing) / 2);
        padding-right: calc(var(--wordplay-spacing) / 2);
        border-radius: var(--wordplay-border-radius);
        opacity: 0;
    }

    .caret-description.node {
        opacity: 1;
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
