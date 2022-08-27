<script lang="ts">

    import Project from '../models/Project';
    import { project } from '../models/stores';
    import type Document from "../models/Document";
    import Value from '../runtime/Value';
    import Text from '../runtime/Text';
    import Structure, { createStructure } from '../runtime/Structure';
    import Letters from '../native/Letters';
    import VerseView from './VerseView.svelte';
    import Measurement from '../runtime/Measurement';
    import Verse from '../native/Verse';
    import Group from '../native/Group';
    import List from '../runtime/List';
    import TextType from '../nodes/TextType';
    import StructureType from '../nodes/StructureType';
import ProgramView from '../editor/ProgramView.svelte';
import Program from '../nodes/Program';

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
            else if(contentType instanceof StructureType && contentType.definition === Letters) {
                view = createStructure(evaluator, Verse, { group: createStructure(evaluator, Group, { letters: new List([content]) }) });
            }
            else if(contentType instanceof TextType) {
                view = createStructure(evaluator, Verse, 
                    {
                        group: createStructure(evaluator, Group, {
                            letters: new List([createStructure(evaluator, Letters, {
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
                            letters: new List([createStructure(evaluator, Letters, {
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
            project.set(new Project("Play", newCode, () => project.set($project)));
        }
    }

</script>

<div class="document">
    <div class="document-title">{doc.getName()}</div>
    {#if view instanceof Structure}
        <VerseView verse={view} evaluator={$project?.getEvaluator()}/>
    {:else if content instanceof Program}
        <ProgramView program={content} />
    {:else if typeof content === "string"}
        <textarea 
            on:input={handleEdit} 
            class="document-content" 
            bind:value={content} 
            readonly={!doc.isEditable()}
            style="height: {Math.max(20, content.split("\n").length)}em;"
            tabIndex=0
        />
    {:else}
        <p>No value</p>
    {/if}
</div>

<style>
    .document {
        min-width: 40em;
        display: flex;
        flex-flow: column wrap;
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
        width: auto;
        min-height: 10rem;
        background: var(--wordplay-background);
        padding: var(--wordplay-spacing);
        color: var(--wordplay-foreground);
    }

    textarea[readonly] {
        background: var(--wordplay-chrome);
    }
    textarea {
        tab-size : 2;
        white-space: pre;
        overflow-wrap: normal;
        overflow-x: scroll;
        max-height: 40em;
    }
</style>