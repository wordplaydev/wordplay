<svelte:options immutable={true} />

<script lang="ts">
    import Node from '@nodes/Node';
    import Caret from '../../edit/Caret';
    import {
        createEventDispatcher,
        onDestroy,
        onMount,
        setContext,
    } from 'svelte';
    import UnicodeString from '@models/UnicodeString';
    import { handleKeyCommand, type Edit } from './util/Commands';
    import type Source from '@nodes/Source';
    import { writable } from 'svelte/store';
    import type Program from '@nodes/Program';
    import Token from '@nodes/Token';
    import CaretView, { type CaretBounds } from './CaretView.svelte';
    import {
        CaretSymbol,
        HoveredSymbol,
        HighlightSymbol,
        InsertionPointsSymbol,
        getDragged,
        getSelectedOutput,
        getAnimatingNodes,
        getConflicts,
        setSelectedOutput,
        getSelectedOutputPaths,
        getEvaluation,
        MenuNodeSymbol,
        getKeyboardEditIdle,
        IdleKind,
        EditorSymbol,
        getConceptIndex,
        getEditors,
    } from '../project/Contexts';
    import {
        type Highlights,
        HighlightTypes,
        getHighlights,
        updateOutlines,
    } from './util/Highlights';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import TypePlaceholder from '@nodes/TypePlaceholder';
    import Symbol from '@nodes/Symbol';
    import RootView from '../project/RootView.svelte';
    import type Project from '@models/Project';
    import type Conflict from '@conflicts/Conflict';
    import { tick } from 'svelte';
    import { getEditsAt } from '../../edit/Autocomplete';
    import { OutlinePadding } from './util/outline';
    import Highlight from './Highlight.svelte';
    import { afterUpdate } from 'svelte';
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
    import PlaceholderView from './PlaceholderView.svelte';
    import Expression from '../../nodes/Expression';
    import { DOCUMENTATION_SYMBOL, TYPE_SYMBOL } from '../../parser/Symbols';
    import { creator } from '../../db/Creator';
    import concretize from '../../locale/concretize';
    import Button from '../widgets/Button.svelte';
    import OutputView from '../output/OutputView.svelte';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';
    import Adjust from './Adjust.svelte';

    const SHOW_OUTPUT_IN_PALETTE = false;

    export let evaluator: Evaluator;
    export let project: Project;
    export let source: Source;
    /** The ID corresponding to which source this is in the project */
    export let sourceID: string;
    /** True if this editor's output is selected by the container. */
    export let selected: boolean;
    export let autofocus: boolean = true;

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    const caret = writable<Caret>(
        new Caret(source, 0, undefined, undefined, undefined)
    );
    setContext(CaretSymbol, caret);

    // A menu of potential transformations based on the caret position.
    // Managed here but displayed by the project to allow it to escape the editor view.
    export let menu: Menu | undefined = undefined;

    // When the menu changes to undefined, focus back on this source.
    $: if (menu === undefined) focusHiddenTextField();

    const selectedOutput = getSelectedOutput();
    const selectedOutputPaths = getSelectedOutputPaths();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();
    const keyboardEditIdle = getKeyboardEditIdle();
    const editors = getEditors();
    const concepts = getConceptIndex();

    const dispatch = createEventDispatcher();

    let input: HTMLInputElement | null = null;

    let editor: HTMLElement | null;

    /** True if something in the editor is focused. */
    let focused: boolean;

    // Whenever the project or source changes, set the caret to the project's caret for the source.
    $: caret.set(
        new Caret(
            source,
            project.getCaretPosition(source) ?? 0,
            undefined,
            undefined,
            undefined
        )
    );

    // A store of highlighted nodes, used by node views to highlight themselves.
    // We store centrally since the logic that determines what's highlighted is in the Editor.
    const highlights = writable<Highlights>(new Map());
    setContext(HighlightSymbol, highlights);

    // A store of what node is hovered over, excluding tokens, used in drag and drop.
    const hovered = writable<Node | undefined>(undefined);
    setContext(HoveredSymbol, hovered);

    // A store of what node is hovered over, including tokens.
    const hoveredAny = writable<Node | undefined>(undefined);

    // A store of current insertion points in a drag.
    const insertion = writable<InsertionPoint | undefined>(undefined);
    setContext(InsertionPointsSymbol, insertion);

    // A store of the currently requested node for which to show a menu.
    const menuNode = writable<Node | undefined>(undefined);
    setContext(MenuNodeSymbol, menuNode);

    // A store of the handle edit function
    const editHandler = writable<typeof handleEdit>(handleEdit);
    setContext(EditorSymbol, editHandler);

    // When the menu node changes, show the menu.
    const unsubscribe = menuNode.subscribe((node) => {
        if (node !== undefined) {
            showMenu(node);
            caret.set($caret.withPosition(node));
        }
    });
    onDestroy(unsubscribe);

    // A shorthand for the current program.
    $: program = source.expression;

    /** When the current step, step index, or playing state changes, update the evaluation view of the editor */
    $: {
        $evaluation;
        evalUpdate();
    }

    // Whenever the selected output changes, ensure the first selected node is scrolled to.
    $: {
        if ($selectedOutput !== undefined) {
            const node = $selectedOutput[0];
            if (node) {
                tick().then(() => {
                    const view = getNodeView(node);
                    if (view) ensureElementIsVisible(view, true);
                });
            }
        }
    }

    // Focus the hidden text field on mount.
    onMount(() => {
        if (autofocus) focusHiddenTextField();
    });

    async function evalUpdate() {
        if (evaluator === undefined || evaluator.isPlaying()) return;

        // If the program contains this node, scroll it's first token into view.
        const stepNode = evaluator.getStepNode();
        if (stepNode && source.has(stepNode)) {
            // Wait for everything to render, then find the node to scroll to.
            await tick();
            let highlight: Node | undefined = stepNode;
            let element = null;
            // Keep searching for a visible node, in case the step node is invisible.
            do {
                element = document.querySelector(`[data-id="${highlight.id}"]`);
                if (element !== null) break;
                else highlight = source.root.getParent(highlight);
            } while (element === null && highlight !== undefined);

            if (element !== null) ensureElementIsVisible(element);
        }
    }

    // Keep the project-level editors store in sync with this editor's state.
    $: if (editors) {
        $editors.set(sourceID, {
            caret: $caret,
            edit: handleEdit,
            focused,
            toggleMenu,
        });
        editors.set($editors);
    }

    // True if the last keyboard input was not handled by a command.
    let lastKeyDownIgnored = false;

    // Caret location comes from the caret
    let caretLocation: CaretBounds | undefined = undefined;

    // The store the contains the current node being dragged.
    let dragged = getDragged();

    // The point at which a drag started.
    let dragPoint: { x: number; y: number } | undefined = undefined;

    // The possible candidate for dragging
    let dragCandidate: Node | undefined = undefined;

    // When source changes, update various nested state from the source.
    $: caret.set($caret.withSource(source));

    $: context = project.getContext(source);
    $: caretExpressionType =
        $caret.position instanceof Expression
            ? $caret.position
                  .getType(context)
                  .simplify(context)
                  .generalize(context)
            : undefined;

    // When the caret changes, if it's a node, focus on the node, and if it's an index, focus on the hidden text field.
    $: {
        if ($caret) {
            // Hide the menu, if there is one.
            hideMenu();

            tick().then(() => {
                // If this editor contains the focus, choose an appropriate focus for the new caret.
                const adjust = document.querySelector('.adjust');
                if (
                    editor &&
                    typeof document !== 'undefined' &&
                    editor.contains(document.activeElement) &&
                    (adjust === null ||
                        !adjust.contains(document.activeElement))
                ) {
                    if (
                        $caret.position instanceof Node &&
                        !$caret.isPlaceholderToken()
                    ) {
                        // Clear the last input value
                        lastKeyboardInputValue = undefined;
                        // Focus the node that's selected.
                        focusNodeCaret();
                    } else {
                        focusHiddenTextField();
                    }
                }
            });
        }
    }

    // If the caret is in or on a literal that can be modified, shown an adjust
    let adjustable: Node | undefined;
    let adjustableLocation: { left: number; top: number } | undefined;
    $: {
        adjustable = undefined;
        adjustableLocation = undefined;
        if ($caret) {
            const node =
                $caret.position instanceof Node
                    ? $caret.position
                    : $caret.tokenExcludingSpace;
            if (node) {
                adjustable = $caret.getAdjustableLiteral();

                // When adjustable disappears, focus text field
                if (adjustable === undefined) {
                    focusHiddenTextField();
                } else {
                    tick().then(() => {
                        if (adjustable) {
                            const adjustableBounds =
                                getNodeView(
                                    adjustable
                                )?.getBoundingClientRect();
                            const editorBounds =
                                editor?.getBoundingClientRect();
                            if (adjustableBounds && editorBounds)
                                adjustableLocation = {
                                    left:
                                        adjustableBounds.right -
                                        editorBounds.left,
                                    top:
                                        adjustableBounds.top - editorBounds.top,
                                };
                        }
                    });
                }
            }
        }
    }

    // When the caret changes, see if it contains output, and if so, select it so the
    // palette appears.
    $: {
        if (
            SHOW_OUTPUT_IN_PALETTE &&
            selectedOutputPaths &&
            $caret.position instanceof Evaluate &&
            $caret.position.isOneOf(
                project.getNodeContext($caret.position),
                project.shares.output.phrase,
                project.shares.output.group,
                project.shares.output.stage
            )
        )
            setSelectedOutput(selectedOutputPaths, project, [$caret.position]);
    }

    // Determine the conflicts of interest based on caret and mouse position.
    export let conflictsOfInterest: Conflict[] = [];
    $: {
        // The project and source can update at different times, so we only do this if the current source is in the project.
        if (project.contains(source)) {
            conflictsOfInterest = [];

            // If dragging, don't show conlicts.
            if ($dragged !== undefined) break $;

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
                              project.nodeInvolvedInConflicts(node)
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
                        // Try the token we're at and the one prior if we're at it's beginning.
                        let conflictsAtPosition = [
                            source.getTokenAt($caret.position, false),
                            $caret.atTokenEnd() ? $caret.tokenPrior : undefined,
                        ].reduce(
                            (conflicted: Node[], token: Node | undefined) => {
                                let nodesAtPosition =
                                    token === undefined
                                        ? []
                                        : project
                                              .getRoot(token)
                                              ?.getSelfAndAncestors(token) ??
                                          [];
                                let nodesInConflict = nodesAtPosition.find(
                                    (node) =>
                                        project.nodeInvolvedInConflicts(node)
                                );
                                return [
                                    ...conflicted,
                                    ...(nodesInConflict
                                        ? [nodesInConflict]
                                        : []),
                                ];
                            },
                            []
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
                    conflictsOfInterest = [
                        ...(project.getPrimaryConflictsInvolvingNode(
                            conflictSelection
                        ) ?? []),
                        ...(project.getSecondaryConflictsInvolvingNode(
                            conflictSelection
                        ) ?? []),
                    ]
                        // Eliminate duplicate conflicts
                        .filter(
                            (c1, i1, list) =>
                                !list.some(
                                    (c2, i2) =>
                                        c1 === c2 && i2 > i1 && i1 !== i2
                                )
                        );
            }
            dispatch('conflicts', { source, conflicts: conflictsOfInterest });
        }
    }

    // Update the highlights when any of these stores values change
    $: if ($nodeConflicts && $evaluation) {
        tick().then(() =>
            highlights.set(
                getHighlights(
                    source,
                    evaluator,
                    $caret,
                    $dragged,
                    $hovered,
                    $insertion,
                    $animatingNodes,
                    $selectedOutput
                )
            )
        );
    }

    // Update the outline positions any time the highlights change;
    $: outlines = updateOutlines($highlights, getNodeView);

    // After updates, manage highlight classes on nodes
    afterUpdate(() => {
        updateOutlines($highlights, getNodeView);

        // Optimization: add and remove classes for styling here rather than having them
        // retrieved in each NodeView.
        if (editor) {
            // Remove any existing highlights
            for (const highlighted of editor.querySelectorAll('.highlighted'))
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

    function getNodeView(node: Node): HTMLElement | undefined {
        // See if there's a node or value view that corresponds to this node.
        const view =
            editor?.querySelector(`.node-view[data-id="${node.id}"]`) ??
            editor?.querySelector(`.value[data-node-id="${node.id}"]`);
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

    async function ensureElementIsVisible(
        element: Element,
        nearest: boolean = false
    ) {
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
        dragged.set(undefined);
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
            $hovered ?? ($insertion as Node | InsertionPoint)
        ) ?? [undefined, undefined];

        if (newProject === undefined || droppedNode === undefined) return;

        // Set the caret to the first placeholder or the dragged node, or the node itself if there isn't one.
        const newCaretPosition =
            droppedNode.getFirstPlaceholder() ?? droppedNode;
        caret.set(
            $caret.withPosition(newCaretPosition).withAddition(droppedNode)
        );

        // Update the project with the new source files
        $creator.reviseProject(
            project,
            newProject.withCaret(newSource, newCaretPosition)
        );

        // Focus the node caret selected.
        focusNodeCaret();
    }

    function handlePointerDown(event: PointerEvent) {
        placeCaretAt(event);

        // After we handle the click, focus on keyboard input, in case it's not focused.
        focusHiddenTextField();
    }

    function placeCaretAt(event: PointerEvent) {
        const tokenUnderPointer = getNodeAt(event, true);
        const nonTokenNodeUnderPointer = getNodeAt(event, false);
        const newPosition =
            // If shift is down, select the non-token node at the position.
            event.shiftKey && nonTokenNodeUnderPointer !== undefined
                ? nonTokenNodeUnderPointer
                : // If the node is a placeholder token, select it's placeholder ancestor
                tokenUnderPointer instanceof Token &&
                  tokenUnderPointer.isSymbol(Symbol.Placeholder)
                ? source.root
                      .getAncestors(tokenUnderPointer)
                      .find((a) => a.isPlaceholder())
                : // Otherwise choose an index position under the mouse
                  getCaretPositionAt(event);

        // If we found a position, set it.
        if (newPosition !== undefined)
            caret.set($caret.withPosition(newPosition));

        // Mark that the creator might want to drag the node under the mouse and remember where the click started.
        if (nonTokenNodeUnderPointer) {
            dragCandidate = nonTokenNodeUnderPointer;
            // If the primary mouse button is down, start dragging and set insertion.
            // We only start dragging if the cursor has moved more than a certain amount since last click.
            if (dragCandidate && event.buttons === 1)
                dragPoint = { x: event.clientX, y: event.clientY };
        }
    }

    function getNodeAt(
        event: PointerEvent | MouseEvent,
        includeTokens: boolean
    ) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        // Only return a node if hovering over its text. Space isn't eligible.
        if (el instanceof HTMLElement) {
            const nodeView = el.closest(
                `.node-view${includeTokens ? '' : `:not(.${Token.name})`}`
            );
            if (nodeView instanceof HTMLElement && nodeView.dataset.id) {
                return source.expression.getNodeByID(
                    parseInt(nodeView.dataset.id)
                );
            }
        }
        return undefined;
    }

    function getTokenFromElement(
        textOrSpace: Element
    ): [Token, Element] | undefined {
        const tokenView = textOrSpace.closest(`.${Token.name}`);
        const token =
            tokenView === null
                ? undefined
                : getTokenByView($caret.getProgram(), tokenView);
        return tokenView === null || token === undefined
            ? undefined
            : [token, tokenView];
    }

    function getTokenFromLineBreak(
        textOrSpace: Element
    ): [Token, Element] | undefined {
        const spaceView = textOrSpace.closest('.space') as HTMLElement;
        const tokenID =
            spaceView instanceof HTMLElement && spaceView.dataset.id
                ? parseInt(spaceView.dataset.id)
                : undefined;
        return tokenID
            ? [source.getNodeByID(tokenID) as Token, spaceView]
            : undefined;
    }

    function getCaretPositionAt(event: PointerEvent): number | undefined {
        // What element is under the mouse?
        const elementAtCursor = document.elementFromPoint(
            event.clientX,
            event.clientY
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
                                              (offset / tokenRect.width)
                                      ))
                        )
                    );
                    return newPosition;
                }
            }
        }

        // If the element at the cursor is inside space, choose the space.
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
                                        .length
                        );
                    }
                }
            }
        }

        // If its the editor, find the closest token and choose either it's right or left side.
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
                                      (textRect.top + textRect.height / 2)
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
                    event.clientY <= text.textBottom
            )
            // Sort by increasing horizontal distance from the pointer
            .sort(
                (a, b) =>
                    Math.min(a.leftDistance, a.rightDistance) -
                    Math.min(b.leftDistance, b.rightDistance)
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
        type BreakInfo = { token: Token; offset: number; index: number };

        // Find all tokens with empty lines and choose the nearest.
        const closestLine =
            // Find all of the token line breaks, which are wrapped in spans to enable consistent measurement.
            // This is because line breaks and getBoundingClientRect() are jumpy depending on what's around them.
            Array.from(editor.querySelectorAll('.space br'))
                // Map each one to 1) the token, 2) token view, 3) line break top, 4) index within each token's space
                .map((br) => {
                    const [token, tokenView] = getTokenFromLineBreak(br) ?? [];
                    // Check the br container, which gives us a more accurate bounding client rect.
                    const rect = (br as HTMLElement).getBoundingClientRect();
                    return tokenView === undefined || token === undefined
                        ? undefined
                        : {
                              token,
                              offset: Math.abs(
                                  rect.top + rect.height / 2 - event.clientY
                              ),
                              index: Array.from(
                                  tokenView.querySelectorAll('br')
                              ).indexOf(br as HTMLBRElement),
                          };
                })
                // Filter out any empty breaks that we couldn't find
                .filter<BreakInfo>(
                    (br: BreakInfo | undefined): br is BreakInfo =>
                        br !== undefined
                )
                // Sort by increasing offset from mouse y
                .sort((a, b) => a.offset - b.offset)[0]; // Chose the closest

        // If we have a closest line, find the line number
        if (closestLine && spaceView) {
            // Compute the horizontal position at which to place the caret.
            // Find the width of a single space by finding the longest line,
            // which determines its width.
            const spaceBounds = spaceView.getBoundingClientRect();
            const tokenSpace = source.spaces.getSpace(closestLine.token);
            const spaceWidth =
                spaceBounds.width /
                Math.max.apply(
                    null,
                    tokenSpace
                        .replaceAll('\t', ' '.repeat(TAB_WIDTH))
                        .split('\n')
                        .map((s) => s.length)
                );

            // Offset the caret position by the number of spaces from the dge that was clicked.
            const positionOffset = Math.round(
                Math.abs(
                    event.clientX -
                        ($creator.getWritingDirection() === 'ltr'
                            ? spaceBounds.left
                            : spaceBounds.right)
                ) / spaceWidth
            );

            const index = $caret.source.getTokenSpacePosition(
                closestLine.token
            );
            return index !== undefined
                ? index +
                      tokenSpace.split('\n', closestLine.index).join('\n')
                          .length +
                      1 +
                      positionOffset
                : undefined;
        }

        // Otherwise, choose the last position if nothing else matches.
        return source.getTokenLastPosition(source.expression.end);
    }

    function getInsertionPointsAt(event: PointerEvent) {
        // Is the caret position between tokens? If so, are any of the token's parents inside a list in which we could insert something?
        const position = getCaretPositionAt(event);

        if (position !== undefined) {
            const caret = new Caret(
                source,
                position,
                undefined,
                undefined,
                undefined
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
                        getInsertionPoint(source, tree, false, token, line)
                    ),
                    ...after.map((tree) =>
                        getInsertionPoint(source, tree, true, token, line)
                    ),
                ]
                    // Filter out duplicates and undefineds
                    .filter<InsertionPoint>(
                        (
                            insertion1: InsertionPoint | undefined,
                            i1,
                            insertions
                        ): insertion1 is InsertionPoint =>
                            insertion1 !== undefined &&
                            insertions.find(
                                (insertion2, i2) =>
                                    i1 > i2 &&
                                    insertion1 !== insertion2 &&
                                    insertion2 !== undefined &&
                                    insertion1.equals(insertion2)
                            ) === undefined
                    )
            );
        }
        return [];
    }

    function exceededDragThreshold(event: PointerEvent) {
        return (
            dragPoint === undefined ||
            Math.sqrt(
                Math.pow(event.clientX - dragPoint.x, 2) +
                    Math.pow(event.clientY - dragPoint.y, 2)
            ) >= 5
        );
    }

    function handlePointerMove(event: PointerEvent) {
        if (evaluator === undefined) return;

        if (evaluator.isPlaying()) handleEditHover(event);
        else handleDebugHover(event);
    }

    function handleEditHover(event: PointerEvent) {
        // By default, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(event, false));
        hoveredAny.set(getNodeAt(event, true));

        // If we have a drag candidate and it's past 5 pixels from the start point, set the insertion points to whatever points are under the mouse.
        if (dragCandidate && exceededDragThreshold(event)) {
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
                }
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
                : evaluator.getEvaluableNode(node)
        );
    }

    function handlePointerLeave() {
        hovered.set(undefined);
        insertion.set(undefined);
    }

    async function showMenu(node: Node | undefined = undefined) {
        // Wait for everything to be updated so we have a fresh context
        await tick();

        // Is the caret on a specific token or node?
        const position = node ?? $caret.position;

        // Get the unique valid edits at the caret.
        const revisions = getEditsAt(project, $caret.withPosition(position));

        // Set the menu.
        if ($concepts)
            menu = new Menu(
                $caret,
                revisions,
                undefined,
                $concepts,
                [0, undefined],
                handleMenuItem
            );
    }

    function hideMenu() {
        menu = undefined;
    }

    function toggleMenu() {
        return menu === undefined ? showMenu() : hideMenu();
    }

    function handleMenuItem(
        selection: Edit | RevisionSet | undefined
    ): boolean {
        if (menu) {
            if (selection === undefined) {
                menu = menu.back();
            } else if (selection instanceof RevisionSet) {
                const newIndex = menu.getOrganization().indexOf(selection);
                menu = menu.withSelection([newIndex, 0]);
                return false;
            } else {
                handleEdit(selection);
                return true;
            }
        }
        return false;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (evaluator === undefined) return;
        if (editor === null) return;

        // Assume we'll handle it.
        lastKeyDownIgnored = false;

        const result = handleKeyCommand(event, {
            caret: $caret,
            evaluator,
            creator: $creator,
            toggleMenu,
        });

        // If it produced a new caret and optionally a new project, update the stores.
        const idle =
            event.key.length === 1 ? IdleKind.Typing : IdleKind.Navigating;

        if (result !== false) {
            if (result instanceof Promise)
                result.then((edit) => handleEdit(edit, idle));
            else if (result !== undefined && result !== true)
                handleEdit(result, idle);

            // Prevent default keyboard commands from being otherwise handled.
            event.preventDefault();
            event.stopPropagation();
        }
        // Give feedback that we didn't execute a command.
        else if (!/^(Shift|Control|Alt|Meta|Tab)$/.test(event.key))
            lastKeyDownIgnored = true;
    }

    async function handleEdit(
        edit: Edit | undefined,
        idle: IdleKind = IdleKind.Typing
    ) {
        if (edit === undefined) return;

        const unmodified = edit instanceof Caret;

        // Get the new caret and source to display.
        const newCaret = unmodified ? edit : edit[1];
        const newSource = unmodified ? undefined : edit[0];

        // Remember whether the text field was focused.
        const focused = document.activeElement === input;

        // Set the keyboard edit idle to false.
        keyboardEditIdle.set(idle);

        // Update the caret and project.
        if (newSource) {
            $creator.reviseProject(
                project,
                project
                    .withSource(source, newSource)
                    .withCaret(newSource, newCaret.position)
            );
            caret.set(newCaret.withSource(newSource));
        } else {
            // Remove the addition, since the caret moved since being added.
            caret.set(newCaret.withoutAddition());
        }

        // After every edit and everything is updated, focus back on on text input
        await tick();
        if (caretLocation && !unmodified && $caret.isIndex() && focused)
            focusHiddenTextField();
    }

    function focusHiddenTextField() {
        input?.focus();
    }

    async function focusNodeCaret() {
        // We used to focus node views themselves, thinking that this was necessary
        // for screen reading. But it turns out that because of ARIA role restrictions,
        // that's not a good idea.
        editor?.focus();
    }

    let lastKeyboardInputValue: undefined | UnicodeString = undefined;

    function handleTextInput(event: Event) {
        lastKeyDownIgnored = false;

        let edit: Edit | undefined = undefined;

        // Get the character that was typed into the text box.
        if (input) {
            // Wrap the string in a unicode wrapper so we can account for graphemes.
            const value = new UnicodeString(input.value);

            // Get the last grapheme entered.
            const lastChar = value.substring(
                value.getLength() - 1,
                value.getLength()
            );

            let newCaret = $caret;
            let newSource: Source | undefined = source;

            if (newCaret.position instanceof Node) {
                const edit = newCaret.deleteNode(newCaret.position);
                if (edit) {
                    newSource = edit[0];
                    newCaret = edit[1];
                } else return;
            }

            if (typeof newCaret.position === 'number') {
                // If the last keyboard value length is equal to the new one, then it was a diacritic.
                // Replace the last grapheme entered with this grapheme, then reset the input text field.
                if (
                    lastKeyboardInputValue !== undefined &&
                    lastKeyboardInputValue.getLength() === value.getLength()
                ) {
                    const char = lastChar.toString();
                    newSource = source.withPreviousGraphemeReplaced(
                        char,
                        newCaret.position
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
                                newSource.getTokenAt(newCaret.position)
                            ),
                        ];
                    }
                }
                // Otherwise, just insert the grapheme and limit the input field to the last character.
                else {
                    const char = lastChar.toString();

                    // If it was a placeholder, first remove the
                    edit = newCaret.insert(char);
                    if (edit) {
                        if (value.getLength() > 1)
                            input.value = lastChar.toString();
                    }
                    // Rest the field to the last character.
                }
            }

            // Remember the last value of the input field for comparison on the next keystroke.
            lastKeyboardInputValue = new UnicodeString(input.value);

            // Prevent the OS from doing anything with this input.
            event.preventDefault();
        }

        // Did we make an update?
        if (edit) handleEdit(edit, IdleKind.Typing);
        else lastKeyDownIgnored = true;
    }

    function getInputID() {
        return `${source.getNames()[0]}-input`;
    }
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={handleRelease} />

<!-- 
    Has ARIA role text box to allow keyboard keys to go through 
    All NodeViews are set to role="presentation"
    We use the live region above 
-->
<div
    class="editor {$evaluation !== undefined && $evaluation.playing
        ? 'playing'
        : 'stepping'}"
    role="textbox"
    data-uiid="editor"
    tabindex="0"
    aria-autocomplete="none"
    aria-live="off"
    aria-multiline="true"
    aria-readonly="false"
    aria-label={`${$creator.getLocale().ui.section.editor} ${source.getLocale(
        $creator.getLanguages()
    )}`}
    aria-activedescendant={$caret.position instanceof Node
        ? `node-${$caret.position.id}`
        : getInputID()}
    style:direction={$creator.getWritingDirection()}
    style:writing-mode={$creator.getWritingLayout()}
    data-id={source.id}
    bind:this={editor}
    on:pointerdown={handlePointerDown}
    on:dblclick={(event) => {
        let node = getNodeAt(event, false);
        if (node) caret.set($caret.withPosition(node));
    }}
    on:pointerup={handleRelease}
    on:pointermove={handlePointerMove}
    on:pointerleave={handlePointerLeave}
    on:keydown={handleKeyDown}
    on:focusin={() => (focused = true)}
    on:focusout={() => (focused = false)}
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
    <!-- Render the program -->
    <RootView node={program} spaces={source.spaces} localized />
    <!-- Render highlights above the code -->
    {#each outlines as outline}
        <Highlight {...outline} types={outline.types} above={true} />
    {/each}

    <!-- Render the caret on top of the program -->
    <CaretView
        {source}
        blink={$keyboardEditIdle === IdleKind.Idle && focused}
        ignored={$evaluation !== undefined &&
            $evaluation.playing === true &&
            lastKeyDownIgnored}
        bind:location={caretLocation}
    />
    <!-- If the caret is a position, render the invisible text field that allows us to capture inputs -->
    <input
        type="text"
        id={getInputID()}
        data-focusdefault
        aria-autocomplete="none"
        autocomplete="off"
        class="keyboard-input"
        style={`left: ${caretLocation?.left ?? 0}; top: ${
            caretLocation?.top ?? 0
        };`}
        bind:this={input}
        on:input={handleTextInput}
    />
    <!-- Render an adjust view by the caret if eligible. This should be after the input so that it's tababble. -->
    {#if adjustable}<Adjust {sourceID} bounds={adjustableLocation} />{/if}
    <!-- 
        This is a localized description of the current caret position, a live region for screen readers,
        and a visual label for sighted folks.
     -->
    {#key $caret.position}
        <div
            class="caret-description"
            class:node={$caret.isNode()}
            on:pointerdown|stopPropagation
            style:left={caretLocation
                ? `calc(${caretLocation.left} - ${OutlinePadding}px)`
                : undefined}
            style:top={caretLocation ? `${caretLocation.bottom}px` : undefined}
            >{#if $caret.position instanceof Node}{@const concept =
                    $concepts?.getNodeConcept(
                        $caret.position
                    )}{@const typeConcept =
                    $concepts && caretExpressionType
                        ? $concepts.getConceptOfType(caretExpressionType)
                        : undefined}<!-- Make a link to the node's documentation -->{#if concept}<ConceptLinkUI
                        link={concept}
                        label={DOCUMENTATION_SYMBOL}
                    />{/if}
                <!-- Show the node's label and type, if an expression -->
                {$caret.position.getLabel(
                    $creator.getLocale()
                )}{#if caretExpressionType}&nbsp;{TYPE_SYMBOL}&nbsp;{#if typeConcept}<ConceptLinkUI
                            link={typeConcept}
                            label={caretExpressionType.toWordplay()}
                        />{:else}{caretExpressionType.toWordplay()}{/if}{/if}
                <PlaceholderView
                    node={$caret.position}
                />{/if}{#if document.activeElement?.contains(editor)}<div
                    class="screen-reader-description"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-relevant="all"
                    >{$caret.position instanceof Node
                        ? $caret.position.getLabel($creator.getLocale()) +
                          ', ' +
                          $caret.position
                              .getDescription(
                                  concretize,
                                  $creator.getLocale(),
                                  project.getNodeContext($caret.position)
                              )
                              .toText() +
                          (caretExpressionType
                              ? `, ${caretExpressionType.toWordplay()}`
                              : '')
                        : $caret.tokenExcludingSpace
                        ? concretize(
                              $creator.getLocale(),
                              $creator.getLocale().ui.edit.before,
                              source.code.at($caret.position) ?? ''
                          ).toText()
                        : $caret.tokenIncludingSpace
                        ? concretize(
                              $creator.getLocale(),
                              $creator.getLocale().ui.edit.before,
                              $caret.tokenIncludingSpace
                                  .getDescription(
                                      concretize,
                                      $creator.getLocale(),
                                      project.getNodeContext(
                                          $caret.tokenIncludingSpace
                                      )
                                  )
                                  .toText()
                          ).toText()
                        : ''}</div
                >{/if}</div
        >
    {/key}
</div>
{#if project.supplements.length > 0}
    <div class="output-preview-container">
        <Button
            tip={$creator.getLocale().ui.tooltip.showOutput}
            active={!selected}
            action={() => dispatch('preview')}
            scale={false}
        >
            <div class="output-preview">
                {#if selected}
                    <span style="font-size:200%">🎭</span>
                {:else}
                    <OutputView
                        {project}
                        {evaluator}
                        {source}
                        value={evaluator.getLatestSourceValue(source)}
                        fullscreen={false}
                        mini
                    />
                {/if}
            </div>
        </Button>
    </div>
{/if}

<style>
    .editor {
        white-space: nowrap;
        line-height: var(--wordplay-code-line-height);
        position: relative;
        user-select: none;
        padding: calc(2 * var(--wordplay-spacing));
        flex: 1;
        cursor: text;
        margin-bottom: auto;
    }

    .editor:focus {
        outline: none;
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        opacity: 0;
        width: 1px;
        pointer-events: none;
        touch-action: none;

        /* Helpful for debugging */
        /* outline: 1px solid red;
        opacity: 1;
        width: 10px; */
    }

    .caret-description {
        position: absolute;
        background: var(--wordplay-highlight);
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

    .screen-reader-description {
        font-size: 0;
    }

    .output-preview-container {
        position: sticky;
        bottom: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        background: var(--wordplay-background);
        align-self: flex-end;
    }

    .output-preview {
        width: 5em;
        height: 5em;
        border: var(--wordplay-border-color) solid var(--wordplay-border-width);
        border-radius: var(--wordplay-border-radius);
        overflow: hidden;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
</style>
