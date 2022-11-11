<script lang="ts">
    import { project, updateProject } from '../models/stores';
    import type Transform from "../transforms/Transform";
    import Node from '../nodes/Node';
    import Caret, { type InsertionPoint } from '../models/Caret';
    import { afterUpdate, getContext, onDestroy, setContext } from 'svelte';
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
    import { CaretSymbol, type DraggedContext, DraggedSymbol, HoveredSymbol, LanguageSymbol, type LanguageContext, HighlightSymbol, InsertionPointsSymbol } from './Contexts';
    import type { HighlightType, Highlights } from './Highlights'
    import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
    import Expression from '../nodes/Expression';
    import TypePlaceholder from '../nodes/TypePlaceholder';
    import Type from '../nodes/Type';
    import Bind from '../nodes/Bind';
    import Block, { type Statement } from '../nodes/Block';

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

    let insertions = writable<Map<Node[],InsertionPoint>>(new Map());
    setContext(InsertionPointsSymbol, insertions);

    // A shorthand for the current program.
    let program = source.program;

    // A shorthand for the currently evaluating step, if there is one.
    let executingNode = source.getEvaluator().currentStep()?.node;

    // Focused when the active element is the text input.
    let focused = false;

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

    $: languages = getContext<LanguageContext>(LanguageSymbol)
    $: dragged = getContext<DraggedContext>(DraggedSymbol);

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

        if($dragged instanceof Expression && $hovered instanceof Expression)
            return true;

        if($dragged instanceof Bind && $hovered) {
            const hoverParent = $hovered.getParent();
            if(hoverParent instanceof Block && hoverParent.statements.includes($hovered as Statement))
                return true;
        }

        if($dragged instanceof Type && $hovered instanceof Type)
            return true;

        return false;

    }

    function handleMouseUp(event: MouseEvent) {

        // Is the creator hovering over a valid drop target? If so, execute the edit.
        if(isValidDropTarget())
            drop();
        // Otherwise, place the caret at the mouse position.
        else
            placeCaretAtPosition(event);

        // Reset the insertion points.
        insertions.set(new Map());

    }

    function drop() {

        if($dragged && $hovered) {

            let editedProgram = source.program;
            let draggedNode: Node = $dragged;
            let hoveredNode: Node | undefined = $hovered;

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
                    replacement = (new ExpressionPlaceholder()).withPrecedingSpace(draggedNode.getPrecedingSpace(), true);
                }

                // If it's from this program, then update this program.
                if(draggedRoot === editedProgram) {
                    // Remember where it is in the tree
                    const pathToHoveredNode = hoveredNode.getPath();
                    // Replace the dragged node with the placeholder.
                    editedProgram = editedProgram.clone(false, draggedNode, replacement);
                    // Update the node to replace to the cloned node.
                    hoveredNode = editedProgram.resolvePath(pathToHoveredNode);
                }
                // If it's from another program, then update that program.
                else if(draggedRoot instanceof Program) {
                    // Find the source that contains the dragged root.
                    const source = $project.getSourceWithProgram(draggedRoot);
                    // If we found one, update the project with a new source with a new program that replaces the dragged node with the placeholder.
                    if(source)
                        newSources.push([ source, source.withProgram(draggedRoot.clone(false, draggedNode, replacement)) ]);
                }

            }

            // Replace the hovered node with the dragged in the program, preserving preceding space.
            if(hoveredNode) {
                const dragClone = draggedNode.withPrecedingSpace(hoveredNode.getPrecedingSpace(), true);
                editedProgram = editedProgram.clone(false, hoveredNode, dragClone);            
                newSources.push([ source, source.withProgram(editedProgram) ]);

                // Update the new sources in the project.

                // Update this source file's caret.
                $caret.withPosition(dragClone)
            }

            // Update the project with the new source files
            updateProject($project.withSources(newSources));

        }

    }

    function placeCaretAtPosition(event: MouseEvent) {

        // Prevent the OS from giving the document body focus.
        event.preventDefault();

        const newPosition = getCaretPositionAt(event);
        if(newPosition !== undefined)
            caret.set($caret.withPosition(newPosition));

        // After we place the caret, focus on keyboard input, in case it's not focused.
        textInput.focus();

    }
    
    function getNodeAt(event: MouseEvent) {
        const el = document.elementFromPoint(event.clientX, event.clientY);
        if(el instanceof HTMLElement) {
            const nonTokenElement = el.closest(".node-view:not(.Token)");
            if(nonTokenElement instanceof HTMLElement && nonTokenElement.dataset.id)
                return source.program.getNodeByID(parseInt(nonTokenElement.dataset.id))
        }
        return undefined;
    }

    function getCaretPositionAt(event: MouseEvent): number | undefined {

        // Then, place the caret. Find the tokens that contain the vertical mouse position.
        const tokenViews = editor.querySelectorAll(".token-view");
        const line: Element[] = [];
        const mouseY = event.clientY;
        const mouseX = event.clientX;
        let whitespacePosition: undefined | number = undefined;
        tokenViews.forEach(view => {
            if($caret === undefined) return;
            const token = getTokenByView($caret.getProgram(), view);
            if(token instanceof Token) {
                const tokenBounds = view.getBoundingClientRect();
                const tokenTop = tokenBounds.top;
                const tokenWhitespaceTop = tokenBounds.top - token.newlines * tokenBounds.height;
                const tokenBottom = tokenBounds.bottom;
                const whitespace = token.getWhitespace();
                const tokenIndex = $caret.source.getTokenTextIndex(token);
                if(tokenIndex !== undefined) {
                    // // If the mouse's vertical is within the top and bottom of this token view, include the token in the line.
                    if(tokenTop <= mouseY && tokenBottom >= mouseY)
                        line.push(view);
                    // If the mouse is within the whitespace of this line, find the beginning of the whitespace line.
                    else if(tokenWhitespaceTop <= mouseY && tokenBottom >= mouseY && whitespacePosition === undefined) {
                        // This token's whitespace contains the click.
                        // Place it at the beginning of one of the whitespace lines.
                        const mouseLine = Math.round((mouseY - tokenWhitespaceTop) / tokenBounds.height);
                        let index = 0;
                        let line = 0;
                        while(index < whitespace.length) { 
                            if(line === mouseLine) break;
                            if(whitespace.charAt(index) === "\n")
                                line++;
                            index++;
                        }
                        whitespacePosition = tokenIndex - whitespace.length + index;
                    }
                }
            }
        });

        // Of those aligned vertically, find the closest horizontally.
        let closestDistance: number | undefined = undefined;
        let closest: Element | undefined = undefined;
        for(let i = 0; i < line.length; i++) {
            const tokenBounds = line[i].getBoundingClientRect();
            const tokenLeftDistance = Math.abs(tokenBounds.left - mouseX);
            const tokenRightDistance = Math.abs(tokenBounds.right - mouseX);
            const tokenDistance = Math.min(tokenLeftDistance, tokenRightDistance);
            if(closestDistance === undefined || tokenDistance < closestDistance) {
                closest = line[i];
                closestDistance = tokenDistance;
            }
        };

        if(closest !== undefined) {
            const token = getTokenByView($caret.getProgram(), closest);
            if(token instanceof Token && event.target instanceof Element) {
                const textIndex = $caret.source.getTokenTextIndex(token);
                const lastIndex = $caret.source.getTokenLastIndex(token);
                if(textIndex !== undefined && lastIndex !== undefined) {
                    // The mouse event's offset is relative to what was clicked on, not the element handling the click, so we have to compute the real offset.
                    const targetRect = event.target.getBoundingClientRect();
                    const tokenRect = closest.getBoundingClientRect();
                    const offset = event.offsetX + (targetRect.left - tokenRect.left);
                    const newPosition = Math.max(textIndex, Math.min(lastIndex, textIndex + (tokenRect.width === 0 ? 0 : Math.round(token.getTextLength() * (offset / tokenRect.width)))));
                    return newPosition;
                }

            }
        }
        else if(whitespacePosition !== undefined)
            return whitespacePosition;

        return undefined;

    }

    function getInsertionPoint(node: Node, before: boolean) {

        const parent = node.getParent();
        const field = node.getContainingParentList();
        if(parent === undefined || parent === null || field === undefined) return undefined;
        const list = parent.getField(field);
        if(!Array.isArray(list)) return undefined;
        return {
            node: parent,
            field: field,
            list: list,
            index: list.indexOf(node) + (before ? 0 : 1)
        };

    }

    function getInsertionPointsAt(event: MouseEvent) {

        // Is the caret position between tokens? If so, are any of the token's parents inside a list in which we could insert something?
        const position = getCaretPositionAt(event);
        if(position) {
            const caret = new Caret(source, position);
            const between = caret.getNodesBetween();

            // If there are nodes between the point, construct insertion points
            // that exist in lists.
            return between === undefined ? [] :
                [
                    ...between.before.map(node => getInsertionPoint(node, true)).filter(insertion => insertion !== undefined) as InsertionPoint[],
                    ...between.after.map(node => getInsertionPoint(node, false)).filter(insertion => insertion !== undefined) as InsertionPoint[]
                ]
                // Filter out duplicates
                .filter((insertion1, i1, insertions) => 
                    insertions.find((insertion2, i2) => 
                        i1 > i2 &&
                        insertion1 !== insertion2 &&
                        insertion1.node === insertion2.node && 
                        insertion1.list === insertion2.list && 
                        insertion1.index === insertion2.index) === undefined)
        }
        return [];

    }

    function handleMouseMove(event: MouseEvent) {

        // If there are no insertions, set the hovered state to whatever node is under the mouse.
        hovered.set(getNodeAt(event));

        // If something is being dragged, Set the insertion points to whatever points are under the mouse.
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
            if(newInsertionPoints.length === 0 || !newInsertionPoints.every(point => {
                const current = $insertions.get(point.list);
                if(current === undefined) return false;
                return point.node === current.node && point.index === current.index;
            })) {
                const insertionPointsMap = new Map<Node[], InsertionPoint>();
                for(const point of newInsertionPoints)
                    insertionPointsMap.set(point.list, point);
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
            // Ride of the menu and let the Escape key through for commands.
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
                }

                // Stop looking for commands, we found one and tried it!
                break;
                
            }
        }

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

<div class="editor"
    bind:this={editor}
    on:mousedown|preventDefault={() => {}}
    on:mouseup={handleMouseUp}
    on:mousemove={handleMouseMove}
    on:mouseleave={handleMouseLeave}
>
    <!-- Render the program -->
    <NodeView node={program}/>
    <!-- Render the caret on top of the program -->
    <CaretView blink={$KeyboardIdle && focused} bind:location={caretLocation}/>
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