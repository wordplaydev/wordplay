<script lang="ts">

    import Project from '../models/Project';
    import { project } from '../models/stores';
    import type Document from "../models/Document";
    import Value from '../runtime/Value';
    import Text from '../runtime/Text';
    import Structure, { createStructure } from '../runtime/Structure';
    import Sentence from '../native/Sentence';
    import VerseView from './VerseView.svelte';
    import Measurement from '../runtime/Measurement';
    import Verse from '../native/Verse';
    import Group from '../native/Group';
    import TextStructureType from '../native/TextStructureType';
    import List from '../runtime/List';

    export let doc: Document;
    $: content = doc.getContent();

    let view: Structure | undefined;
    $: {
        // If the content is a Verse, just show it as is.
        if(content instanceof Value) {
            if(content.getType() === Verse)
                view = content as Structure;
            else if(content.getType() === Group) {
                view = createStructure(Verse, { group: content });
            }
            else if(content.getType() === Sentence) {
                view = createStructure(Verse, { group: createStructure(Group, { sentences: new List([content]) }) });
            }
            else if(content.getType() === TextStructureType) {
                view = createStructure(Verse, 
                    {
                        group: createStructure(Group, {
                            sentences: new List([createStructure(Sentence, {
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
                view = createStructure(Verse, 
                    {
                        group: createStructure(Group, {
                            sentences: new List([createStructure(Sentence, {
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
    {:else if typeof content === "string"}
        <textarea 
            on:input={handleEdit} 
            class="document-content" 
            bind:value={content} 
            readonly={!doc.isEditable()}
            style="height: {Math.min(20, content.split("\n").length)}em;"
            tabIndex=0
        />
    {:else}
        <p>No value</p>
    {/if}
</div>

<style>
    .document {
        min-width: 20em;
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
        tab-size : 2;
    }
</style>