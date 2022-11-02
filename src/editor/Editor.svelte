<script lang="ts">
    import { project, updateProject } from '../models/stores';
    import type Transform from "../transforms/Transform";
    import Node from '../nodes/Node';
    import Caret from '../models/Caret';
    import { afterUpdate, getContext, onDestroy, setContext } from 'svelte';
    import UnicodeString from '../models/UnicodeString';
    import commands, { type Edit } from './Commands';
    import NodeView from './NodeView.svelte';
    import type Source from '../models/Source';
    import { writable, type Writable } from 'svelte/store';
    import Exception from '../runtime/Exception';
    import createRowOutlineOf from './outline';
    import type Program from '../nodes/Program';
    import Menu from './Menu.svelte';
    import Token from '../nodes/Token';
    import KeyboardIdle from '../models/KeyboardIdle';
    import CaretView from './CaretView.svelte';
    import { PLACEHOLDER_SYMBOL } from '../parser/Tokenizer';
    import type LanguageCode from '../nodes/LanguageCode';

    export let source: Source;

    type Selection = {
        node: Node,
        kind: "step" | "exception" | "selected",
        path: string | undefined
    };

    let editor: HTMLElement;
    let textInput: HTMLInputElement;

    // A per-editor store that contains the current editor's cursor. We expose it as context to children.
    let caret = writable<Caret>(new Caret(source, 0));

    let selections: Selection[] = [];

    // The width and height of the program
    let programViewWidth = 0;
    let programViewHeight = 0;

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

    // When source changes, update various nested state from the source.
    $: {
        program = source.program;
        caret.set($caret.withSource(source));
        setContext("caret", caret);
        executingNode = source.getEvaluator().currentStep()?.node;
    }

    $: languages = getContext<Writable<LanguageCode[]>>("languages")

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

    // When the caret changes or keyboard idle state changes, determine a new menu.
    $: {

        if(focused) {

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
                menuVisible = $caret.isNode();
            }

        }

    }

    // When the caret location changes, position the menu and invisible input, and optionally scroll to the caret.
    $: {
        
        if(caretLocation !== undefined) {

            const keyboard = editor?.querySelector(".keyboard-input");
            if(keyboard instanceof HTMLElement) {
                keyboard.style.left = `${caretLocation.left}`;
                keyboard.style.top = `${caretLocation.top}`;
            }

            // Position the menu at the cursor if it's an insertion.
            if(menu !== undefined && $caret.isIndex())
                menu = {
                    node: menu.node,
                    transforms: menu.transforms,
                    location: { left: caretLocation.left, top: `${caretLocation.bottom}px` }
                }

        }

    }

    // When the editor view changes, position selections, the menu, and scroll the caret or executing node into view
    // and make sure the text input field is in focus.
    afterUpdate(() => {
        if(editor === undefined || editor === null) return;

        // GET MEASUREMENTS

        const viewport = editor.parentElement;
        if(viewport === null) return;

        const viewportRect = viewport.getBoundingClientRect();
        const rootView = editor.querySelector(".node-view");

        if(rootView instanceof HTMLElement) {
            // Add a generous amount of space to account for browser differences.
            programViewWidth = rootView.offsetWidth + 20;
            programViewHeight = rootView.offsetHeight + 20;
        }

        const currentStep = $caret.source.getEvaluator().currentStep();
        const latestValue = $caret.source.getEvaluator().getLatestResult();

        selections = [];

        if(currentStep?.node instanceof Node)
            selections.push({ node: currentStep.node, kind: "step", path: undefined });
        if(latestValue instanceof Exception && latestValue.step !== undefined && latestValue.step.node instanceof Node)
            selections.push({ node: latestValue.step.node, kind: "exception", path: undefined });
        // Add selection last, so it's always visible.
        if($caret.position instanceof Node)
            selections.push({ node: $caret.position, kind: "selected", path: undefined });
        
        // Compute the paths of the selected nodes.
        if(editor !== undefined) {
            for(const sel of selections) {
                const nodeView = getNodeView(sel.node);
                if(nodeView !== undefined)
                    sel.path = createRowOutlineOf(nodeView, -viewportRect.left + viewport.scrollLeft, -viewportRect.top + viewport.scrollTop);
            }
        }

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

        // If the program contains this node, scroll to it's view.
        if(executingNode instanceof Node && source.program.contains(executingNode)) {
            const element = document.querySelector(`[data-id="${executingNode.id}"]`);
            if(element !== null)
                ensureElementIsVisible(element, false);
        }

    });

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

    function ensureElementIsVisible(element: Element, center: boolean=false) {

        const viewport = editor?.parentElement;
        if(viewport === null) return;

        element.scrollIntoView(center ? 
            { behavior: "smooth", block: "center", inline: "center"} :
            { behavior: "auto", block: "nearest", inline: "nearest"});

    }

    function handleClick(event: MouseEvent) {

        if($caret === undefined) return;
        if(event.target === null) return;

        // Prevent the OS from giving the document body focus.
        event.preventDefault();

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
                    caret.set($caret.withPosition(newPosition));
                }

            }
        }
        else if(whitespacePosition !== undefined) {
            caret.set($caret.withPosition(whitespacePosition));
        }

        // After we place the caret, focus on keyboard input, in case it's not focused.
        textInput.focus();

    }

    function handleKeyDown(event: KeyboardEvent) {

        if(menu !== undefined) {
            if(menuVisible) {
                if(event.key === "ArrowDown" && menuSelection < menu.transforms.length - 1) { menuSelection += 1; return; }
                else if(event.key === "ArrowUp" && menuSelection >= 0) { menuSelection -= 1; return; }
                else if(event.key === "Enter" && menuSelection >= 0 && menu.transforms.length > 0) {
                    handleEdit(menu.transforms[menuSelection].getEdit($languages));
                    return;
                }
            }
            else if(event.key === "Escape" && $caret.isIndex() && !menuVisible) {
                menuVisible = true;
                return;
            }

            // Hide the menu, then process the navigation.
            if(event.key === "ArrowLeft" || event.key === "ArrowRight")
                hideMenu();
        }

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
    on:mousedown={handleClick}
>
    <!-- Render the program -->
    <NodeView node={program}/>
    <!-- Render the caret on top of the program -->
    <CaretView blink={$KeyboardIdle && focused} bind:location={caretLocation}/>
    <!-- Do we have any selections to render? Render them! -->
    {#each selections as selection }
        <svg class={`selection ${selection.kind}`} width={programViewWidth} height={programViewHeight}>
            <path d={selection.path}/>
        </svg>
    {/each}
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

        font-family: var(--wordplay-code-font-face);
        font-size: var(--wordplay-font-size);
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        width: 1px;
        opacity: 0;
        pointer-events: none;
    }

    .selection {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 0;
    }
    
    .selection path {
        fill: var(--wordplay-chrome);
        stroke: var(--wordplay-border-color);
        stroke-width: var(--wordplay-border-width);
        stroke-linejoin: round;
    }

    .selection.step path {
        stroke: var(--wordplay-highlight);
    }

    .selection.exception path {
        stroke: var(--wordplay-error);
    }

    .selection.selected path {
        stroke: var(--color-blue);
    }

    .menu {
        position: absolute;
        z-index: 2;
    }

</style>