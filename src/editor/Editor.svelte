<script lang="ts">
    import { project, updateProject } from '../models/stores';
    import type Transform from "../transforms/Transform";
    import Node from '../nodes/Node';
    import Caret, { insertionPointsEqual, type InsertionPoint } from '../models/Caret';
    import { afterUpdate, onDestroy, setContext } from 'svelte';
    import UnicodeString from '../models/UnicodeString';
    import commands, { type Edit } from './Commands';
    import NodeView from './NodeView.svelte';
    import type Source from '../models/Source';
    import { writable } from 'svelte/store';
    import Exception from '../runtime/Exception';
    import Program from '../nodes/Program';
    import Menu from './Menu.svelte';
    import Token from '../nodes/Token';
    import KeyboardIdle from '../models/KeyboardIdle';
    import CaretView from './CaretView.svelte';
    import { PLACEHOLDER_SYMBOL } from '../parser/Tokenizer';
    import { CaretSymbol, HoveredSymbol, HighlightSymbol, InsertionPointsSymbol, getLanguages, getDragged } from './Contexts';
    import type { HighlightType, Highlights } from './Highlights'
    import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
    import Expression from '../nodes/Expression';
    import TypePlaceholder from '../nodes/TypePlaceholder';
    import Type from '../nodes/Type';
    import Bind from '../nodes/Bind';
    import Block, { type Statement } from '../nodes/Block';
    import TokenType from '../nodes/TokenType';
    import StructureDefinition from '../nodes/StructureDefinition';

    export let source: Source;

    let editor: HTMLElement;
    let textInput: HTMLInputElement;

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    let caret = writable<Caret>(new Caret(source, 0));

    // A store of highlighted nodes, used by node views to highlight themselves.
    // We store centrally since the logic that determines what's highlighted is in the Editor.
    let highlights = writable<Highlights>(new Map());
    setContext(HighlightSymbol, highlights);

    // A store of what node is hovered over, used in drag and drop.
    let hovered = writable<Node|undefined>(undefined);
    setContext(HoveredSymbol, hovered);

    let insertions = writable<Map<Token,InsertionPoint>>(new Map());
    setContext(InsertionPointsSymbol, insertions);

    // A shorthand for the current program.
    let program = source.program;

    // A shorthand for the currently evaluating step, if there is one.
    let executingNode = source.getEvaluator().currentStep()?.node;

    // Focused when the active element is the text input.
    let focused = false;

    // True if the last keyboard input was not handled by a command.
    let lastKeyDownIgnored = false;

    // Caret location comes from the caret
    let caretLocation: { top: string, left: string, height: string, bottom: number } | undefined = undefined;

    // A menu of potential transformations based on the caret position.
    let menu: {
        node: Node,
        location: { left: string, top: string } | undefined,
        transforms: Transform[],
    } | undefined = undefined;

    // Triggered by escape.
    let menuVisible = false;

    let menuSelection: number = -1;

    $: languages = getLanguages();
    $: dragged = getDragged();

    // When keyboard idle changes to false, reset the menu if nothing is selected.
    const menuKeyboardIdleReset = KeyboardIdle.subscribe(idle => {
        // Sart by assuming there shouldn't be a menu.
        if(!idle && menuSelection < 0)
            hideMenu();
    });
    onDestroy(menuKeyboardIdleReset);

    // When caret changes, reset the menu
    const menuResetCaretChange = caret.subscribe(() => {
        hideMenu();
    });
    onDestroy(menuResetCaretChange);

    // When source changes, update various nested state from the source.
    $: {
        program = source.program;
        caret.set($caret.withSource(source));
        setContext(CaretSymbol, caret);
        executingNode = source.getEvaluator().currentStep()?.node;
    }

    // When the caret location changes, position the menu and invisible input, and optionally scroll to the caret.
    $: {
        if(caretLocation !== undefined && menuVisible && menu !== undefined) {
            menu = {
                node: menu.node,
                transforms: menu.transforms,
                location: { left: caretLocation.left, top: `${caretLocation.bottom}px` }
            }
        }
        else menuVisible = false;
    }

    // When the editor view changes, position selections, the menu, and scroll the caret or executing node into view
    // and make sure the text input field is in focus.
    afterUpdate(() => {
        if(editor === undefined || editor === null) return;

        // Position the menu if a node is selected.
        if(menu !== undefined && editor !== undefined && $caret.isNode()) {
            const viewport = editor.parentElement;
            const el = getNodeView(menu.node);
            if(el && viewport) {
                const placeholderRect = el.getBoundingClientRect();
                const viewportRect = viewport.getBoundingClientRect();
                // Yay, we have everything we need to show a menu!
                menu = {
                    node: menu.node,
                    transforms: menu.transforms,
                    location: {
                        left: `${placeholderRect.left - viewportRect.left + viewport.scrollLeft}px`,
                        top: `${placeholderRect.top - viewportRect.top + viewport.scrollTop + ($caret.isIndex() ? placeholderRect.height : Math.min(placeholderRect.height, 100)) + 10}px`
                    }
                }
            }
        }

        // If the program contains this node, scroll it's first token into view.
        if(executingNode instanceof Node && source.program.contains(executingNode)) {
            const element = document.querySelector(`[data-id="${executingNode.id}"] .token-view`);
            if(element !== null) {
                ensureElementIsVisible(element);
            }
        }

    });

    function addHighlight(map: Highlights, node: Node, type: HighlightType) {

        if(!map.has(node))
            map.set(node, new Set<HighlightType>());
        map.get(node)?.add(type);

    }

    // We should replace if there are no insertions or we're hovered over a placeholder.
    function shouldReplace() { return $insertions.size === 0 || $hovered instanceof ExpressionPlaceholder || $hovered instanceof TypePlaceholder; }

    function updateHighlights() {

        const currentStep = $caret.source.getEvaluator().currentStep();
        const latestValue = $caret.source.getEvaluator().getLatestResult();

        // Build a set of highlights to render.
        const newHighlights = new Map<Node, Set<HighlightType>>();

        // Is there a step we're actively executing? Highlight it!
        if(currentStep?.node instanceof Node)
            addHighlight(newHighlights, currentStep.node, "executing");

        // Is there an exception on the last step? Highlight the node that created it!
        if(latestValue instanceof Exception && latestValue.step !== undefined && latestValue.step.node instanceof Node)
            addHighlight(newHighlights, latestValue.step.node, "exception");

        // Is the caret selecting a node? Highlight it.
        if($caret.position instanceof Node)
            addHighlight(newHighlights, $caret.position, "selected");

        // Is a node being dragged? 
        if($dragged instanceof Node) {

            // Highlight the node.
            addHighlight(newHighlights, $dragged, "dragged");

            // If there's an insertion point, let the nodes render them
            if(shouldReplace()) {

                // If we're hovered over a valid drop target, highlight the hovered node.
                if($hovered && isValidDropTarget()) {
                    addHighlight(newHighlights, $hovered, "match");
                }
                // Otherwise, highlight targets.
                else {                
                    // Find all of the expression placeholders and highlight them as drop targets,
                    // unless they are dragged or contained in the dragged node
                    if($dragged instanceof Expression)
                        for(const placeholder of source.program.nodes(n => n instanceof ExpressionPlaceholder))
                            if(!$dragged.contains(placeholder))
                                addHighlight(newHighlights, placeholder, "target");

                    // Find all of the type placeholders and highlight them sa drop target
                    if($dragged instanceof Type)
                        for(const placeholder of source.program.nodes(n => n instanceof TypePlaceholder))
                            if(!$dragged.contains(placeholder))
                                addHighlight(newHighlights, placeholder, "target");
                }
            }

        }
        // Otherwise, is a node hovered over? Highlight it.
        else if($hovered instanceof Node)
            addHighlight(newHighlights, $hovered, "hovered");

        // Tag all nodes with primary conflicts as primary
        for(const primary of source.getPrimaryConflicts().keys())
            addHighlight(newHighlights, primary, "primary");

        // Tag all nodes with secondary conflicts as primary
        for(const secondary of source.getPrimaryConflicts().keys())
            addHighlight(newHighlights, secondary, "secondary");

        // Update the store, broadcasting the highlights to all node views for rendering.
        highlights.set(newHighlights);

    }

    // Update the highlights when any of these stores change.
    $: {
        if($dragged || $caret || $hovered || executingNode)
            updateHighlights();
    }

    function getNodeView(node: Node): HTMLElement | undefined {
        const view = editor.querySelector(`.node-view[data-id="${node.id}"]`);
        return view instanceof HTMLElement ? view : undefined;
    }

    function getTokenByView(program: Program, tokenView: Element) {
        if(tokenView instanceof HTMLElement && tokenView.dataset.id !== undefined) {
            const node = program.getNodeByID(parseInt(tokenView.dataset.id));
            return node instanceof Token ? node : undefined;
        }
        return undefined;
    }

    function ensureElementIsVisible(element: Element) {

        const viewport = editor?.parentElement;
        if(viewport === null) return;

        element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center"});

    }

    function isValidDropTarget(): boolean {

        if($dragged === undefined) return false;

        // Allow expressions ot be dropped on expressions.
        if($dragged instanceof Expression && $hovered instanceof Expression)
            return true;

        // Allow binds to be dropped on children of blocks.
        if($dragged instanceof Bind && $hovered) {
            const hoverParent = $hovered.getParent();
            if(hoverParent instanceof Block && hoverParent.statements.includes($hovered as Statement))
                return true;
        }

        // Allow types to be dropped on types.
        if($dragged instanceof Type && $hovered instanceof Type)
            return true;

        // Allow inserts to be inserted.
        if($insertions.size > 0) return true;

        return false;

    }

    function handleMouseUp() {

        // Is the creator hovering over a valid drop target? If so, execute the edit.
        if(isValidDropTarget())
            drop();

        // Reset the insertion points.
        insertions.set(new Map());

    }

    function drop() {

        if($dragged === undefined) return;

        let editedProgram = source.program;
        const draggedNode: Node = $dragged;
        const insertion = Array.from($insertions.values())[0];

        // Label the dragged node so we can find it later.
        draggedNode.label("dragged");

        // This is the node that will either be replaced or contains the list in which we will insert the dragged node.
        // For replacements its the node that the creator is hovered over, and for insertions its the node that contains the list we're inserting into.
        let replacedOrListContainingNode: Node | undefined = shouldReplace() ? $hovered : insertion.node;

        const newSources: [Source, Source][] = [];

        // If the dragged node is in a program, remove it if in a list or replace it with an expression placeholder if not.
        // If it's not in a program, it's probably coming from a palette or the visual clipboard.
        const draggedRoot = draggedNode.getRoot();
        if(draggedRoot instanceof Program) {

            // Figure out what to replace the dragged node with. By default, we remove it.
            let replacement = undefined;

            // If the node isn't in a list, then we replace it with an expression placeholder, to preserve syntax.
            if(!draggedNode.inList()) {
                // Make a placeholder to replace the hovered node.
                replacement = 
                    draggedNode instanceof Block && draggedNode.getParent() instanceof StructureDefinition ? undefined :
                    draggedNode instanceof Expression ? (new ExpressionPlaceholder()).withPrecedingSpace(draggedNode.getPrecedingSpace(), true) :
                    draggedNode instanceof Type ? (new TypePlaceholder()).withPrecedingSpace(draggedNode.getPrecedingSpace(), true) :
                    undefined;
            }

            // If it's from this program, then update this program.
            if(draggedRoot === editedProgram) {
                // Remember where it is in the tree
                const pathToReplacedOrListContainingNode = replacedOrListContainingNode?.getPath();
                // Replace the dragged node with the placeholder or nothing, effectively removing the node we're moving from the program.
                editedProgram = editedProgram.clone(false, draggedNode, replacement);
                // Update the node to replace to the cloned node.
                replacedOrListContainingNode = pathToReplacedOrListContainingNode === undefined ? undefined : editedProgram.resolvePath(pathToReplacedOrListContainingNode);
            }
            // If it's from another program, then update that program.
            else if(draggedRoot instanceof Program) {
                // Find the source that contains the dragged root.
                const source = $project.getSourceWithProgram(draggedRoot);
                // If we found one, update the project with a new source with a new program that replaces the dragged node with the placeholder.
                if(source)
                    newSources.push([ source, source.withProgram(draggedRoot.clone(false, draggedNode, replacement)) ]);
            }
            // If it was from a palette, do nothing, since there's nothing to remove.

        }

        // If we should replace and we still have a hovered node, replace the hovered node with the dragged node, preserving preceding space.
        if(replacedOrListContainingNode) {
            if(shouldReplace()) {
                const dragClone = draggedNode.withPrecedingSpace(replacedOrListContainingNode.getPrecedingSpace(), true);
                editedProgram = editedProgram.clone(false, replacedOrListContainingNode, dragClone);            
                newSources.push([ source, source.withProgram(editedProgram) ]);
            }
            // If we're not replacing, and there's something to insert, insert!
            else if($insertions.size > 0) {

                const listToUpdate = replacedOrListContainingNode.getField(insertion.field);
                if(Array.isArray(listToUpdate)) {

                    // Get the index at which to split space.
                    const spaceToSplit = insertion.token.getPrecedingSpace();
                    const spaceInsertionIndex = spaceToSplit.split("\n", insertion.line).join("\n").length + 1;
                    const spaceBefore = spaceToSplit.substring(0, spaceInsertionIndex);
                    const spaceAfter = spaceToSplit.substring(spaceInsertionIndex);

                    // Remember the index of the token inserted before.
                    const indexOfTokenInsertedBefore = source.program.nodes(n => n instanceof Token).indexOf(insertion.token);

                    // Clone the dragged node, but add to it the space preceding the token we're inserting before.
                    const dragClone = draggedNode.withPrecedingSpace(spaceBefore, true);

                    // If we're inserting into the same list the dragged node is from, then it was already removed from the list above.
                    // If we're inserting after it's prior location, then the index is now 1 position to high, because everything shifted down.
                    // Therefore, if the node of the insertion is in the list inserted, we adjust the insertion index.
                    const indexOfDraggedNodeInList = insertion.list.indexOf(draggedNode);
                    const insertionIndex = insertion.index + (indexOfDraggedNodeInList >= 0 && insertion.index > indexOfDraggedNodeInList ? 1 : 0);
                    // Replace the list with a new list that has the dragged node inserted.
                    const clonedListParent = replacedOrListContainingNode.clone(
                        false, 
                        listToUpdate, 
                        [ 
                            ...listToUpdate.slice(0, insertionIndex).map(n => n.clone(false)), 
                            dragClone,
                            ...listToUpdate.slice(insertionIndex).map(n => n.clone(false))
                        ]
                    );

                    // Update the program with the new list parent.
                    editedProgram = editedProgram.clone(false, replacedOrListContainingNode, clonedListParent);

                    // Find the token after the last token of the node we inserted and give it the original space after the insertion point.
                    let tokenInsertedBefore = editedProgram.nodes(n => n instanceof Token)[indexOfTokenInsertedBefore + dragClone.nodes(n => n instanceof Token).length] as Token;
                    if(tokenInsertedBefore)
                        editedProgram = editedProgram.clone(false, tokenInsertedBefore, tokenInsertedBefore.withPrecedingSpace(spaceAfter, true));

                    const newSource = source.withProgram(editedProgram);
                    newSources.push([ source, newSource]);

                }

            }

            // Using the label, set the cursor to the dragged node, then unlabel the sources.
            for(const source of newSources) {
                const newDragged = source[1].program.findNodeWithLabel("dragged");
                if(newDragged) {
                    caret.set($caret.withPosition(newDragged));
                    break;
                }
                source[1].program.unlabelAll();
            }

            // Update the project with the new source files
            updateProject($project.withSources(newSources));

        }

    }

    function placeCaretAtPosition(event: MouseEvent) {

        // Prevent the OS from giving the document body focus.
        event.preventDefault();

        const tokenUnderMouse = getNodeAt(event, true);
        const nonTokenNodeUnderMouse = getNodeAt(event, false);
        const newPosition = 
                // If shift is down, select the non-token node at the position.
                event.shiftKey && nonTokenNodeUnderMouse !== undefined ? nonTokenNodeUnderMouse :
                // If the node is a placeholder token, select it
                tokenUnderMouse instanceof Token && tokenUnderMouse.is(TokenType.PLACEHOLDER) ? tokenUnderMouse :
                // Otherwise choose an index position under the mouse
                getCaretPositionAt(event);

        // If we found a position, set it.
        if(newPosition !== undefined)
            caret.set($caret.withPosition(newPosition));

        // After we place the caret, focus on keyboard input, in case it's not focused.
        textInput.focus();

    }
    
    function getNodeAt(event: MouseEvent, includeTokens: boolean) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        // Only return a node if hovering over its text. Space isn't eligible.
        if(el instanceof HTMLElement && el.classList.contains("text")) {
            const nodeView = el.closest(`.node-view${includeTokens ? "" : ":not(.Token)"}`);
            if(nodeView instanceof HTMLElement && nodeView.dataset.id) {
                return source.program.getNodeByID(parseInt(nodeView.dataset.id))
            }
        }
        return undefined;
    }

    function getTokenFromElement(textOrSpace: Element): [ Token, Element ] | undefined {
        const tokenView = textOrSpace.closest(".Token");
        const token = tokenView === null ? undefined : getTokenByView($caret.getProgram(), tokenView)
        return tokenView === null || token === undefined ? undefined : [ token, tokenView ];
    }

    function getCaretPositionAt(event: MouseEvent): number | undefined {

        // What element is under the mouse?
        const elementAtCursor = document.elementFromPoint(event.clientX, event.clientY);

        // If there's no element (which should be impossible), return nothing.
        if(elementAtCursor === null) return undefined;

        // If there's text, figure out what position in the text to place the caret.
        if(elementAtCursor.classList.contains("text")) {
            // Find the token this corresponds to.
            const [ token, tokenView ] = getTokenFromElement(elementAtCursor) ?? [];
            // If we found a token, find the position in it corresponding to the mouse position.
            if(token instanceof Token && tokenView instanceof Element && event.target instanceof Element) {
                const startIndex = $caret.source.getTokenTextIndex(token);
                const lastIndex = $caret.source.getTokenLastIndex(token);
                if(startIndex !== undefined && lastIndex !== undefined) {
                    // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
                    const targetRect = event.target.getBoundingClientRect();
                    const tokenRect = elementAtCursor.getBoundingClientRect();
                    const offset = event.offsetX + (targetRect.left - tokenRect.left);
                    const newPosition = Math.max(startIndex, Math.min(lastIndex, startIndex + (tokenRect.width === 0 ? 0 : Math.round(token.getTextLength() * (offset / tokenRect.width)))));
                    return newPosition;
                }
            }
        }
        // If its the editor, find the closest text and choose either it's right or left side.
        // Map the token text to a list of vertical and horizontal distances
        const closestText = Array.from(editor.querySelectorAll(".token-view")).map(tokenView => {
            const textView = tokenView.querySelector(".text");
            const textRect = textView?.getBoundingClientRect();
            return {
                view: tokenView,
                textDistance: textRect === undefined ? Number.POSITIVE_INFINITY : Math.abs(event.clientY - (textRect.top + textRect.height / 2)),
                textTop: textRect === undefined ? Number.POSITIVE_INFINITY : textRect.top,
                textBottom: textRect === undefined ? Number.POSITIVE_INFINITY : textRect.bottom,
                leftDistance: textRect === undefined ? Number.POSITIVE_INFINITY : Math.abs(event.clientX - textRect.left),
                rightDistance: textRect === undefined ? Number.POSITIVE_INFINITY : Math.abs(event.clientX - textRect.right)
            };
        })
        // Sort by increasing horizontal distance from the smaller of view's left and right
        .sort((a, b) => Math.min(a.leftDistance, a.rightDistance) - Math.min(b.leftDistance, b.rightDistance))
        // Sort by increasing vertical distance from the smaller of view's space top and text middle.
        .sort((a, b) => a.textDistance - b.textDistance)
        // Choose the closest.
        [0];

        // If we found one, choose either 1) the nearest empty line or 2) its left or right side of text.
        if(closestText) {
            const [ token ] = getTokenFromElement(closestText.view) ?? [];
            if(token === undefined) return undefined;
            // If the mouse was within the vertical bounds of the text, choose its left or right.
            if(event.clientY < closestText.textBottom && event.clientY >= closestText.textTop) {
                return closestText.leftDistance < closestText.rightDistance ? 
                    $caret.source.getTokenTextIndex(token) : 
                    $caret.source.getTokenLastIndex(token)
            }
        }

        // Otherwise, if the mouse wasn't within the vertical bounds of the nearest token text, choose the nearest empty line.
        type BreakInfo = { token: Token, offset: number, index: number};

        // Find all tokens with empty lines and choose the nearest.
        const closestLine = 
            // Find all of the token line breaks, which are wrapped in spans to enable consistent measurement.
            // This is because line breaks and getBoundingClientRect() are jumpy depending on what's around them.
            Array.from(editor.querySelectorAll(".space br"))
            // Map each one to 1) the token, 2) token view, 3) line break top, 4) index within each token's space
            .map(br => {
                const [ token, tokenView ] = getTokenFromElement(br) ?? [];
                // Check the br container, which gives us a more accurate bounding client rect.
                const rect = (br.parentElement as HTMLElement).getBoundingClientRect();
                return tokenView === undefined || token === undefined ? 
                    undefined :
                    {
                        token,
                        offset: Math.abs((rect.top - rect.height / 2) - event.clientY),
                        // We add one because the position of the span that contains the <br/> is one line above the br,
                        // but we actually want to measure the line after the br.
                        index: Array.from(tokenView.querySelectorAll("br")).indexOf(br as HTMLBRElement) + 1
                    }
            })
            // Filter out any empty breaks that we couldn't find
            .filter<BreakInfo>((br: BreakInfo | undefined): br is BreakInfo => br !== undefined)
            // Sort by increasing offset from mouse y
            .sort((a, b) => a.offset - b.offset)
            // Chose the closest
            [0];

        // If we have a closest line, find the line number
        if(closestLine)
            return $caret.source.getTokenSpaceIndex(closestLine.token) + closestLine.token.space.split("\n", closestLine.index).join("\n").length;

        // Otherwise, choose nothing.
        return undefined;
    }

    function getInsertionPoint(node: Node, before: boolean, token: Token, line: number) {

        const parent = node.getParent();
        if(parent === undefined) return;

        // Find the list this node is either in or delimits.
        let field = node.getContainingParentList(before);
        if(field === undefined) return;
        const list = parent.getField(field);
        if(!Array.isArray(list)) return undefined;
        const index = list.indexOf(node);
        return {
            node: parent,
            field: field,
            list: list,
            token: token,
            line: line,
            // Account empty lists
            index: index < 0 ? 0 : index + (before ? 0 : 1)
        };

    }

    function getInsertionPointsAt(event: MouseEvent) {

        // Is the caret position between tokens? If so, are any of the token's parents inside a list in which we could insert something?
        const position = getCaretPositionAt(event);
        if(position) {            
            const caret = new Caret(source, position);
            const token = caret.getToken();
            if(token === undefined) return [];
            // What is the space prior to this insertion point?
            const spacePrior = token === undefined ? "" : token.space.substring(0, position - source.getTokenSpaceIndex(token));

            // How many lines does the space prior include?
            const line = spacePrior.split("\n").length - 1;

            // What nodes are between this and are any of them insertion points?
            const between = caret.getNodesBetween();

            // If there are nodes between the point, construct insertion points
            // that exist in lists.
            return between === undefined ? [] :
                [
                    ...between.before.map(node => getInsertionPoint(node, true, token, line)).filter(insertion => insertion !== undefined) as InsertionPoint[],
                    ...between.after.map(node => getInsertionPoint(node, false, token, line)).filter(insertion => insertion !== undefined) as InsertionPoint[]
                ]
                // Filter out duplicates
                .filter((insertion1, i1, insertions) => 
                    insertions.find((insertion2, i2) => 
                        i1 > i2 && insertion1 !== insertion2 && insertionPointsEqual(insertion1, insertion2)) === undefined)
        }
        return [];

    }

    function handleMouseMove(event: MouseEvent) {

        // By default, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(event, false));

        // If the primary mouse button is down, start dragging and set insertion.
        // We only allow expressions and types to be inserted.
        if($hovered && event.buttons === 1 && $dragged === undefined)
            dragged.set($hovered);

        // If something is being dragged, set the insertion points to whatever points are under the mouse.
        if($dragged) {

            // Get the insertion points at the current mouse position
            // And filter them by kinds that match, getting the field's allowed types,
            // and seeing if the dragged node is an instance of any of the dragged types.
            // This only works if the types list contains a single item that is a list of types.
            const newInsertionPoints = getInsertionPointsAt(event).filter(insertion => {
                const types = insertion.node.getAllowedFieldNodeTypes(insertion.field);
                return $dragged && Array.isArray(types) && Array.isArray(types[0]) && types[0].some(kind => $dragged instanceof kind);
            });

            // Did they change? We keep them the same to avoid UI updates, especially with animations.
            if(newInsertionPoints.length === 0 || !newInsertionPoints.every(point => Object.values($insertions).some(point2 => insertionPointsEqual(point, point2)))) {
                const insertionPointsMap = new Map<Token, InsertionPoint>();
                for(const point of newInsertionPoints)
                    insertionPointsMap.set(point.token, point);
                insertions.set(insertionPointsMap);
            }

        }

    }

    function handleMouseLeave() {

        hovered.set(undefined);
        insertions.set(new Map());

    }

    function showMenu() {

        // Is the caret on a specific token or node?
        const node = $caret.position instanceof Node ? $caret.position : $caret.getToken() ?? undefined;
        const between = $caret.getNodesBetween();

        const transforms = 
            between !== undefined ? 
                [
                    // Get all of the replacements possible immediately before the position.
                    ... between.before.reduce((transforms: Transform[], child) =>
                        [ ... transforms, ...(child.getParent()?.getInsertionBefore(child, source.getContext(), $caret.position as number) ?? []) ], []),
                    // Get all of the replacements possible and the ends of the nodes just before the position.
                    ... between.after.reduce((transforms: Transform[], child) => {
                        return [ ...transforms, ...(child.getInsertionAfter(source.getContext(), $caret.position as number) ?? []) ]
                    }, [])
                ] :
            node !== undefined ? node.getParent()?.getChildReplacement(node, source.getContext()) :
                undefined;

        if(node !== undefined && transforms !== undefined && transforms.length > 0) {
            menu = {
                node: node,
                // Filter out duplicates
                transforms: transforms.filter((item1, index1) => transforms.find((item2, index2) => index2 > index1 && item1.equals(item2)) === undefined),
                location: undefined // This gets defined after rendering.
            }

            // Make it visible if a node is selected. Otherwise, wait for it to be triggered.
            menuVisible = true;

            // We made a menu! Return and show it rather than executing a command.
        }

    }

    // Always show the menu if the caret is immediately after a property reference.
    $: {
        if($caret.isAtPropertyReference())
            showMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {

        // Assume we'll handle it.
        lastKeyDownIgnored = false;

        if(menu !== undefined && menuVisible) {
            if(event.key === "ArrowDown" && menuSelection < menu.transforms.length - 1) { menuSelection += 1; return; }
            else if(event.key === "ArrowUp" && menuSelection >= 0) { menuSelection -= 1; return; }
            else if(event.key === "Enter" && menuSelection >= 0 && menu.transforms.length > 0) {
                handleEdit(menu.transforms[menuSelection].getEdit($languages));
                return;
            }
        }

        if(event.key === "Escape") {

            if(menu === undefined && !menuVisible) {

                showMenu();
                // If we made a menu, return, and don't handle a command.
                if(menu !== undefined) return;
            }
            // Ride of the menu and let the commands process the Escape key.
            else {
                menuVisible = false;
                menu = undefined;
            }
        }

        // Hide the menu, then process the navigation.
        if(event.key === "ArrowLeft" || event.key === "ArrowRight")
            hideMenu();

        // Map meta to control on Mac OS/iOS.
        const control = event.metaKey || event.ctrlKey;

        // Loop through the commands and see if there's a match to this event.
        for(let i = 0; i < commands.length; i++) {
            const command = commands[i];
            // Does this command match the event?
            if( (command.control === undefined || command.control === control) &&
                (command.shift === undefined || command.shift === event.shiftKey) &&
                (command.alt === undefined || command.alt === event.altKey) &&
                (command.key === undefined || command.key === event.code)) {

                // If so, execute it.
                const result = command.execute($caret, editor, event.code);

                // Prevent the OS from executing the default behavior for this keystroke.
                // This is key to preventing the hidden text field intercepting backspaces and arrow key navigation,
                // which messages with input interception.
                event.preventDefault();

                // If it produced a new caret and optionally a new project, update the stores.
                if(result !== undefined) {
                    if(result instanceof Promise)
                        result.then(edit => handleEdit(edit));
                    else
                        handleEdit(result);

                    // Stop looking for commands, we found one and tried it!
                    return;
                }                
            }
        }

        // Give feedback that we didn't execute a command.
        if(!/^(Shift|Control|Alt|Meta)$/.test(event.key))
            lastKeyDownIgnored = true;

    }

    function handleEdit(edit: Edit) {

        if(edit === undefined) return;

        // Get the new caret and source to display.
        const newCaret = edit instanceof Caret ? edit : edit[1];
        const newSource = edit instanceof Caret ? undefined : edit[0];

        // Update the caret and project.
        if(newSource) {
            updateProject($project.withSource(source, newSource));
            caret.set(newCaret.withSource(newSource));
        } else {
            caret.set(newCaret);
        }

        // After every edit, focus back on on text input
        textInput.focus();

    }

    let lastKeyboardInputValue: undefined | UnicodeString = undefined;

    function handleTextInput(event: Event) {

        lastKeyDownIgnored = false;

        let edit: Edit | undefined = undefined;

        // Get the character that was typed into the text box.
        if(textInput !== null) {

            // Wrap the string in a unicode wrapper so we can account for graphemes.
            const value = new UnicodeString(textInput.value);

            // Get the last grapheme entered.
            const lastChar = value.substring(value.getLength() - 1, value.getLength());

            const isPlaceholder = $caret.position instanceof Token && $caret.position.getText() === PLACEHOLDER_SYMBOL;

            const position = 
                typeof $caret.position === "number" ? $caret.position :
                isPlaceholder ? source.getTokenTextIndex($caret.position as Token) :
                undefined;

            if(position !== undefined) {

                // If the last keyboard value length is equal to the new one, then it was a diacritic.
                // Replace the last grapheme entered with this grapheme, then reset the input text field.
                if(lastKeyboardInputValue !== undefined && lastKeyboardInputValue.getLength() === value.getLength()) {
                    const char = lastChar.toString();
                    const newSource = source.withPreviousGraphemeReplaced(char, position);
                    if(newSource) {
                        // Reset the hidden field.
                        textInput.value = "";
                        edit = [ newSource, new Caret(newSource, position) ];
                    }
                }
                // Otherwise, just insert the grapheme and limit the input field to the last character.
                else {

                    const char = lastChar.toString();

                    // If it was a placeholder, first remove the 
                    let newSource: Source | undefined = source;
                    if(isPlaceholder)
                        newSource = newSource.withoutGraphemeAt(position);
                    newSource = newSource?.withGraphemesAt(char, position);
                    if(newSource) {
                        edit = [ newSource, new Caret(newSource, position + 1) ];
                        if(value.getLength() > 1)
                        textInput.value = lastChar.toString();
                    }
                    // Rest the field to the last character.
                }

            }

            // Remember the last value of the input field for comparison on the next keystroke.
            lastKeyboardInputValue = new UnicodeString(textInput.value);

            // Prevent the OS from doing anything with this input.
            event.preventDefault();
        }

        // Did we make an update?
        if(edit)
            handleEdit(edit);
        else
            lastKeyDownIgnored = true;

    }

    function handleTextInputFocusLoss() {
        hideMenu();
        focused = false;
    }

    function handleTextInputFocusGain() {
        hideMenu();
        focused = true;
    }

    function hideMenu() {
        menu = undefined;
        menuSelection = -1;
    }

</script>

<!-- Drop what's being dragged if the window loses focus. -->
<svelte:window on:blur={ () => dragged.set(undefined) } />

<div class="editor"
    bind:this={editor}
    on:mousedown|preventDefault={event => placeCaretAtPosition(event)}
    on:dblclick={event => { let node = getNodeAt(event, false); if(node) caret.set($caret.withPosition(node)); }}
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
>
    <!-- Render the program -->
    <NodeView node={program}/>
    <!-- Render the caret on top of the program -->
    <CaretView blink={$KeyboardIdle && focused} ignored={lastKeyDownIgnored} bind:location={caretLocation}/>
    <!-- Are we on a placeholder? Show a menu! -->
    {#if menu !== undefined && menu.location !== undefined && menuVisible }
        <div class="menu" style={`left: ${menu.location.left}; top: ${menu.location.top};`}>
            <Menu 
                transforms={menu.transforms} 
                selection={menuSelection} 
                select={transform => handleEdit(transform.getEdit($languages)) }
            />
        </div>
    {/if}
    <!-- Render the invisible text field that allows us to capture inputs -->
    <input 
        type="text"
        class="keyboard-input" 
        style={`left: ${caretLocation?.left ?? 0}; top: ${caretLocation?.top ?? 0};`}
        bind:this={textInput}
        on:input={handleTextInput}
        on:keydown={handleKeyDown}
        on:focus={handleTextInputFocusGain}
        on:blur={handleTextInputFocusLoss}
    />
</div>

<style>

    .editor {
        white-space: nowrap;
        width: auto;
        height: auto;
        min-height: calc(100% - var(--wordplay-spacing) * 2);
        line-height: var(--wordplay-code-line-height);
        padding: var(--wordplay-spacing);
        position: relative;
        user-select: none;
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

    .menu {
        position: absolute;
        z-index: 2;
    }

</style>