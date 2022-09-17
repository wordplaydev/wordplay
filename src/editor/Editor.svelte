<script lang="ts">
    import { caret, project } from '../models/stores';
    import Token from '../nodes/Token';
    import Caret from '../models/Caret';
    import type Program from '../nodes/Program';
    import { afterUpdate } from 'svelte';
    import UnicodeString from '../models/UnicodeString';
    import commands, { getTokenByView } from './Commands';
    import NodeView from './NodeView.svelte';

    export let program: Program;

    let editor: HTMLElement;
    let keyboard: HTMLInputElement;

    // When the caret changes, make sure it's in view.
    afterUpdate(() => {
        const caret = editor?.querySelector(".caret");
        const viewport = editor?.parentElement;
        if(caret && viewport) {
            const caretRect = caret.getBoundingClientRect();
            const editorRect = viewport.getBoundingClientRect();
            const caretTop = caretRect.top - editorRect.top;
            const caretLeft = caretRect.left - editorRect.left;
            const visible = 
                caretTop >= viewport.scrollTop && 
                caretLeft >= viewport.scrollLeft &&
                caretTop <= viewport.scrollTop + viewport.clientHeight &&
                caretLeft <= viewport.scrollLeft + viewport.clientWidth;
            if(!visible)
                caret.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest"});

            const keyboard = editor?.querySelector(".keyboard-input");
            if(keyboard instanceof HTMLElement) {
                keyboard.style.left = `${caretLeft + viewport.scrollLeft}px`;
                keyboard.style.top = `${caretTop + viewport.scrollTop}px`;
            }
        }
    });

    function handleClick(event: MouseEvent) {

        if($caret === undefined) return;
        if(event.target === null) return;

        // Prevent the OS from giving the document body focus.
        event.preventDefault();

        // After we place the caret, focus on keyboard input.
        if(keyboard instanceof HTMLElement)
            keyboard.focus();

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
                const tokenIndex = token.getTextIndex();
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
        let left = false;
        for(let i = 0; i < line.length; i++) {
            const tokenBounds = line[i].getBoundingClientRect();
            const tokenLeftDistance = Math.abs(tokenBounds.left - mouseX);
            const tokenRightDistance = Math.abs(tokenBounds.right - mouseX);
            const tokenDistance = Math.min(tokenLeftDistance, tokenRightDistance);
            if(closestDistance === undefined || tokenDistance < closestDistance) {
                closest = line[i];
                closestDistance = tokenDistance;
                left = tokenLeftDistance < tokenRightDistance;
            }
        };

        if(closest !== undefined) {
            const token = getTokenByView($caret.getProgram(), closest);
            if(token instanceof Token && event.target instanceof Element) {
                const textIndex = token.getTextIndex();
                const lastIndex = token.getLastIndex();
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
            return;
        }

    }

    function handleKeyDown(event: KeyboardEvent) {

        if($caret === undefined) return;

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

                    // Get the new caret and project to display.
                    const newCaret = result instanceof Caret ? result : result[1];
                    const newProject = result instanceof Caret ? undefined : result[0];

                    // Update the caret and project.
                    caret.set(newCaret);
                    if(newProject)
                        project.set(newProject);

                }

                // Stop looking for commands, we found one and tried it!
                break;
                
            }
        }

    }

    let lastKeyboardInputValue: undefined | UnicodeString = undefined;

    function handleKeyboardInput(event: Event) {
        // Get the character that was typed into the text box.
        // If it's a string, insert it at the caret position then reset the text input's contents.
        if($project && $caret && typeof $caret.position === "number" && keyboard !== null) {

            // Wrap the string in a unicode wrapper so we can account for graphemes.
            const value = new UnicodeString(keyboard.value);

            // Get the last grapheme entered.
            const lastChar = value.substring(value.getLength() - 1, value.getLength());

            // If the last keyboard value length is equal to the new one, then it was a diacritic.
            // Replace the last grapheme entered with this grapheme, then reset the input text field.
            if(lastKeyboardInputValue !== undefined && lastKeyboardInputValue.getLength() === value.getLength()) {
                const char = lastChar.toString();
                const newProject = $project.withPreviousCharacterReplaced(char, $caret.position);
                if(newProject) {
                    project.set(newProject);
                    keyboard.value = "";
                }
            }
            // Otherwise, just insert the grapheme and limit the input field to the last character.
            else {
                const char = lastChar.toString();
                const newProject = $project.withCharacterAt(char, $caret.position);
                if(newProject) {
                    project.set(newProject);
                    caret.set(new Caret(newProject, $caret.position + 1));
                }
                if(value.getLength() > 1)
                    keyboard.value = lastChar.toString();
            }

            // Remember the last value of the input field for comparison on the next keystroke.
            lastKeyboardInputValue = new UnicodeString(keyboard.value);

            // Prevent the OS from doing anything with this input.
            event.preventDefault();
        }

    }

</script>

<div class="editor"
    bind:this={editor}
    on:mousedown={handleClick}
    on:keydown={handleKeyDown}
>
    <NodeView node={program} />
    <input type="text" class="keyboard-input" bind:this={keyboard} on:input={handleKeyboardInput}/>
</div>

<style>

    .editor {
        padding: var(--wordplay-spacing);
        white-space: nowrap;
        width: auto;
        height: auto;
        min-height: calc(100% - var(--wordplay-spacing) * 2);
        line-height: var(--wordplay-code-line-height);
        position: relative;
    }

    .keyboard-input {
        position: absolute;
        border: none;
        outline: none;
        width: 1px;
        opacity: 0;
        pointer-events: none;
    }

</style>