<script lang="ts">

    import Project from '../models/Project';
    import { caret, project } from '../models/stores';
    import type Document from "../models/Document";
    import Value from '../runtime/Value';
    import Text from '../runtime/Text';
    import Structure, { createStructure } from '../runtime/Structure';
    import Phrase from '../native/Phrase';
    import VerseView from './VerseView.svelte';
    import Measurement from '../runtime/Measurement';
    import Verse from '../native/Verse';
    import Group from '../native/Group';
    import List from '../runtime/List';
    import Node from '../nodes/Node';
    import TextType from '../nodes/TextType';
    import StructureType from '../nodes/StructureType';
    import ProgramView from '../editor/ProgramView.svelte';
    import Program from '../nodes/Program';
    import Caret from '../models/Caret';
    import Token from '../nodes/Token';

    export let doc: Document;
    $: content = doc.getContent();

    let evaluator = $project?.evaluator;
    let view: Structure | undefined;
    $: {
        // If the content is a Verse, just show it as is.
        if(content instanceof Value && evaluator) {
            const contentType = content.getType();
            if(contentType instanceof StructureType && contentType.definition === Verse)
                view = content as Structure;
            else if(contentType instanceof StructureType && contentType.definition === Group) {
                view = createStructure(evaluator, Verse, { group: content });
            }
            else if(contentType instanceof StructureType && contentType.definition === Phrase) {
                view = createStructure(evaluator, Verse, { group: createStructure(evaluator, Group, { phrase: new List([content]) }) });
            }
            else if(contentType instanceof TextType) {
                view = createStructure(evaluator, Verse, 
                    {
                        group: createStructure(evaluator, Group, {
                            phrase: new List([createStructure(evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: content
                            })])
                        })
                    }
                );
            }
            // Otherise, just wrap in a sentence with the content's toString() text.
            else {
                view = createStructure(evaluator, Verse, 
                    {
                        group: createStructure(evaluator, Group, {
                            phrase: new List([createStructure(evaluator, Phrase, {
                                size: new Measurement(20),
                                font: new Text("Noto Sans"),
                                text: new Text(content.toString())
                            })])
                        })
                    }
                );
            }
        }
    }

    function handleEdit(event: Event) {
        // When the document changes, create a new document with the new value and update the project,
        // triggering a rerender.
        if($project !== undefined) {
            const newCode = (event.target as HTMLTextAreaElement).value;
            // Clean up the project before we create a new one.
            $project.cleanup();
            // Make a new one based on the new program
            const newProject = new Project("Play", newCode, () => project.set($project));
            project.set(newProject);
            caret.set(new Caret(newProject, 0));
        }
    }

</script>

<div class="document">
    <div class="document-title">{doc.getName()}</div>
    <div class="document-content">
        {#if view instanceof Structure}
            <VerseView verse={view} evaluator={$project?.getEvaluator()}/>
        {:else if content instanceof Program}
            <div class="wordplay-code"
                tabindex=0
                on:mousedown={(event) => event.currentTarget.focus()}
                on:keydown={(event) => {
                    if($caret) {
                        if(!event.metaKey && !event.ctrlKey) {
                            event.preventDefault();
                            if(event.key === "ArrowLeft") caret.set($caret.left());
                            else if(event.key === "ArrowRight") caret.set($caret.right());
                            else if(event.key === "ArrowUp") caret.set($caret.up());
                            else if(event.key === "ArrowDown") caret.set($caret.down());
                            else if(event.key === "Backspace") {
                                if($project && $caret && typeof $caret.position === "number") {
                                    const newProject = new Project("Play", $project.code.substring(0, $caret.position - 1) + $project.code.substring($caret.position), () => project.set($project));
                                    project.set(newProject);
                                    caret.set(new Caret(newProject, $caret.position - 1));
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
                                if($project && $caret && typeof $caret.position === "number") {
                                    const newProject = new Project("Play", $project.code.substring(0, $caret.position) + char + $project.code.substring($caret.position), () => project.set($project));
                                    project.set(newProject);
                                    caret.set(new Caret(newProject, $caret.position + 1));
                                }
                            }
                        }
                    }
                }}
            >
                <ProgramView program={content} />
            </div>
        {:else if typeof content === "string"}
            <textarea 
                on:input={handleEdit} 
                bind:value={content} 
                readonly={!doc.isEditable()}
                style="width: 100%; height: {Math.max(20, content.split("\n").length)}em;"
                tabIndex=0
            />
        {:else}
            <p>No value</p>
        {/if}
    </div>
</div>

<style>
    .document {
        min-width: 40em;
        display: flex;
        flex-flow: column;
        border: var(--wordplay-border-width) solid var(--wordplay-border-color);
        flex: 1; /* Have each document fill an equal amount of space in the window manager */
        border-radius: var(--wordplay-border-radius);
    }

    .document-title {
        height: auto;
        background: var(--wordplay-chrome);
        padding: var(--wordplay-spacing);
        border-bottom: var(--wordplay-border-width) solid var(--wordplay-border-color);
    }

    .document-content {
        min-height: 10rem;
        background: var(--wordplay-background);
        color: var(--wordplay-foreground);
        box-sizing: border-box;;
    }

    .wordplay-code {
        padding: var(--wordplay-spacing);
        white-space: nowrap;
        overflow: scroll;
    }

    .wordplay-code:focus {
        outline: var(--wordplay-border-width) solid var(--wordplay-highlight);
    }

    textarea[readonly] {
        background: var(--wordplay-chrome);
    }
    textarea {
        width: 100%;
        tab-size : 2;
        white-space: pre;
        overflow-wrap: normal;
    }
</style>