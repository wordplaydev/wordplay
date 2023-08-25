<svelte:options immutable={true} />

<script lang="ts">
    import Node from '@nodes/Node';
    import Caret, { type CaretPosition } from '../../edit/Caret';
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
        getBlocksMode,
    } from '../project/Contexts';
    import {
        type Highlights,
        HighlightTypes,
        getHighlights,
        updateOutlines,
    } from './util/Highlights';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import TypePlaceholder from '@nodes/TypePlaceholder';
    import Sym from '@nodes/Sym';
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
    import {
        DB,
        Projects,
        locale,
        locales,
        writingDirection,
        writingLayout,
    } from '../../db/Database';
    import Button from '../widgets/Button.svelte';
    import OutputView from '../output/OutputView.svelte';
    import ConceptLinkUI from '../concepts/ConceptLinkUI.svelte';
    import Adjust from './Adjust.svelte';
    import EditorHelp from './EditorHelp.svelte';
    import concretize from '../../locale/concretize';

    const SHOW_OUTPUT_IN_PALETTE = false;

    export let evaluator: Evaluator;
    export let project: Project;
    export let source: Source;
    /** The ID corresponding to which source this is in the project */
    export let sourceID: string;
    /** True if this editor's output is selected by the container. */
    export let selected: boolean;
    export let autofocus = true;
    export let showHelp = true;
    export let editable: boolean;

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    const caret = writable<Caret>(
        new Caret(source, 0, undefined, undefined, undefined)
    );
    setContext(CaretSymbol, caret);

    // When source changes, update various nested state from the source.
    $: caret.set($caret.withSource(source));

    // On mount, start the caret to the project's caret for the source.
    onMount(() => {
        caret.set(
            new Caret(
                source,
                project.getCaretPosition(source) ?? 0,
                undefined,
                undefined,
                undefined
            )
        );
    });

    // When the project is undone or redone, set the caret's position to the project's historical caret position.
    $: if (Projects.getHistory(project.id)?.wasRestored()) {
        const position = project.getCaretPosition(source);
        if (position !== undefined) caret.set($caret.withPosition(position));
    }

    $: caretExpressionType =
        $caret.position instanceof Expression
            ? $caret.position
                  .getType(context)
                  .simplify(context)
                  .generalize(context)
            : undefined;
    $: caretTypeDescription = caretExpressionType
        ?.getDescription(concretize, $locale, project.getContext(source))
        .toText();

    // A menu of potential transformations based on the caret position.
    // Managed here but displayed by the project to allow it to escape the editor view.
    export let menu: Menu | undefined = undefined;

    // When the menu changes to undefined, focus back on this source.
    $: if (menu === undefined) grabFocus();

    const selectedOutput = getSelectedOutput();
    const selectedOutputPaths = getSelectedOutputPaths();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();
    const keyboardEditIdle = getKeyboardEditIdle();
    const editors = getEditors();
    const concepts = getConceptIndex();
    const blocks = getBlocksMode();

    const dispatch = createEventDispatcher();

    let input: HTMLInputElement | null = null;

    let editor: HTMLElement | null;

    /** True if something in the editor is focused. */
    let focused: boolean;

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
    const menuNode = writable<CaretPosition | undefined>(undefined);
    setContext(MenuNodeSymbol, menuNode);

    // A store of the handle edit function
    const editHandler = writable<typeof handleEdit>(handleEdit);
    setContext(EditorSymbol, editHandler);

    // When the menu node changes, show the menu.
    const unsubscribe = menuNode.subscribe((position) => {
        if (position !== undefined) {
            showMenu(position);
            caret.set($caret.withPosition(position));
        } else hideMenu();
    });
    onDestroy(unsubscribe);

    // Focus the editor on mount, if autofocus is on.
    onMount(() => (autofocus ? grabFocus() : undefined));

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

    $: context = project.getContext(source);

    // Hide the menu when the caret changes.
    $: if ($caret) hideMenu();

    // When the caret changes, see if there's an adjustable at it, and if so, measure it and then show it.
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
                if (adjustable !== undefined) {
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
                project.shares.output.Phrase,
                project.shares.output.Group,
                project.shares.output.Stage
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
    $: if (
        $nodeConflicts &&
        $evaluation &&
        $writingLayout &&
        $writingDirection
    ) {
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
                    $selectedOutput,
                    $blocks
                )
            )
        );
    }

    // Update the outline positions any time the highlights change;
    $: outlines = updateOutlines(
        $highlights,
        $writingLayout === 'horizontal-tb',
        $writingDirection === 'rtl' || $writingLayout === 'vertical-rl',
        getNodeView
    );

    // After updates, manage highlight classes on nodes
    afterUpdate(() => {
        updateOutlines(
            $highlights,
            $writingLayout === 'horizontal-tb',
            $writingDirection === 'rtl' || $writingLayout === 'vertical-rl',
            getNodeView
        );

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
        Projects.reviseProject(
            newProject.withCaret(newSource, newCaretPosition)
        );

        // Focus the node caret selected.
        grabFocus();
    }

    function handlePointerDown(event: PointerEvent) {
        placeCaretAt(event);

        // After we handle the click, focus on keyboard input, in case it's not focused.
        grabFocus();
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
        if (closestLine) {
            // Compute the horizontal position at which to place the caret.
            // Find the width of a single space by finding the longest line,
            // which determines its width.
            const spaceBounds = spaceView?.getBoundingClientRect();
            const tokenSpace = source.spaces.getSpace(closestLine.token);
            const spaceWidth =
                (spaceBounds?.width ?? 0) /
                Math.max.apply(
                    null,
                    tokenSpace
                        .replaceAll('\t', ' '.repeat(TAB_WIDTH))
                        .split('\n')
                        .map((s) => s.length)
                );

            // Offset the caret position by the number of spaces from the edge that was clicked.
            const positionOffset = spaceBounds
                ? Math.round(
                      Math.abs(
                          event.clientX -
                              ($writingDirection === 'ltr'
                                  ? spaceBounds.left
                                  : spaceBounds.right)
                      ) / spaceWidth
                  )
                : 0;

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

        // Remove the touch action disabling now that we're moving.
        if (editor) editor.style.removeProperty('touchAction');

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

    async function showMenu(node: CaretPosition | undefined = undefined) {
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
                handleEdit(selection, IdleKind.Typing, true);
                return true;
            }
        }
        return false;
    }

    async function handleEdit(
        edit: Edit | undefined,
        idle: IdleKind = IdleKind.Typing,
        /** True if the editor should claim focus after performing this edit.
         * For all actions that come from the editor, it should.
         * But there are other things that edit, and they may not want the editor grabbing focus.
         **/
        focusAfter: boolean
    ) {
        if (edit === undefined) return;

        const navigation = edit instanceof Caret;

        // Get the new caret and source to display.
        const newCaret = navigation ? edit : edit[1];
        const newSource = navigation ? undefined : edit[0];

        // Set the keyboard edit idle to false.
        keyboardEditIdle.set(idle);

        // Update the caret and project.
        if (newSource) {
            if (editable) {
                Projects.reviseProject(
                    project
                        .withSource(source, newSource)
                        .withCaret(newSource, newCaret.position)
                );
                caret.set(newCaret.withSource(newSource));
            }
        } else {
            // Remove the addition, since the caret moved since being added.
            caret.set(newCaret.withoutAddition());
        }

        // After everything is updated, if we were asked to focus the editor, focus it.
        await tick();
        if (focusAfter) grabFocus();
    }

    function grabFocus() {
        input?.focus();
    }

    /** True if the last symbol was a dead key*/
    let keyWasDead = false;
    let replacePreviousWithNext = false;

    function handleTextInput(event: Event) {
        lastKeyDownIgnored = false;

        let edit: Edit | undefined = undefined;

        // Somehow no reference to the input? Bail.
        if (input === null) return;

        // Get the character that was typed into the text box.
        // Wrap the string in a unicode wrapper so we can account for graphemes.
        const value = new UnicodeString(input.value);

        // Get the last grapheme entered.
        const lastChar = value.substring(
            value.getLength() - 1,
            value.getLength()
        );

        let newCaret = $caret;
        let newSource: Source | undefined = source;

        // First, delete any selected node.
        if (newCaret.position instanceof Node) {
            const edit = newCaret.deleteNode(newCaret.position);
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

                // Insert the character tht was added last.
                edit = newCaret.insert(char, !keyWasDead);
                if (edit) {
                    // Rset the value to the last character.
                    if (value.getLength() > 1)
                        input.value = lastChar.toString();
                }

                // If the key was a dead key, the next time a key is pressed, replace the diacritic that was
                // inserted with the replacement symbol typed.
                if (keyWasDead) replacePreviousWithNext = true;
            }
        }

        // Prevent the OS from doing anything with this input.
        event.preventDefault();

        // Did we make an update?
        if (edit) handleEdit(edit, IdleKind.Typing, true);
        else lastKeyDownIgnored = true;
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (evaluator === undefined) return;
        if (editor === null) return;

        // Assume we'll handle it.
        lastKeyDownIgnored = false;

        // If it was a dead key, don't handle it as a command, just remember that it was
        // a dead key, then let the input event above insert it.
        keyWasDead = event.key === 'Dead';
        if (keyWasDead) {
            return;
        }

        // Are we to replace the prior symbol with the next? Don't handle it as a command,
        // just let the character with diacritic remark be typed, and handle it in the input handler above.
        if (replacePreviousWithNext) return;

        const result = handleKeyCommand(event, {
            caret: $caret,
            evaluator,
            dragging: $dragged !== undefined,
            database: DB,
            toggleMenu,
        });

        // If it produced a new caret and optionally a new project, update the stores.
        const idle =
            event.key.length === 1 ? IdleKind.Typing : IdleKind.Navigating;

        if (result !== false) {
            if (result instanceof Promise)
                result.then((edit) => handleEdit(edit, idle, true));
            else if (result !== undefined && result !== true)
                handleEdit(result, idle, true);

            // Prevent default keyboard commands from being otherwise handled.
            event.preventDefault();
            event.stopPropagation();
        }
        // Give feedback that we didn't execute a command.
        else if (!/^(Shift|Control|Alt|Meta|Tab)$/.test(event.key))
            lastKeyDownIgnored = true;
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
<!-- svelte-ignore missing-declaration -->
<div
    class="editor {$evaluation !== undefined && $evaluation.playing
        ? 'playing'
        : 'stepping'}"
    class:readonly={!editable}
    class:dragging={dragCandidate !== undefined || $dragged !== undefined}
    data-uiid="editor"
    role="application"
    aria-label={`${$locale.ui.section.editor} ${source.getPreferredName(
        $locales
    )}`}
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
    data-id={source.id}
    bind:this={editor}
    on:pointerdown|stopPropagation|preventDefault={handlePointerDown}
    on:pointerup={handleRelease}
    on:pointermove={handlePointerMove}
    on:pointerleave={handlePointerLeave}
    on:dblclick|stopPropagation={(event) => {
        let node = getNodeAt(event, false);
        if (node) caret.set($caret.withPosition(node));
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
    <input
        type="text"
        id={getInputID()}
        data-defaultfocus
        aria-autocomplete="none"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="none"
        class="keyboard-input"
        style:left={caretLocation ? `${caretLocation.left}px` : null}
        style:top={caretLocation ? `${caretLocation.top}px` : null}
        bind:this={input}
        on:input={handleTextInput}
        on:keydown={handleKeyDown}
        on:focusin={() => (focused = true)}
        on:focusout={() => (focused = false)}
    />
    <!-- Render the program -->
    <RootView node={program} spaces={source.spaces} localized />
    <!-- Render highlights above the code -->
    {#each outlines as outline}
        <Highlight {...outline} types={outline.types} above={true} />
    {/each}

    <!-- Render the caret on top of the program -->
    <CaretView
        caret={$caret}
        {source}
        blink={$keyboardEditIdle === IdleKind.Idle && focused && editable}
        ignored={$evaluation !== undefined &&
            $evaluation.playing === true &&
            lastKeyDownIgnored}
        bind:location={caretLocation}
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
                ? `calc(${caretLocation.left}px - ${OutlinePadding}px)`
                : undefined}
            style:top={caretLocation ? `${caretLocation.bottom}px` : undefined}
            >{#if $caret.position instanceof Node}
                {@const relevantConcept = $concepts?.getRelevantConcept(
                    $caret.position
                )}
                {@const typeConcept =
                    $concepts && caretExpressionType
                        ? $concepts.getConceptOfType(caretExpressionType)
                        : undefined}
                <!-- Make a link to the node's documentation -->
                {#if relevantConcept}<ConceptLinkUI
                        link={relevantConcept}
                        label={DOCUMENTATION_SYMBOL}
                    />{/if}
                <!-- Show the node's label and type -->
                {$caret.position.getLabel(
                    $locale
                )}{#if caretExpressionType}&nbsp;{TYPE_SYMBOL}&nbsp;{#if typeConcept}<ConceptLinkUI
                            link={typeConcept}
                            label={caretTypeDescription}
                        />{:else}{caretTypeDescription}{/if}{/if}
                <PlaceholderView
                    position={$caret.position}
                />{/if}{#if document.activeElement === input}<div
                    class="screen-reader-description"
                    aria-live="polite"
                    aria-atomic="true"
                    aria-relevant="all"
                    lang={$caret.getLanguage() ?? null}
                    >{$caret.getDescription(
                        caretExpressionType,
                        conflictsOfInterest,
                        context
                    )}</div
                >{/if}</div
        >
    {/key}
    {#if source.isEmpty() && showHelp}
        <EditorHelp />
    {/if}
    {#if project.supplements.length > 0}
        <div class="output-preview-container">
            <Button
                tip={$locale.ui.description.showOutput}
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
                            value={evaluator.getLatestSourceValue(source)}
                            fullscreen={false}
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
        padding: calc(2 * var(--wordplay-spacing));
        flex: 1;
        cursor: text;
        margin-bottom: auto;
        min-width: fit-content;
        min-height: fit-content;
        display: flex;
        flex-direction: column;
        gap: var(--wordplay-spacing);
    }

    .editor.dragging {
        touch-action: none;
    }

    .editor.readonly {
        background: var(--wordplay-alternating-color);
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

    .screen-reader-description {
        font-size: 0;
    }

    .output-preview-container {
        position: sticky;
        bottom: var(--wordplay-spacing);
        right: var(--wordplay-spacing);
        display: inline-block;
        align-self: flex-end;
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
</style>
