<script lang="ts">
    import { caret, project } from '../models/stores';
    import Node from '../nodes/Node';
    import ProgramView from '../editor/ProgramView.svelte';
    import Token from '../nodes/Token';
    import Project from '../models/Project';
    import Caret from '../models/Caret';
    import type Program from '../nodes/Program';

    export let program: Program;

    function insertChar(char: string) {
        if($project && $caret && typeof $caret.position === "number") {
            const newProject = $project.withCharacterAt(char, $caret.position);
            project.set(newProject);
            caret.set(new Caret(newProject, $caret.position + 1));
        }
    }

</script>

<div class="wordplay-code"
    tabindex=0
    on:mousedown={(event) => event.currentTarget.focus()}
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
                event.preventDefault();
                if(event.code === "KeyJ") insertChar("∆");
                else if(event.code === "Semicolon") insertChar("…");
                else if(event.code === "ArrowDown") insertChar("↓");
                else if(event.code === "ArrowRight") insertChar("→");
                else if(event.code === "ArrowUp") insertChar("↑");
                else if(event.code === "Digit8") insertChar("•");
                else if(event.code === "KeyT") insertChar("⊤");
                else if(event.code === "KeyF") insertChar("⊥");
                else if(event.code === "KeyA") insertChar("∧");
                else if(event.code === "KeyO") insertChar("∨");
                else if(event.code === "KeyN") insertChar("¬");
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
                        caret.set(new Caret(newProject, $caret.position - 1));
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
                else if(event.key.length <= 1 || event.key === "Enter") {
                    const char = event.key === "Enter" ? "\n" : event.key;
                    if($project && $caret && typeof $caret.position === "number")
                        insertChar(char);
                }
            }
        }
    }}
>
    <ProgramView program={program} />
</div>

<style>

.wordplay-code {
        padding: var(--wordplay-spacing);
        white-space: nowrap;
        overflow: scroll;
    }

    .wordplay-code:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }


</style>