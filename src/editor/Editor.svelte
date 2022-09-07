<script lang="ts">
    import { caret, project } from '../models/stores';
    import Node from '../nodes/Node';
    import ProgramView from '../editor/ProgramView.svelte';
    import Token from '../nodes/Token';
    import Caret from '../models/Caret';
    import type Program from '../nodes/Program';
    import { afterUpdate } from 'svelte';
import type Keyboard from '../native/Keyboard';
import { set_data } from 'svelte/internal';

    export let program: Program;

    let editor: HTMLElement;

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
        }
    });

    function insertChar(char: string) {
        if($project && $caret && typeof $caret.position === "number") {
            const newProject = $project.withCharacterAt(char, $caret.position);
            project.set(newProject);
            caret.set(new Caret(newProject, $caret.position + 1));
        }
    }

    function handleClick(event: MouseEvent) {

        const el = event.currentTarget;

        if(!(el instanceof HTMLElement)) return;
        if($caret === undefined) return;

        // First, ask for focus.
        el.focus();

        // Then, place the caret. Find the tokens that contain the vertical mouse position.
        const tokenViews = el.querySelectorAll(".token-view");
        const line: HTMLElement[] = [];
        const mouseY = event.clientY;
        const mouseX = event.clientX;
        tokenViews.forEach(token => {
            if($caret !== undefined && token instanceof HTMLElement && token.dataset.newlines && token.dataset.whitespace && token.dataset.index) {
                const tokenIndex = parseInt(token.dataset.index);
                const tokenNewlines = parseInt(token.dataset.newlines);
                const tokenWhitespace = token.dataset.whitespace;
                const tokenBounds = token.getBoundingClientRect();
                const tokenTop = tokenBounds.top;
                const tokenWhitespaceTop = tokenBounds.top - tokenNewlines * tokenBounds.height;
                const tokenBottom = tokenBounds.bottom;
                if(tokenTop <= mouseY && tokenBottom >= mouseY)
                    line.push(token);
                else if(tokenWhitespaceTop <= mouseY && tokenBottom >= mouseY) {
                    // This token's whitespace contains the click.
                    // Place it at the beginning of one of the whitespace lines.
                    const mouseLine = Math.round((mouseY - tokenWhitespaceTop) / tokenBounds.height);
                    let index = 0;
                    let line = 0;
                    while(index < tokenWhitespace.length) { 
                        if(line === mouseLine) break;
                        if(tokenWhitespace.charAt(index) === "\n")
                            line++;
                        index++;
                    }
                    caret.set($caret.withPosition(tokenIndex - tokenWhitespace.length + index));
                    return;
                }
            }
        });

        // Of those aligned vertically, find the closest horizontally.
        let closestDistance: number | undefined = undefined;
        let closest: HTMLElement | undefined = undefined;
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

        if(closest !== undefined && closest.dataset.index !== undefined && closest.dataset.length !== undefined) {
            caret.set($caret.withPosition(parseInt(closest.dataset.index) + (left ? 0 : parseInt(closest.dataset.length))));
        }

    }

    function caretUp() { caretVertical(-1); }
    function caretDown() { caretVertical(1); }

    function tokenMetadata(token: HTMLElement) {
        return token instanceof HTMLElement &&
            token.dataset.start !== undefined &&
            token.dataset.index !== undefined &&
            token.dataset.end !== undefined &&
            token.dataset.whitespace !== undefined ?
            { 
                start: parseInt(token.dataset.start), 
                index: parseInt(token.dataset.index), 
                end: parseInt(token.dataset.end),
                whitespace: token.dataset.whitespace
            } :
            undefined;        
    }

    function caretVertical(direction: 1 | -1) {

        // Get the current caret position.
        const position = $caret?.position;
        if($caret === undefined || position === undefined || typeof position !== "number") return;

        // Find all the tokens.
        const tokens = editor.querySelectorAll(".token-view");

        // Find the caret
        const caretView = editor.querySelector(".caret");
        if(!(caretView instanceof HTMLElement)) return;

        // Split them into rows.
        const rows: { newline: number, tokens: HTMLElement[]}[] = [{ newline: -1, tokens: [] }];
        tokens.forEach(token => {
            if(token instanceof HTMLElement && token.dataset.newlines) {
                const newlines = parseInt(token.dataset.newlines);
                // All lines except for the last are whitespace lines for the purposes of caret navigation.
                for(let i = 0; i < newlines; i++) rows.push({ newline: i, tokens: [ token ]});
                const row = rows[rows.length - 1];
                // Change the last row to non-whitespace, since it 
                row.newline = -1;
                row.tokens.push(token);
            }
        });

        // Find the caret's current row and this token.
        let rowIndex = 0;
        for(; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const candidate = row.tokens.find(token => {
                const data = tokenMetadata(token);
                if(data)
                    // This token matches if it is whitespace and contains the caret, or if it's not whitespace and it's text contains the caret.
                    if(row.newline >= 0) {
                        if(position < data.start || position >= data.index) return false;
                        // Which line is the caret on?
                        let offset = position - data.start;
                        let whitespacePrior = data.whitespace.substring(0, offset);
                        let newline = whitespacePrior.split("\n").length - 2;
                        return newline === row.newline;
                    }
                    else
                        return position >= data.start && position <= data.end;
                else
                    return false;
            });
            if(candidate !== undefined)
                break;
        }

        // Bail if we didn't find it. (This means something is horribly wrong with rendering or the code above).
        if(rowIndex === rows.length) {
            console.error("Hm, couldn't find the view of the caret position");
            return;
        }

        // If there's no row in the direction we're moving, just go to the end of this row.
        if(rowIndex === (direction < 0 ? 0 : rows.length - 1)) {
            if(rows[rowIndex].tokens.length > 0) {
                const row = rows[rowIndex];
                const index = row.tokens[direction < 0 ? 0 : row.tokens.length - 1].dataset.index;
                if(index !== undefined) caret.set($caret.withPosition(parseInt(index)));
            }
        }
        // Otherwise, find the closest token horizontally in the row in the direction we're moving.
        else {
            rowIndex += direction;

            // If the row we're moving to is a whitespace row...
            if(rows[rowIndex].newline >= 0) {
                // ... move to the next newline.
                let pos = position;
                let foundFirst = false;
                if($caret.project.code.at(pos) !== "\n") {
                    foundFirst = true;
                    while($caret.project.code.at(pos) !== "\n")
                        pos += direction;
                }
                // Move past the next newline if we're moving down.
                pos += direction;
                // Set the caret
                caret.set($caret.withPosition(pos));
            } 
            // Otherwise, find the nearest token on the next row.
            else {

                const caretRect = caretView.getBoundingClientRect();
                const distances = rows[rowIndex].tokens.map(candidate => {
                    const candidateRect = candidate.getBoundingClientRect();
                    return {
                        token: candidate,
                        rect: candidateRect,
                        distance: Math.abs(caretRect.left - (candidateRect.left + candidateRect.width / 2))
                    };
                });
                const sorted = distances.sort((a, b) => a.distance - b.distance);
                // Now that we've found the closest token horizontally in the next row, choose the closest point in the token's whitespace or text.
                if(sorted.length > 0) {
                    const choice = sorted[0];
                    const length = parseInt(choice.token.dataset.length ?? "");
                    const startPosition = parseInt(choice.token.dataset.index ?? "");
                    if(!isNaN(startPosition) && !isNaN(length)) {
                        // Choose the offset based on whether the caret is to the left, right, or in between the horizontal axis of the chosen token.
                        const offset = 
                            caretRect.left > choice.rect.right ? length :
                            caretRect.left < choice.rect.left ? 0 :
                            Math.round(length * ((caretRect.left - choice.rect.left) / choice.rect.width));
                        caret.set($caret.withPosition(startPosition + offset));
                    }
                }
            }
        }

    }

    function handleKeyDown(event: KeyboardEvent) {
        if($project && $caret) {
            const meta = event.metaKey || event.ctrlKey;
            if(meta) {
                if(event.key === "a") {
                    event.preventDefault();
                    caret.set($caret.withPosition($project.program));
                }
            }
            else if(event.altKey) {  
                const char = {
                    "KeyJ":         "∆",
                    "ArrowDown":    "↓",
                    "ArrowRight":   "→",
                    "ArrowUp":      "↑",
                    "Digit5":       "∞",
                    "KeyP":         "π",
                    "Digit6":       "∧",
                    "Digit7":       "∨",
                    "Digit8":       "•",
                    "Digit9":       "⊤",
                    "Digit0":       "⊥",
                    "Equal":        "≠",
                    "KeyF":         "ƒ",
                    "KeyD":         "∆",
                    "Backquote":    "¬",
                    "Comma":        "≤",
                    "Period":       "≥",
                    "Semicolon":    "…",
                    "Slash":        "÷"
                }[event.code];
                if(char !== undefined) {
                    event.preventDefault();
                    insertChar(char);
                }
            }
            else {
                event.preventDefault();
                if(event.key === "ArrowLeft") caret.set($caret.left());
                else if(event.key === "ArrowRight") caret.set($caret.right());
                else if(event.key === "ArrowUp") caretUp();
                else if(event.key === "ArrowDown") caretDown();
                else if(event.key === "Backspace") {
                    if(typeof $caret.position === "number") {
                        const newProject = $project.withoutGraphemeAt($caret.position - 1);
                        project.set(newProject);
                        caret.set(new Caret(newProject, Math.max(0, $caret.position - 1)));
                    }
                    else {
                        // Delete the selected node and place the caret at the beginning of where it was.
                    }
                }
                // Select parent of current caret position.
                else if(event.key === "Escape") {
                    const position = $caret.position;
                        if($project !== undefined) {
                        if(position instanceof Node) {
                            // Select the parent node
                            const parent = position.getParent($project.program);
                            if(parent !== undefined)
                                caret.set(new Caret($project, parent));
                        }
                        // Find the node corresponding to the position.
                        else if(typeof position === "number") {
                            const token = $project?.program.nodes().find(token => token instanceof Token && token.containsPosition(position));
                            if(token !== undefined)
                                caret.set(new Caret($project, token));
                        }
                    }
                }
                else if(event.key.length === 1)
                    insertChar(event.key);
                else if(event.key === "Enter")
                    insertChar("\n");
                else if(event.key === "Tab")
                    insertChar("\t");
            }
        }
    }

</script>

<div class="editor"
    tabindex=0
    bind:this={editor}
    on:mousedown={handleClick}
    on:keydown={handleKeyDown}
>
    <ProgramView program={program} />
</div>

<style>

    .editor {
        padding: var(--wordplay-spacing);
        white-space: nowrap;
        width: auto;
        height: auto;
        min-height: calc(100% - var(--wordplay-spacing) * 2);
        line-height: 1.4;
    }

    .editor:focus {
        outline: none;
    }

</style>