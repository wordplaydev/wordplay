<script lang="ts">
    import { caret, project } from '../models/stores';
    import Node from '../nodes/Node';
    import ProgramView from '../editor/ProgramView.svelte';
    import Token from '../nodes/Token';
    import Project from '../models/Project';
    import Caret from '../models/Caret';
    import type Program from '../nodes/Program';
    import { onDestroy } from 'svelte';

    export let program: Program;

    let editor: HTMLElement;

    // When the caret changes, make sure it's in view.
    const caretUnsub = caret.subscribe(() => {
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
    onDestroy(caretUnsub);

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

        // First, ask for focus.
        el.focus();

        // Then, place the caret. Find the tokens that contain the vertical mouse position.
        const tokenViews = el.querySelectorAll(".token-view");
        const line: HTMLElement[] = [];
        const mouseY = event.clientY;
        const mouseX = event.clientX;
        tokenViews.forEach(token => {
            const tokenBounds = token.getBoundingClientRect();
            const tokenTop = tokenBounds.top;
            const tokenBottom = tokenBounds.bottom;
            if(token instanceof HTMLElement && tokenTop <= mouseY && tokenBottom >= mouseY)
                line.push(token);
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
            caret.set($caret?.withPosition(parseInt(closest.dataset.index) + (left ? 0 : parseInt(closest.dataset.length))));
        }

    }


</script>

<div class="editor"
    tabindex=0
    bind:this={editor}
    on:mousedown={handleClick}
    on:keydown={(event) => {
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
                else if(event.key === "ArrowUp") caret.set($caret.up());
                else if(event.key === "ArrowDown") caret.set($caret.down());
                else if(event.key === "Backspace") {
                    if(typeof $caret.position === "number") {
                        const newProject = new Project("Play", $project.code.substring(0, $caret.position - 1) + $project.code.substring($caret.position), () => project.set($project));
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
    }}
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