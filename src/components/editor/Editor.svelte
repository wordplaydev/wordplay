<svelte:options immutable={true} />

<script lang="ts">
    import Node from '@nodes/Node';
    import Caret from './util/Caret';
    import { createEventDispatcher, onMount, setContext } from 'svelte';
    import UnicodeString from '@models/UnicodeString';
    import commands, { type Edit } from './util/Commands';
    import type Source from '@nodes/Source';
    import { writable } from 'svelte/store';
    import Exception from '@runtime/Exception';
    import type Program from '@nodes/Program';
    import Token from '@nodes/Token';
    import KeyboardIdle from './util/KeyboardIdle';
    import CaretView from './CaretView.svelte';
    import {
        CaretSymbol,
        HoveredSymbol,
        HighlightSymbol,
        InsertionPointsSymbol,
        getDragged,
        getSelectedOutput,
        getAnimatingNodes,
        getConflicts,
        getProjects,
        setSelectedOutput,
        getSelectedOutputPaths,
        getEvaluation,
    } from '../project/Contexts';
    import {
        preferredLanguages,
        preferredTranslations,
        writingDirection,
        writingLayout,
    } from '@translation/translations';
    import {
        type HighlightType,
        type Highlights,
        HighlightTypes,
        type HighlightSpec,
    } from './util/Highlights';
    import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
    import Expression from '@nodes/Expression';
    import TypePlaceholder from '@nodes/TypePlaceholder';
    import Type from '@nodes/Type';
    import Bind from '@nodes/Bind';
    import Block from '@nodes/Block';
    import TokenType from '@nodes/TokenType';
    import RootView from '../project/RootView.svelte';
    import type Project from '@models/Project';
    import type Conflict from '@conflicts/Conflict';
    import { tick } from 'svelte';
    import { getEditsAt } from './util/Autocomplete';
    import getOutlineOf, { getUnderlineOf } from './util/outline';
    import Highlight from './Highlight.svelte';
    import { afterUpdate } from 'svelte';
    import {
        dropNodeOnSource,
        getInsertionPoint,
        InsertionPoint,
    } from './Drag';
    import Menu from './util/Menu';
    import Evaluate from '@nodes/Evaluate';
    import { PhraseType } from '@output/Phrase';
    import { GroupType } from '@output/Group';
    import { VerseType } from '@output/Verse';
    import type Evaluator from '@runtime/Evaluator';

    export let evaluator: Evaluator;
    export let project: Project;
    export let source: Source;

    const SHOW_OUTPUT_IN_PALETTE = false;

    // A menu of potential transformations based on the caret position.
    // Managed here but displayed by the project to allow it to escape the editor view.
    export let menu: Menu | undefined = undefined;

    const projects = getProjects();
    const selectedOutput = getSelectedOutput();
    const selectedOutputPaths = getSelectedOutputPaths();
    const evaluation = getEvaluation();
    const animatingNodes = getAnimatingNodes();
    const nodeConflicts = getConflicts();

    const dispatch = createEventDispatcher();

    let input: HTMLInputElement | null = null;

    let editor: HTMLElement | null;

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    const caret = writable<Caret>(
        new Caret(source, project.getCaretPosition(source) ?? 0, undefined)
    );
    setContext(CaretSymbol, caret);

    // Whenever the project or source changes, set the caret to the project's caret for the source.
    const position = project.getCaretPosition(source);
    if (position) caret.set(new Caret(source, position, undefined));

    // A store of highlighted nodes, used by node views to highlight themselves.
    // We store centrally since the logic that determines what's highlighted is in the Editor.
    const highlights = writable<Highlights>(new Map());
    setContext(HighlightSymbol, highlights);

    // A store of what node is hovered over, excluding tokens, used in drag and drop.
    const hovered = writable<Node | undefined>(undefined);
    setContext(HoveredSymbol, hovered);

    // A store of what node is hovered over, including tokens.
    const hoveredAny = writable<Node | undefined>(undefined);

    const insertion = writable<InsertionPoint | undefined>(undefined);
    setContext(InsertionPointsSymbol, insertion);

    // A shorthand for the current program.
    $: program = source.expression;

    // A shorthand for the current evaluator
    let evaluatingNode: Node | undefined = undefined;

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
    onMount(() => focusHiddenTextField());

    async function evalUpdate() {
        if (evaluator === undefined || evaluator.isPlaying()) return;

        evaluatingNode = evaluator.getCurrentStep()?.node;

        // If the program contains this node, scroll it's first token into view.
        const stepNode = evaluator.getStepNode();
        if (stepNode && source.has(stepNode)) {
            // Set the caret to the current step node if stepping.
            caret.set(
                $caret.withPosition(
                    evaluator.isDone() ? source.expression.end : stepNode
                )
            );

            // Wait for everything to render, then find the node to scroll to.
            await tick();
            let highlight: Node | undefined = stepNode;
            let element = null;
            // Keep searching for a visible node, in case the step node is invisible.
            do {
                element = document.querySelector(
                    `[data-id="${highlight.id}"] .text`
                );
                if (element !== null) break;
                else highlight = source.root.getParent(highlight);
            } while (element === null && highlight !== undefined);

            if (element !== null) ensureElementIsVisible(element);
        }
    }

    // True if the last keyboard input was not handled by a command.
    let lastKeyDownIgnored = false;

    // Caret location comes from the caret
    let caretLocation:
        | { top: string; left: string; height: string; bottom: number }
        | undefined = undefined;

    // The store the contains the current node being dragged.
    let dragged = getDragged();

    // The point at which a drag started.
    let dragPoint: { x: number; y: number } | undefined = undefined;

    // The possible candidate for dragging
    let dragCandidate: Node | undefined = undefined;

    // When source changes, update various nested state from the source.
    $: caret.set($caret.withSource(source));

    // When the caret changes, if it's a node, focus on the node, and if it's an index, focus on the hidden text field.
    $: {
        // Hide the menu, if there is one.
        hideMenu();

        // If this editor contains the focus, choose an appropriate focus for the new caret.
        if (
            editor &&
            typeof document !== 'undefined' &&
            editor.contains(document.activeElement)
        ) {
            if ($caret.position instanceof Node && !$caret.isPlaceholder()) {
                // Clear the last input value
                lastKeyboardInputValue = undefined;
                // Focus the node that's selected.
                focusNodeCaret();
            } else {
                focusHiddenTextField();
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
                PhraseType,
                GroupType,
                VerseType
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

    function addHighlight(map: Highlights, node: Node, type: HighlightType) {
        if (source.has(node)) {
            if (!map.has(node)) map.set(node, new Set<HighlightType>());
            map.get(node)?.add(type);
        }
    }

    function updateHighlights() {
        const latestValue = evaluator.getLatestSourceValue(source);

        // Build a set of highlights to render.
        const newHighlights = new Map<Node, Set<HighlightType>>();

        // Is there a step we're actively evaluating? Highlight it!
        const stepNode = evaluator.getStepNode();
        if (stepNode) addHighlight(newHighlights, stepNode, 'evaluating');

        // Is there an exception on the last step? Highlight the node that created it!
        if (
            latestValue instanceof Exception &&
            latestValue.step !== undefined &&
            latestValue.step.node instanceof Node
        )
            addHighlight(newHighlights, latestValue.step.node, 'exception');

        // Is the caret selecting a node? Highlight it.
        if ($caret.position instanceof Node && !$caret.position.isPlaceholder())
            addHighlight(newHighlights, $caret.position, 'selected');

        // Is a node being dragged?
        if ($dragged !== undefined) {
            // Highlight the node.
            addHighlight(newHighlights, $dragged, 'dragged');

            // If there's something hovered or an insertion point, show targets and matches.
            // If we're hovered over a valid drop target, highlight the hovered node.
            if ($hovered && isValidDropTarget()) {
                addHighlight(newHighlights, $hovered, 'match');
            }
            // Otherwise, highlight targets.
            else if ($insertion === undefined) {
                // Find all of the expression placeholders and highlight them as drop targets,
                // unless they are dragged or contained in the dragged node
                if ($dragged instanceof Expression)
                    for (const placeholder of source.expression.nodes(
                        (n) => n instanceof ExpressionPlaceholder
                    ))
                        if (!$dragged.contains(placeholder))
                            addHighlight(newHighlights, placeholder, 'target');

                // Find all of the type placeholders and highlight them sa drop target
                if ($dragged instanceof Type)
                    for (const placeholder of source.expression.nodes(
                        (n) => n instanceof TypePlaceholder
                    ))
                        if (!$dragged.contains(placeholder))
                            addHighlight(newHighlights, placeholder, 'target');
            }
        }
        // Otherwise, is a node hovered over? Highlight it.
        else if ($hovered instanceof Node)
            addHighlight(newHighlights, $hovered, 'hovered');

        // Tag all nodes with primary conflicts as primary
        for (const [primary, conflicts] of project.getPrimaryConflicts())
            addHighlight(
                newHighlights,
                primary,
                conflicts.every((c) => !c.isMinor()) ? 'primary' : 'minor'
            );

        // Tag all nodes with secondary conflicts as primary
        for (const secondary of project.getSecondaryConflicts().keys())
            addHighlight(newHighlights, secondary, 'secondary');

        // Are there any poses in this file being animated?
        if ($animatingNodes)
            for (const animating of $animatingNodes) {
                if (source.has(animating))
                    addHighlight(newHighlights, animating, 'animating');
            }

        // Is any output selected?
        if ($selectedOutput) {
            for (const node of $selectedOutput)
                addHighlight(newHighlights, node, 'output');
        }

        // Does the selected node have a matching delimiter?
        if ($caret.position instanceof Token) {
            const match = source.getMatchedDelimiter($caret.position);
            if (match) {
                addHighlight(newHighlights, match, 'hovered');
            }
        }

        // Update the store, broadcasting the highlights to all node views for rendering.
        highlights.set(newHighlights);
    }

    // Update the highlights when any of these stores values change
    $: {
        if (
            $dragged ||
            $caret ||
            $hovered ||
            evaluatingNode ||
            $animatingNodes ||
            $nodeConflicts ||
            source ||
            $selectedOutput
        )
            updateHighlights();
    }

    // Update the outline positions any time the highlights.
    let outlines: HighlightSpec[] = [];
    $: {
        outlines = [];
        if ($highlights.size > 0) updateOutlines();
    }

    function updateOutlines() {
        outlines = [];
        for (const [node, types] of $highlights.entries()) {
            const nodeView = getNodeView(node);
            if (nodeView)
                outlines.push({
                    types: Array.from(types),
                    outline: getOutlineOf(nodeView),
                    underline: getUnderlineOf(nodeView),
                });
        }
    }

    // After updates, manage highlight classes on nodes
    afterUpdate(() => {
        updateOutlines();

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
        const view = editor?.querySelector(`.node-view[data-id="${node.id}"]`);
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

    function isValidDropTarget(): boolean {
        if ($dragged === undefined) return false;

        // Allow expressions to be dropped on expressions.
        if ($dragged instanceof Expression && $hovered instanceof Expression)
            return true;

        // Allow binds to be dropped on children of blocks.
        if ($dragged instanceof Bind && $hovered) {
            const hoverParent = $caret.source.root.getParent($hovered);
            if (
                hoverParent instanceof Block &&
                hoverParent.statements.includes($hovered as Expression)
            )
                return true;
        }

        // Allow types to be dropped on types.
        if ($dragged instanceof Type && $hovered instanceof Type) return true;

        // Allow inserts to be inserted.
        if ($insertion) return true;

        return false;
    }

    function handleRelease() {
        // Is the creator hovering over a valid drop target? If so, execute the edit.
        if (isValidDropTarget()) drop();

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
        $projects.revise(
            project,
            newProject.withCaret(newSource, newCaretPosition)
        );

        // Focus the node caret selected.
        focusNodeCaret();
    }

    function handleMouseDown(event: MouseEvent) {
        // Prevent the OS from giving the document body focus.
        event.preventDefault();

        placeCaretAt(event);

        if (evaluator.isStepping()) stepToNodeAt(event);

        // After we handle the click, focus on keyboard input, in case it's not focused.
        focusHiddenTextField();
    }

    function placeCaretAt(event: MouseEvent) {
        const tokenUnderMouse = getNodeAt(event, true);
        const nonTokenNodeUnderMouse = getNodeAt(event, false);
        const newPosition =
            // If shift is down, select the non-token node at the position.
            event.shiftKey && nonTokenNodeUnderMouse !== undefined
                ? nonTokenNodeUnderMouse
                : // If the node is a placeholder token, select it
                tokenUnderMouse instanceof Token &&
                  tokenUnderMouse.is(TokenType.PLACEHOLDER)
                ? tokenUnderMouse
                : // Otherwise choose an index position under the mouse
                  getCaretPositionAt(event);

        // If we found a position, set it.
        if (newPosition !== undefined)
            caret.set($caret.withPosition(newPosition));

        // Mark that the creator might want to drag the node under the mouse and remember where the click started.
        if (nonTokenNodeUnderMouse) {
            dragCandidate = nonTokenNodeUnderMouse;
            // If the primary mouse button is down, start dragging and set insertion.
            // We only start dragging if the cursor has moved more than a certain amount since last click.
            if (dragCandidate && event.buttons === 1)
                dragPoint = { x: event.clientX, y: event.clientY };
        }
    }

    function stepToNodeAt(event: MouseEvent) {
        if (evaluator === undefined) return;

        const nodeUnderMouse = getNodeAt(event, false);
        if (nodeUnderMouse) {
            const evaluable = evaluator.getEvaluableNode(nodeUnderMouse);
            if (evaluable) evaluator.stepToNode(evaluable);
        }
    }

    function getNodeAt(event: MouseEvent, includeTokens: boolean) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        // Only return a node if hovering over its text. Space isn't eligible.
        if (el instanceof HTMLElement && el.classList.contains('text')) {
            const nodeView = el.closest(
                `.node-view${includeTokens ? '' : ':not(.Token)'}`
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
        const tokenView = textOrSpace.closest('.Token');
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

    function getCaretPositionAt(event: MouseEvent): number | undefined {
        // What element is under the mouse?
        const elementAtCursor = document.elementFromPoint(
            event.clientX,
            event.clientY
        );

        // If there's no element (which should be impossible), return nothing.
        if (elementAtCursor === null) return undefined;
        if (editor === null) return undefined;

        // If there's text, figure out what position in the text to place the caret.
        if (elementAtCursor.classList.contains('text')) {
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
        // If its the editor, find the closest token and choose either it's right or left side.
        // Map the token text to a list of vertical and horizontal distances
        const closestToken = Array.from(editor.querySelectorAll('.token-view'))
            .map((tokenView) => {
                const textView = tokenView.querySelector('.text');
                const textRect = textView?.getBoundingClientRect();
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
                    hidden: textView && textView.closest('.hide') !== null,
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
            const index = $caret.source.getTokenSpacePosition(
                closestLine.token
            );
            return index
                ? index +
                      source.spaces
                          .getSpace(closestLine.token)
                          .split('\n', closestLine.index)
                          .join('\n').length +
                      1
                : undefined;
        }

        // Otherwise, choose the last position if nothing else matches.
        return source.getTokenLastPosition(source.expression.end);
    }

    function getInsertionPointsAt(event: MouseEvent) {
        // Is the caret position between tokens? If so, are any of the token's parents inside a list in which we could insert something?
        const position = getCaretPositionAt(event);
        if (position !== undefined) {
            const caret = new Caret(source, position, undefined);
            const token = caret.getToken();
            if (token === undefined) return [];
            // What is the space prior to this insertion point?
            const index = source.getTokenSpacePosition(token);
            if (index === undefined) return [];
            const spacePrior = source.spaces
                .getSpace(token)
                .substring(0, position - index);

            // How many lines does the space prior include?
            const line = spacePrior.split('\n').length - 1;

            // What nodes are between this and are any of them insertion points?
            const between = caret.getNodesBetween();

            // If there are nodes between the point, construct insertion points
            // that exist in lists.
            return between === undefined
                ? []
                : [
                      ...between.before.map((tree) =>
                          getInsertionPoint(source, tree, true, token, line)
                      ),
                      ...between.after.map((tree) =>
                          getInsertionPoint(source, tree, false, token, line)
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
                      );
        }
        return [];
    }

    function exceededDragThreshold(event: MouseEvent) {
        return (
            dragPoint === undefined ||
            Math.sqrt(
                Math.pow(event.clientX - dragPoint.x, 2) +
                    Math.pow(event.clientY - dragPoint.y, 2)
            ) >= 5
        );
    }

    function handleMouseMove(event: MouseEvent) {
        if (evaluator === undefined) return;

        if (evaluator.isPlaying()) handleEditHover(event);
        else handleDebugHover(event);
    }

    function handleEditHover(event: MouseEvent) {
        // By default, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(event, false));
        hoveredAny.set(getNodeAt(event, true));

        // If we have a drag candidate and it's past 5 pixels from the start point, set the insertion points to whatever points are under the mouse.
        if (dragCandidate && exceededDragThreshold(event)) {
            dragged.set(dragCandidate);
            dragCandidate = undefined;
            dragPoint = undefined;
        }

        // Update insertion points if there's nothing hovered.
        if ($dragged) {
            // Get the insertion points at the current mouse position
            // And filter them by kinds that match, getting the field's allowed types,
            // and seeing if the dragged node is an instance of any of the dragged types.
            // This only works if the types list contains a single item that is a list of types.

            insertion.set(
                $hovered
                    ? undefined
                    : getInsertionPointsAt(event).filter((insertion) => {
                          const types = insertion.node.getAllowedFieldNodeTypes(
                              insertion.field
                          );
                          return (
                              $dragged &&
                              Array.isArray(types) &&
                              Array.isArray(types[0]) &&
                              types[0].some((kind) => $dragged instanceof kind)
                          );
                      })[0]
            );
        }
    }

    function handleDebugHover(event: MouseEvent) {
        if (evaluator === undefined) return;

        const node = getNodeAt(event, false);

        // if the node is associated with a step, set it, otherwise unset it.
        hovered.set(
            evaluator.isDone() || node === undefined
                ? undefined
                : evaluator.getEvaluableNode(node)
        );
    }

    function handleMouseLeave() {
        hovered.set(undefined);
        insertion.set(undefined);
    }

    async function showMenu() {
        if (evaluator === undefined) return;

        // Is the caret on a specific token or node?
        const node =
            $caret.position instanceof Node
                ? $caret.position
                : $caret.getToken() ?? undefined;
        if (node === undefined) return;

        // Get the unique valid edits at the caret.
        const transforms = getEditsAt(project, $caret);

        // Wait for everything to be rendered so we can get the position of things.
        await tick();

        // Make a menu, but without a location, so other things know there's a menu while we're waiting.
        menu = new Menu($caret, transforms, 0, handleEdit);
    }

    // Always show the menu if the caret is after a property reference.
    // This is annoying; disabling it.
    // $: {
    //     if (
    //         $playing &&
    //         ($caret.tokenPrior?.is(TokenType.ACCESS) ||
    //             ($caret.tokenPrior !== undefined &&
    //                 $caret.tokenPrior.is(TokenType.NAME) &&
    //                 source
    //                     .getTokenBefore($caret.tokenPrior)
    //                     ?.is(TokenType.ACCESS)))
    //     )
    //         showMenu();
    //     else hideMenu();
    // }

    function handleKeyDown(event: KeyboardEvent) {
        if (evaluator === undefined) return;
        if (editor === null) return;

        // Assume we'll handle it.
        lastKeyDownIgnored = false;

        if (menu !== undefined) {
            if (event.key === 'ArrowDown') {
                menu = menu.down();
                event.stopPropagation();
                return;
            } else if (event.key === 'ArrowUp') {
                menu = menu.up();
                event.stopPropagation();
                return;
            } else if (
                event.key === 'Enter' &&
                menu.selection !== undefined &&
                menu.transforms.length > 0
            ) {
                menu.doEdit($preferredLanguages);
                hideMenu();
                return;
            }
        }

        if ($caret.isNode() && event.key === 'Enter') {
            // If there's no menu showing, show one, then return.
            if (menu === undefined) {
                showMenu();
                if (menu !== undefined) return;
            }
            // Rid of the menu.
            else {
                hideMenu();
                return;
            }
        }

        // Map meta to control on Mac OS/iOS.
        const control = event.metaKey || event.ctrlKey;

        // Loop through the commands and see if there's a match to this event.
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            // Does this command match the event?
            if (
                (command.control === undefined ||
                    command.control === control) &&
                (command.shift === undefined ||
                    command.shift === event.shiftKey) &&
                (command.alt === undefined || command.alt === event.altKey) &&
                (command.key === undefined ||
                    command.key === event.code ||
                    command.key === event.key) &&
                (command.mode === undefined ||
                    evaluator.getMode() === command.mode)
            ) {
                // If so, execute it.
                const result = command.execute(
                    $caret,
                    editor,
                    evaluator,
                    event.code
                );

                // If it produced a new caret and optionally a new project, update the stores.
                if (result !== undefined) {
                    if (typeof result === 'boolean') {
                        if (result === false) lastKeyDownIgnored = true;
                    } else if (result instanceof Promise)
                        result.then((edit) => handleEdit(edit));
                    else handleEdit(result);

                    // Prevent default keyboard commands from being otherwise handled.
                    event.preventDefault();

                    // Stop looking for commands, we found one and tried it!
                    return;
                }
            }
        }

        // Give feedback that we didn't execute a command.
        if (!/^(Shift|Control|Alt|Meta)$/.test(event.key))
            lastKeyDownIgnored = true;
    }

    async function handleEdit(edit: Edit | undefined) {
        if (edit === undefined) return;

        const unmodified = edit instanceof Caret;

        // Get the new caret and source to display.
        const newCaret = unmodified ? edit : edit[1];
        const newSource = unmodified ? undefined : edit[0];

        // Update the caret and project.
        if (newSource) {
            $projects.revise(
                project,
                project
                    .withSource(source, newSource)
                    .withCaret(newSource, newCaret.position)
            );
            caret.set(newCaret.withSource(newSource));
        } else {
            caret.set(newCaret);
        }

        // After every edit and everything is updated, focus back on on text input
        await tick();
        if (caretLocation && !unmodified && $caret.isIndex())
            focusHiddenTextField();
    }

    function focusHiddenTextField() {
        input?.focus();
    }

    async function focusNodeCaret() {
        await tick();
        if ($caret.position instanceof Node) {
            let current: Node | undefined = $caret.position;
            do {
                const view = getNodeView(current);
                if (view) {
                    view.focus();
                    break;
                }
                current = source.root.getParent(current);
            } while (current !== undefined);
        }
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
        if (edit) handleEdit(edit);
        else lastKeyDownIgnored = true;
    }

    function hideMenu() {
        menu = undefined;
    }
</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={handleRelease} />

<section
    class="editor {$evaluation !== undefined && $evaluation.playing
        ? 'playing'
        : 'stepping'}"
    aria-label={`${
        $preferredTranslations[0].ui.section.editor
    } ${source.getTranslation($preferredLanguages)}`}
    style:direction={$writingDirection}
    style:writing-mode={$writingLayout}
    data-id={source.id}
    bind:this={editor}
    on:mousedown={(event) => handleMouseDown(event)}
    on:dblclick={(event) => {
        let node = getNodeAt(event, false);
        if (node) caret.set($caret.withPosition(node));
    }}
    on:mouseup={handleRelease}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
    on:keydown={handleKeyDown}
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
    <RootView node={program} spaces={source.spaces} />
    <!-- Render highlights above the code -->
    {#each outlines as outline}
        <Highlight {...outline} types={outline.types} above={true} />
    {/each}

    <!-- Render the caret on top of the program -->
    <CaretView
        {source}
        blink={$KeyboardIdle &&
            $evaluation !== undefined &&
            $evaluation.playing === true}
        ignored={$evaluation !== undefined &&
            $evaluation.playing === true &&
            lastKeyDownIgnored}
        bind:location={caretLocation}
    />
    <!-- If the caret is a position, render the invisible text field that allows us to capture inputs -->
    <input
        type="text"
        class="keyboard-input"
        style={`left: ${caretLocation?.left ?? 0}; top: ${
            caretLocation?.top ?? 0
        };`}
        bind:this={input}
        on:input={handleTextInput}
    />
</section>

<style>
    .editor {
        white-space: nowrap;
        line-height: var(--wordplay-code-line-height);
        position: relative;
        user-select: none;
        padding: calc(2 * var(--wordplay-spacing));
        min-height: 100%;
        min-width: 100%;
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        opacity: 0;
        width: 1px;
        pointer-events: none;

        /* Helpful for debugging */
        /* outline: 1px solid red;
        opacity: 1;
        width: 10px; */
    }
</style>
